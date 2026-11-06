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

            var local = new GameObject("Avatar.local").AddComponent<AvatarSlotController>();
            SetSlot(local, "local");
            local.gameObject.SetActive(false); // 통화 화면은 상대 캐릭터만 크게 보여준다

            var remote = new GameObject("Avatar.remote").AddComponent<AvatarSlotController>();
            SetSlot(remote, "remote");
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

        private static void SetSlot(AvatarSlotController controller, string slot)
        {
            var so = new SerializedObject(controller);
            so.FindProperty("slot").stringValue = slot;
            so.ApplyModifiedPropertiesWithoutUndo();
        }
    }
}
