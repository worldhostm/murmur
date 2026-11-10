package com.murmur.unity

import android.util.Base64
import android.util.Log

/**
 * Unity 쪽으로 메시지를 보내는 단일 출구. Unity as a Library 통합 전에는 로그만 남긴다.
 *
 * UaaL 통합 후: unityLibrary 모듈을 settings.gradle 에 include 하고 MainApplication 에서
 *   UnityPlayerProxy.sender = { go, method, msg -> com.unity3d.player.UnityPlayer.UnitySendMessage(go, method, msg) }
 * 로 연결한다. 게임 오브젝트 "MurmurBridge" 와 메서드 이름은 apps/avatar-unity/Assets/Murmur/Scripts/MurmurBridge.cs 와 맞춘다.
 */
object UnityPlayerProxy {
  const val GAME_OBJECT = "MurmurBridge"
  private const val TAG = "MurmurUnity"

  @Volatile var sender: ((gameObject: String, method: String, message: String) -> Unit)? = null
  /** UnityPlayer 뷰를 만드는 팩토리. src/unity 의 UnityHost 가 설정한다. */
  @Volatile var viewFactory: ((activity: android.app.Activity) -> android.widget.FrameLayout)? = null
  @Volatile var lifecycle: Lifecycle? = null

  interface Lifecycle { fun pause(); fun resume(); fun destroy() }

  val isAttached: Boolean get() = sender != null

  /** Unity 쪽 MurmurBridge.Start() 가 onUnityReady() 를 부르기 전까지 LoadAvatar/SetTheme/SetMotion 은 큐에 담는다 (프레임은 버린다). */
  @Volatile private var ready = false
  private val pending = ArrayDeque<Pair<String, String>>()
  private const val PENDING_MAX = 32

  @JvmStatic
  fun onUnityReady() {
    val flush: List<Pair<String, String>>
    synchronized(pending) {
      ready = true
      flush = pending.toList()
      pending.clear()
    }
    Log.i(TAG, "Unity ready, flushing ${flush.size} queued messages")
    for ((method, message) in flush) sender?.invoke(GAME_OBJECT, method, message)
  }

  fun resetReady() {
    synchronized(pending) { ready = false; pending.clear() }
  }

  /** unityLibrary 가 포함된 빌드면 UnityHost.install() 을 리플렉션으로 부른다. 없으면 조용히 넘어간다. */
  fun attachIfAvailable() {
    try {
      val cls = Class.forName("com.murmur.unity.UnityHost")
      cls.getMethod("install").invoke(null)
      Log.i(TAG, "Unity library attached")
    } catch (_: ClassNotFoundException) {
      Log.i(TAG, "Unity library not bundled (export with pnpm unity:export:android)")
    } catch (e: Throwable) {
      Log.w(TAG, "Unity attach failed", e)
    }
  }

  fun pushFrame(slot: String, frame: ByteArray) {
    send("OnFaceFrame", slot + "|" + Base64.encodeToString(frame, Base64.NO_WRAP))
  }

  fun loadAvatar(slot: String, assetKey: String) = send("LoadAvatar", "$slot|$assetKey")

  fun setTheme(theme: String) = send("SetTheme", theme)

  fun setMotion(motion: String) = send("SetMotion", motion)

  private fun send(method: String, message: String) {
    val s = sender
    if (s == null) {
      if (method != "OnFaceFrame") Log.d(TAG, "(unity not attached) $method ${message.take(64)}")
      return
    }
    if (!ready) {
      if (method == "OnFaceFrame") return // 준비 전 프레임은 의미가 없다
      synchronized(pending) {
        if (!ready) {
          if (pending.size >= PENDING_MAX) pending.removeFirst()
          pending.addLast(method to message)
          return
        }
      }
    }
    s(GAME_OBJECT, method, message)
  }
}
