package com.murmur.unity

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** JS 의 UnityAvatarRenderer 어댑터가 호출하는 네이티브 모듈. 실제 전달은 UnityPlayerProxy 가 한다. */
class UnityBridgeModule(ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  companion object { const val NAME = "MurmurUnity" }

  override fun getName(): String = NAME

  @ReactMethod
  fun loadAvatar(slot: String, assetKey: String, promise: Promise) {
    UnityPlayerProxy.loadAvatar(slot, assetKey)
    promise.resolve(null)
  }

  @ReactMethod
  fun pushFrame(slot: String, frameBase64: String) {
    UnityPlayerProxy.pushFrame(slot, Base64.decode(frameBase64, Base64.NO_WRAP))
  }

  @ReactMethod
  fun setTheme(theme: String) {
    UnityPlayerProxy.setTheme(theme)
  }

  /** OS "동작 줄이기": "reduced" | "full". */
  @ReactMethod
  fun setMotion(motion: String) {
    UnityPlayerProxy.setMotion(motion)
  }

  @ReactMethod
  fun dispose(promise: Promise) {
    promise.resolve(null)
  }
}
