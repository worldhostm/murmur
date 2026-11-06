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

  fun pushFrame(slot: String, frame: ByteArray) {
    send("OnFaceFrame", slot + "|" + Base64.encodeToString(frame, Base64.NO_WRAP))
  }

  fun loadAvatar(slot: String, assetKey: String) = send("LoadAvatar", "$slot|$assetKey")

  fun setTheme(theme: String) = send("SetTheme", theme)

  private fun send(method: String, message: String) {
    val s = sender
    if (s == null) {
      if (method != "OnFaceFrame") Log.d(TAG, "(unity not attached) $method ${message.take(64)}")
      return
    }
    s(GAME_OBJECT, method, message)
  }
}
