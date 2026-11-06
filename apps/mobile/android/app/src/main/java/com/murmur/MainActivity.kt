package com.murmur

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.murmur.unity.UnityPlayerProxy

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Murmur"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Unity as a Library 생명주기 전달 (라이브러리가 없으면 no-op)
  override fun onPause() { super.onPause(); UnityPlayerProxy.lifecycle?.pause() }
  override fun onResume() { super.onResume(); UnityPlayerProxy.lifecycle?.resume() }
  override fun onDestroy() { UnityPlayerProxy.lifecycle?.destroy(); super.onDestroy() }
}
