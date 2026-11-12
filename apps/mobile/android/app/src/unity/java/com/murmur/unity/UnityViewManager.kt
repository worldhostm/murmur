package com.murmur.unity

import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

/** 통화 화면의 avatar-renderer 자리에 UnityPlayer 뷰를 올린다. JS: <UnityView /> */
class UnityViewManager : SimpleViewManager<FrameLayout>() {
  companion object { const val NAME = "MurmurUnityView" }

  override fun getName(): String = NAME

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    val container = FrameLayout(reactContext)
    val activity = reactContext.currentActivity
    val factory = UnityPlayerProxy.viewFactory
    if (activity != null && factory != null) {
      container.addView(factory(activity), FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
      // 화면에서 빠져 있는 동안 pause 했던 플레이어를 다시 돌린다 (iOS 의 MurmurUnityViewManager 와 같은 수명).
      UnityPlayerProxy.lifecycle?.resume()
    }
    return container
  }

  override fun onDropViewInstance(view: FrameLayout) {
    view.removeAllViews()
    // 뷰가 화면에서 빠지면 렌더를 멈춘다. 멈추지 않으면 다음 화면에서 다시 붙였을 때 서피스가 마지막 프레임(이전 캐릭터)을
    // 그대로 보여 주고, 그 뒤의 LoadAvatar 결과가 레이아웃이 바뀔 때까지 화면에 반영되지 않았다 (2026-11-12 에뮬레이터).
    UnityPlayerProxy.lifecycle?.pause()
    super.onDropViewInstance(view)
  }
}
