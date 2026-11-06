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
    }
    return container
  }

  override fun onDropViewInstance(view: FrameLayout) {
    view.removeAllViews()
    super.onDropViewInstance(view)
  }
}
