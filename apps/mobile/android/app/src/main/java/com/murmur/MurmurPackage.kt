package com.murmur

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.murmur.unity.UnityPlayerProxy
import com.murmur.facetracker.FaceTrackerModule
import com.murmur.unity.UnityBridgeModule

/** Murmur 네이티브 모듈 묶음: 트래킹(MediaPipe)과 Unity 브리지. */
class MurmurPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(FaceTrackerModule(reactContext), UnityBridgeModule(reactContext), DeviceSupportModule(reactContext))

  @Suppress("UNCHECKED_CAST")
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    if (!UnityPlayerProxy.isAttached) return emptyList()
    // UnityViewManager 는 src/unity 소스셋에만 있다. 리플렉션으로 만들어 라이브러리 없는 빌드도 컴파일되게 한다.
    return try {
      listOf(Class.forName("com.murmur.unity.UnityViewManager").getDeclaredConstructor().newInstance() as ViewManager<*, *>)
    } catch (_: Throwable) {
      emptyList()
    }
  }
}
