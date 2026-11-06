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

  private fun createLandmarker(): FaceLandmarker {
    val base = BaseOptions.builder().setModelAssetPath(MODEL_ASSET).setDelegate(Delegate.GPU).build()
    val options = FaceLandmarker.FaceLandmarkerOptions.builder()
      .setBaseOptions(base)
      .setRunningMode(RunningMode.LIVE_STREAM)
      .setNumFaces(1)
      .setOutputFaceBlendshapes(true)
      .setOutputFacialTransformationMatrixes(true)
      .setResultListener { result, _ -> onResult(result) }
      .setErrorListener { e -> Log.w(TAG, "landmarker error", e) }
      .build()
    return FaceLandmarker.createFromOptions(ctx, options)
  }

  private fun analyze(image: ImageProxy) {
    try {
      val lm = landmarker ?: return
      // 회전·좌우 반전 후 MediaPipe 로. Bitmap 은 이 메서드 안에서만 산다.
      val bitmap = image.toBitmap()
      val m = Matrix().apply {
        postRotate(image.imageInfo.rotationDegrees.toFloat())
        postScale(-1f, 1f, bitmap.width / 2f, bitmap.height / 2f)
      }
      val oriented = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, m, true)
      val mpImage = BitmapImageBuilder(oriented).build()
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
