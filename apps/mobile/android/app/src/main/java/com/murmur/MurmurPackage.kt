package com.murmur

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.murmur.facetracker.FaceTrackerModule
import com.murmur.unity.UnityBridgeModule

/** Murmur 네이티브 모듈 묶음: 트래킹(MediaPipe)과 Unity 브리지. */
class MurmurPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(FaceTrackerModule(reactContext), UnityBridgeModule(reactContext), DeviceSupportModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
