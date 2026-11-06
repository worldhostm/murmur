package com.murmur.facetracker

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.SystemClock
import android.util.Base64
import android.util.Log
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import app.murmur.faceprotocol.BlendShape
import app.murmur.faceprotocol.FaceProtocol
import app.murmur.faceprotocol.TrackingState
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult
import com.murmur.unity.UnityPlayerProxy
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Android 트래킹 어댑터: 전면 카메라(CameraX) → MediaPipe Face Landmarker → face-protocol 프레임.
 *
 * 규칙 (CLAUDE.md 금지 사항)
 *  - 카메라 픽셀은 이 클래스 밖으로 나가지 않는다. JS와 Unity에는 144바이트 프레임만 전달한다.
 *  - 저장·전송 코드를 추가하지 않는다.
 *
 * 이벤트
 *  - "murmur.faceFrame": { frame: base64, slot: "local" } 최대 30Hz
 *  - "murmur.trackingState": { state: "tracked" | "limited" | "lost" } 상태가 바뀔 때
 * directToUnity 가 켜지면 프레임은 JS를 거치지 않고 UnityPlayerProxy 로 바로 간다.
 */
class FaceTrackerModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  companion object {
    const val NAME = "MurmurFaceTracker"
    const val EVENT_FRAME = "murmur.faceFrame"
    const val EVENT_STATE = "murmur.trackingState"
    private const val TAG = "MurmurFaceTracker"
    private const val MODEL_ASSET = "face_landmarker.task"
    private const val MIN_FRAME_INTERVAL_MS = 1000L / 30
    private const val LOST_AFTER_MS = 500L
    /**
     * GPU 델리게이트가 생성은 되지만 추론마다 실패하는 기기(일부 GL 드라이버, 에뮬레이터)를 잡는다.
     * MediaPipe tasks 0.10.14 는 options 의 errorListener 를 TaskRunner 에 넘기지 않아 "Mediapipe error" 를 로그만 하므로,
     * 결과 콜백 없이 보낸 프레임 수로 판단한다 (LIVE_STREAM 은 얼굴이 없어도 빈 결과를 돌려준다).
     */
    private const val GPU_SENDS_WITHOUT_RESULT_BEFORE_FALLBACK = 30
  }

  override fun getName(): String = NAME

  private var landmarker: FaceLandmarker? = null
  private var cameraProvider: ProcessCameraProvider? = null
  private var analysisExecutor: ExecutorService? = null
  private val encoder = FaceFrameEncoder()
  private val blendShapes = FloatArray(FaceProtocol.BLEND_SHAPE_COUNT)
  private val indexByMediaPipeName: Map<String, Int> = BlendShape.values().associate { it.mediaPipeName to it.ordinal }

  @Volatile private var directToUnity = false
  @Volatile private var startedAtMs = 0L
  @Volatile private var lastEmitMs = 0L
  @Volatile private var lastFaceMs = 0L
  @Volatile private var lastState: TrackingState? = null
  @Volatile private var delegateInUse: Delegate = Delegate.GPU
  @Volatile private var sentSinceResult = 0

  @ReactMethod
  fun isSupported(promise: Promise) {
    val hasFront = ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT)
    promise.resolve(hasFront)
  }

  @ReactMethod
  fun setDirectToUnity(enabled: Boolean) {
    directToUnity = enabled
  }

  @ReactMethod
  fun start(promise: Promise) {
    val activity = currentActivity
    if (activity == null || activity !is LifecycleOwner) {
      promise.reject("E_NO_ACTIVITY", "activity is not available")
      return
    }
    if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      // 권한 요청 UI는 JS(PermissionsAndroid)가 담당한다. 여기서는 거부만 알린다.
      promise.reject("E_CAMERA_DENIED", "camera permission not granted")
      return
    }
    if (landmarker != null) {
      promise.resolve(null)
      return
    }
    try {
      landmarker = createLandmarker()
    } catch (e: Exception) {
      Log.e(TAG, "landmarker init failed", e)
      promise.reject("E_TRACKER_INIT", e)
      return
    }
    startedAtMs = SystemClock.elapsedRealtime()
    lastFaceMs = 0L
    lastState = null

    val future = ProcessCameraProvider.getInstance(ctx)
    future.addListener({
      try {
        val provider = future.get()
        cameraProvider = provider
        val executor = Executors.newSingleThreadExecutor().also { analysisExecutor = it }
        val analysis = ImageAnalysis.Builder()
          .setTargetResolution(Size(640, 480))
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .build()
        analysis.setAnalyzer(executor) { image -> analyze(image) }
        provider.unbindAll()
        activity.runOnUiThread {
          try {
            provider.bindToLifecycle(activity, CameraSelector.DEFAULT_FRONT_CAMERA, analysis)
            promise.resolve(null)
          } catch (e: Exception) {
            Log.e(TAG, "camera bind failed", e)
            promise.reject("E_CAMERA_BIND", e)
          }
        }
      } catch (e: Exception) {
        Log.e(TAG, "camera provider failed", e)
        promise.reject("E_CAMERA_PROVIDER", e)
      }
    }, ContextCompat.getMainExecutor(ctx))
  }

  @ReactMethod
  fun stop(promise: Promise) {
    val activity = currentActivity
    val release = Runnable {
      cameraProvider?.unbindAll()
      cameraProvider = null
      analysisExecutor?.shutdown()
      analysisExecutor = null
      landmarker?.close()
      landmarker = null
      promise.resolve(null)
    }
    if (activity != null) activity.runOnUiThread(release) else release.run()
  }

  // RN 이벤트 에미터 규약상 필요한 빈 메서드.
  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}
  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {}

  /** GPU 델리게이트를 먼저 시도하고, 지원하지 않는 기기(일부 2020년 보급형)에서는 CPU 로 폴백한다. */
  private fun createLandmarker(): FaceLandmarker {
    sentSinceResult = 0
    return try {
      createLandmarker(Delegate.GPU).also { delegateInUse = Delegate.GPU; Log.i(TAG, "landmarker delegate=GPU") }
    } catch (e: Exception) {
      Log.w(TAG, "GPU delegate unavailable, falling back to CPU: ${e.message}")
      createLandmarker(Delegate.CPU).also { delegateInUse = Delegate.CPU; Log.i(TAG, "landmarker delegate=CPU") }
    }
  }

  /** 분석 스레드에서 호출. GPU 랜드마커가 결과를 돌려주지 않으면 CPU 로 교체한다. */
  private fun fallbackToCpuIfStalled() {
    if (delegateInUse != Delegate.GPU || sentSinceResult < GPU_SENDS_WITHOUT_RESULT_BEFORE_FALLBACK) return
    Log.w(TAG, "GPU delegate returned no result for $sentSinceResult frames, falling back to CPU")
    // 깨진 그래프는 close() 자체가 예외를 던진다. 그래도 CPU 랜드마커는 만들어야 한다.
    try { landmarker?.close() } catch (e: Exception) { Log.w(TAG, "closing GPU landmarker failed: ${e.message?.lineSequence()?.firstOrNull()}") }
    landmarker = null
    try {
      landmarker = createLandmarker(Delegate.CPU)
      delegateInUse = Delegate.CPU
      sentSinceResult = 0
      Log.i(TAG, "landmarker delegate=CPU")
    } catch (ex: Exception) {
      Log.e(TAG, "CPU fallback failed", ex)
      landmarker = null
    }
  }

  private fun createLandmarker(delegate: Delegate): FaceLandmarker {
    val base = BaseOptions.builder().setModelAssetPath(MODEL_ASSET).setDelegate(delegate).build()
    val options = FaceLandmarker.FaceLandmarkerOptions.builder()
      .setBaseOptions(base)
      .setRunningMode(RunningMode.LIVE_STREAM)
      .setNumFaces(1)
      .setOutputFaceBlendshapes(true)
      .setOutputFacialTransformationMatrixes(true)
      .setResultListener { result, _ -> sentSinceResult = 0; onResult(result) }
      .setErrorListener { e -> Log.w(TAG, "landmarker error", e) }
      .build()
    return FaceLandmarker.createFromOptions(ctx, options)
  }

  private fun analyze(image: ImageProxy) {
    try {
      fallbackToCpuIfStalled()
      val lm = landmarker ?: return
      // 회전·좌우 반전 후 MediaPipe 로. Bitmap 은 이 메서드 안에서만 산다.
      val bitmap = image.toBitmap()
      val m = Matrix().apply {
        postRotate(image.imageInfo.rotationDegrees.toFloat())
        postScale(-1f, 1f, bitmap.width / 2f, bitmap.height / 2f)
      }
      val oriented = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, m, true)
      val mpImage = BitmapImageBuilder(oriented).build()
      sentSinceResult++
      lm.detectAsync(mpImage, SystemClock.uptimeMillis())
    } catch (e: Exception) {
      Log.w(TAG, "analyze failed", e)
    } finally {
      image.close()
    }
  }

  private fun onResult(result: FaceLandmarkerResult) {
    val now = SystemClock.elapsedRealtime()
    val faces = result.faceBlendshapes()
    val hasFace = faces.isPresent && faces.get().isNotEmpty()
    if (hasFace) lastFaceMs = now

    val state = when {
      hasFace -> TrackingState.TRACKED
      now - lastFaceMs > LOST_AFTER_MS -> TrackingState.LOST
      else -> TrackingState.LIMITED
    }
    if (state != lastState) {
      lastState = state
      emitState(state)
    }
    if (now - lastEmitMs < MIN_FRAME_INTERVAL_MS) return
    lastEmitMs = now

    java.util.Arrays.fill(blendShapes, 0f)
    var pose = HeadPose.IDENTITY
    if (hasFace) {
      for (category in faces.get()[0]) {
        val idx = indexByMediaPipeName[category.categoryName()] ?: continue // "_neutral" 등은 건너뜀
        blendShapes[idx] = category.score()
      }
      val matrices = result.facialTransformationMatrixes()
      if (matrices.isPresent && matrices.get().isNotEmpty()) {
        pose = HeadPose.fromColumnMajor(matrices.get()[0])
      }
    }
    val bytes = encoder.encode(
      (now - startedAtMs).toDouble(), state, blendShapes,
      pose.qx, pose.qy, pose.qz, pose.qw, pose.px, pose.py, pose.pz,
    )
    if (directToUnity) {
      UnityPlayerProxy.pushFrame("local", bytes)
    } else {
      val params = Arguments.createMap().apply {
        putString("frame", Base64.encodeToString(bytes, Base64.NO_WRAP))
        putString("slot", "local")
      }
      emit(EVENT_FRAME, params)
    }
  }

  private fun emitState(state: TrackingState) {
    val params = Arguments.createMap().apply { putString("state", state.name.lowercase()) }
    emit(EVENT_STATE, params)
  }

  private fun emit(event: String, params: com.facebook.react.bridge.WritableMap) {
    if (!ctx.hasActiveReactInstance()) return
    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, params)
  }
}
