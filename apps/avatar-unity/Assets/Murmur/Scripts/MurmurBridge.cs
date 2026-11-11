using System;
using Murmur.Design;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 네이티브(RN 브리지)에서 UnitySendMessage 로 호출하는 단일 진입점.
    /// 게임 오브젝트 이름은 반드시 "MurmurBridge". 메서드 이름과 메시지 형식은
    /// apps/mobile 의 UnityPlayerProxy.kt / MurmurUnityBridge.swift 와 맞춘다.
    ///   OnFaceFrame("slot|base64")   LoadAvatar("slot|assetKey")   SetTheme("light"|"dark")   SetMotion("full"|"reduced")
    /// </summary>
    public sealed class MurmurBridge : MonoBehaviour
    {
        public const string GameObjectName = "MurmurBridge";

        [SerializeField] private AvatarSlotController localSlot;
        [SerializeField] private AvatarSlotController remoteSlot;
        [SerializeField] private ThemeBackground background;

        public ThemeId Theme { get; private set; } = ThemeId.Dark;

        private void Awake()
        {
            if (name != GameObjectName) Debug.LogWarning($"MurmurBridge 는 '{GameObjectName}' 이름의 오브젝트에 있어야 UnitySendMessage 가 닿는다 (현재 '{name}').");
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            NotifyNativeReady();
        }

        /// <summary>네이티브 프록시에 "메시지 받을 준비 됨"을 알린다. Android: UnityPlayerProxy.onUnityReady(). iOS: MurmurNotifyReady().</summary>
#if UNITY_IOS && !UNITY_EDITOR
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void MurmurNotifyReady();
#endif
        private static void NotifyNativeReady()
        {
#if UNITY_IOS && !UNITY_EDITOR
            MurmurNotifyReady();
#elif UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (var cls = new AndroidJavaClass("com.murmur.unity.UnityPlayerProxy"))
                {
                    cls.CallStatic("onUnityReady");
                }
                Debug.Log("[MurmurBridge] native ready notified (android)");
            }
            catch (Exception e)
            {
                Debug.LogWarning("UnityPlayerProxy.onUnityReady 호출 실패: " + e.Message);
            }
#endif
        }

        public void OnFaceFrame(string message)
        {
            if (!Split(message, out var slot, out var payload)) return;
            byte[] bytes;
            try { bytes = Convert.FromBase64String(payload); }
            catch (FormatException) { return; }
            FaceFrameReceiver.Instance.Push(slot, bytes, Time.realtimeSinceStartupAsDouble);
        }

        public void LoadAvatar(string message)
        {
            if (!Split(message, out var slot, out var assetKey)) return;
            var controller = slot == "local" ? localSlot : remoteSlot;
            if (controller == null) { Debug.LogWarning($"slot '{slot}' 에 연결된 AvatarSlotController 가 없다"); return; }
            controller.Load(assetKey);
        }

        public void SetTheme(string theme)
        {
            Theme = theme == "light" ? ThemeId.Light : ThemeId.Dark;
            if (background != null) background.Apply(Theme);
        }

        /// <summary>OS "동작 줄이기". 아이들 모션·배경 빛이 멈춘다.</summary>
        public void SetMotion(string motion)
        {
            MotionSettings.Set(MotionSettings.Parse(motion));
        }

        private static bool Split(string message, out string head, out string tail)
        {
            var i = message == null ? -1 : message.IndexOf('|');
            if (i <= 0) { head = null; tail = null; return false; }
            head = message.Substring(0, i);
            tail = message.Substring(i + 1);
            return true;
        }
    }
}
