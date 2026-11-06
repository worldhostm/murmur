using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Murmur.Editor
{
    /// <summary>
    /// 통화 씬을 코드로 만든다. 메뉴 Murmur/Create Call Scene 또는
    /// Unity -batchmode -executeMethod Murmur.Editor.SceneSetup.CreateCallScene
    /// </summary>
    public static class SceneSetup
    {
        public const string ScenePath = "Assets/Murmur/Scenes/Call.unity";

        [MenuItem("Murmur/Create Call Scene")]
        public static void CreateCallScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            cam.transform.position = new Vector3(0f, 1.4f, 0.8f);
            cam.transform.LookAt(new Vector3(0f, 1.4f, 0f));
            var background = camGo.AddComponent<ThemeBackground>();

            var light = new GameObject("Key Light").AddComponent<Light>();
            light.type = LightType.Directional;
            light.transform.rotation = Quaternion.Euler(30f, -20f, 0f);

            var fill = new GameObject("Fill Light").AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.intensity = 0.4f;
            fill.transform.rotation = Quaternion.Euler(10f, 160f, 0f);

            // 프리미티브 마스코트를 자동 로드한다 (VRM 로더가 붙기 전까지의 PoC 아바타).
            var local = new GameObject("Avatar.local").AddComponent<AvatarSlotController>();
            local.gameObject.AddComponent<PrimitiveAvatarLoader>();
            SetSlot(local, "local", "builtin/primitive");
            local.gameObject.SetActive(false); // 통화 화면은 상대 캐릭터만 크게 보여준다

            var remote = new GameObject("Avatar.remote").AddComponent<AvatarSlotController>();
            remote.gameObject.AddComponent<PrimitiveAvatarLoader>();
            SetSlot(remote, "remote", "builtin/primitive");
            remote.transform.position = Vector3.zero; // 머리는 로더가 y=1.4 에 둔다. 카메라 (0,1.4,0.8) 이 정면을 본다
            remote.gameObject.AddComponent<FrameTimingProbe>();

            var bridgeGo = new GameObject(MurmurBridge.GameObjectName);
            var bridge = bridgeGo.AddComponent<MurmurBridge>();
            var so = new SerializedObject(bridge);
            so.FindProperty("localSlot").objectReferenceValue = local;
            so.FindProperty("remoteSlot").objectReferenceValue = remote;
            so.FindProperty("background").objectReferenceValue = background;
            so.ApplyModifiedPropertiesWithoutUndo();

            System.IO.Directory.CreateDirectory("Assets/Murmur/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"saved {ScenePath}");
        }

        private static void SetSlot(AvatarSlotController controller, string slot, string autoLoadAssetKey)
        {
            var so = new SerializedObject(controller);
            so.FindProperty("slot").stringValue = slot;
            so.FindProperty("autoLoadAssetKey").stringValue = autoLoadAssetKey;
            so.ApplyModifiedPropertiesWithoutUndo();
        }
    }
}
