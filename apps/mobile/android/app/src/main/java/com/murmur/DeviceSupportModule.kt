package com.murmur

import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 지원 기기 판정 정보 (docs/specs/device-support.md).
 * "2020년 이후 출시" 는 기기가 처음 출하된 Android 버전(ro.product.first_api_level)으로 판정한다.
 * Google 의 GMS 요건상 2020년 1월 31일 이후 출시 기기는 Android 10(API 29) 이상으로 출하되어야 했다.
 * 판정 규칙 자체는 JS(evaluateAndroidSupport)에 있고, 여기서는 사실만 모아 준다.
 */
class DeviceSupportModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  companion object { const val NAME = "MurmurDeviceSupport" }

  override fun getName(): String = NAME

  @ReactMethod
  fun getInfo(promise: Promise) {
    val map = Arguments.createMap().apply {
      putString("platform", "android")
      putString("manufacturer", Build.MANUFACTURER ?: "")
      putString("model", Build.MODEL ?: "")
      putString("device", Build.DEVICE ?: "")
      putInt("sdkInt", Build.VERSION.SDK_INT)
      putInt("firstApiLevel", firstApiLevel())
      putBoolean("frontCamera", ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT))
      putBoolean("arm64", Build.SUPPORTED_64_BIT_ABIS.any { it.startsWith("arm64") })
      putInt("ramMb", ramMb())
    }
    promise.resolve(map)
  }

  /** 출하 시 API 레벨. 모르면 0. */
  private fun firstApiLevel(): Int {
    for (key in listOf("ro.product.first_api_level", "ro.board.first_api_level", "ro.board.api_level")) {
      val v = systemProperty(key)
      val n = v.toIntOrNull()
      if (n != null && n > 0) return n
    }
    return 0
  }

  private fun systemProperty(key: String): String = try {
    val cls = Class.forName("android.os.SystemProperties")
    val get = cls.getMethod("get", String::class.java, String::class.java)
    (get.invoke(null, key, "") as? String) ?: ""
  } catch (_: Throwable) {
    ""
  }

  private fun ramMb(): Int = try {
    val am = ctx.getSystemService(android.content.Context.ACTIVITY_SERVICE) as android.app.ActivityManager
    val info = android.app.ActivityManager.MemoryInfo()
    am.getMemoryInfo(info)
    (info.totalMem / (1024L * 1024L)).toInt()
  } catch (_: Throwable) {
    0
  }
}
