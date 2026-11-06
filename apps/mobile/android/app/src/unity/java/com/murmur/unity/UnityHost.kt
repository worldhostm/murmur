package com.murmur.unity

import android.app.Activity
import android.view.ViewGroup
import android.widget.FrameLayout
import com.unity3d.player.UnityPlayer
import com.unity3d.player.UnityPlayerForActivityOrService

/**
 * Unity as a Library 연결 지점 (Unity 6: UnityPlayerForActivityOrService).
 * 이 소스셋(src/unity)은 unityLibrary 가 내보내져 있을 때만 컴파일된다.
 * MainApplication 이 리플렉션으로 install() 을 찾아 부르므로, 라이브러리가 없어도 앱은 빌드·실행된다.
 */
object UnityHost {
  @Volatile private var player: UnityPlayerForActivityOrService? = null

  @JvmStatic
  fun install() {
    UnityPlayerProxy.sender = { go, method, msg -> UnityPlayer.UnitySendMessage(go, method, msg) }
    UnityPlayerProxy.viewFactory = { activity -> attach(activity) }
    UnityPlayerProxy.lifecycle = object : UnityPlayerProxy.Lifecycle {
      override fun pause() { player?.pause() }
      override fun resume() { player?.resume() }
      override fun destroy() { player?.destroy(); player = null; UnityPlayerProxy.resetReady() }
    }
  }

  private fun attach(activity: Activity): FrameLayout {
    // 액티비티가 이미 resumed 상태에서 늦게 만들므로 resume() 을 직접 불러야 Unity 메인 루프(Start/Update)가 돈다.
    val p = player ?: UnityPlayerForActivityOrService(activity).also { player = it; it.resume() }
    val view = p.frameLayout
    // 이미 다른 부모에 붙어 있으면 떼어 낸다 (화면 재진입).
    (view.parent as? ViewGroup)?.removeView(view)
    view.requestFocus()
    p.windowFocusChanged(true)
    return view
  }
}
