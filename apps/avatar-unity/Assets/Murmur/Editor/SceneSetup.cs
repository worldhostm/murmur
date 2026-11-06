using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
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
        /// <summary>프리미티브 마스코트가 쓰는 머티리얼. Resources 에 있어야 플레이어 빌드에 URP Lit 셰이더가 포함된다 (Shader.Find 만으로는 스트리핑되어 마젠타로 나온다).</summary>
        public const string PrimitiveMaterialPath = "Assets/Murmur/Resources/" + PrimitiveAvatarLoader.MaterialResource + ".mat";

        public const string PipelineAssetPath = "Assets/Murmur/Settings/MurmurURP.asset";
        public const string RendererDataPath = "Assets/Murmur/Settings/MurmurURPRenderer.asset";

        /// <summary>
        /// URP 파이프라인 에셋을 만들고 Graphics/Quality 설정에 지정한다. 지정되지 않으면 빌트인 파이프라인으로 돌아
        /// URP Lit 머티리얼이 전부 마젠타로 나온다 (에뮬레이터 점검에서 확인). 2020년 보급형 기준으로 MSAA·HDR 은 끈다.
        /// </summary>
        [MenuItem("Murmur/Ensure URP Pipeline")]
        public static void EnsureRenderPipeline()
        {
            var asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);
            if (asset == null)
            {
                System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(PipelineAssetPath));
                var renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(renderer, RendererDataPath);
                asset = UniversalRenderPipelineAsset.Create(renderer);
                asset.msaaSampleCount = 1;
                asset.supportsHDR = false;
                asset.shadowDistance = 5f;
                AssetDatabase.CreateAsset(asset, PipelineAssetPath);
                Debug.Log($"created {PipelineAssetPath}");
            }
            var changed = false;
            if (GraphicsSettings.defaultRenderPipeline != asset) { GraphicsSettings.defaultRenderPipeline = asset; changed = true; }
            var current = QualitySettings.GetQualityLevel();
            for (var i = 0; i < QualitySettings.names.Length; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                if (QualitySettings.renderPipeline != asset) { QualitySettings.renderPipeline = asset; changed = true; }
            }
            QualitySettings.SetQualityLevel(current, false);
            AssetDatabase.SaveAssets();
            if (changed) Debug.Log("URP pipeline assigned to Graphics/Quality settings");
        }

        [MenuItem("Murmur/Create Primitive Material")]
        public static void EnsurePrimitiveMaterial()
        {
            if (AssetDatabase.LoadAssetAtPath<Material>(PrimitiveMaterialPath) != null) return;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            if (shader == null) throw new System.InvalidOperationException("URP Lit 셰이더를 찾지 못했다");
            System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(PrimitiveMaterialPath));
            var mat = new Material(shader) { color = Color.white };
            AssetDatabase.CreateAsset(mat, PrimitiveMaterialPath);
            AssetDatabase.SaveAssets();
            Debug.Log($"created {PrimitiveMaterialPath}");
        }

        [MenuItem("Murmur/Create Call Scene")]
        public static void CreateCallScene()
        {
            EnsureRenderPipeline();
            EnsurePrimitiveMaterial();
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
