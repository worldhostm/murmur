using Murmur.Design;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// VRM 에셋 없이 쓰는 프리미티브 마스코트 로더 (에셋 키 "builtin/primitive").
    /// 구(머리)·눈·눈썹·입을 만들고 PrimitiveExpressionDriver + HeadPoseDriver 를 붙인다. 실기기 PoC 에서 표정 수치가 보이게 하는 용도.
    /// </summary>
    public sealed class PrimitiveAvatarLoader : MonoBehaviour, IAvatarLoader
    {
        public const string RootName = "PrimitiveAvatar";
        /// <summary>Resources.Load 경로. 에셋은 Editor/SceneSetup.EnsurePrimitiveMaterial 이 만든다.</summary>
        public const string MaterialResource = "Murmur/PrimitiveLit";

        public const string AssetKey = "builtin/primitive";

        public bool CanLoad(string assetKey) => assetKey == AssetKey;

        public void Load(string assetKey, AvatarSlotController slot)
        {
            foreach (var name in new[] { RootName, SpriteSheetAvatarLoader.RootName })
            {
                var old = slot.transform.Find(name);
                if (old != null) { if (Application.isPlaying) Destroy(old.gameObject); else DestroyImmediate(old.gameObject); }
            }
            var root = Build(slot.transform);
            slot.RefreshConsumers();
            LogLayout(root);
        }

        /// <summary>PoC 진단용: 카메라와 머리·눈의 월드 배치를 한 번 남긴다 (에뮬레이터 스크린샷과 대조).</summary>
        private static void LogLayout(GameObject root)
        {
            var cam = Camera.main;
            var driver = root.GetComponent<PrimitiveExpressionDriver>();
            if (cam == null || driver == null) return;
            Debug.Log($"[PrimitiveAvatar] cam pos={cam.transform.position} fwd={cam.transform.forward} fov={cam.fieldOfView} aspect={cam.aspect:F3} screen={Screen.width}x{Screen.height} " +
                      $"head={driver.Head.position} headMesh scale={driver.HeadMesh.lossyScale} bounds={driver.HeadMesh.GetComponent<MeshFilter>().sharedMesh.bounds.extents} eyeL={driver.EyeLeft.position} eyeL scale={driver.EyeLeft.lossyScale} mouth={driver.Mouth.position}");
        }

        /// <summary>parent 아래에 마스코트 계층을 만든다. 테스트에서 씬 없이 호출할 수 있다.</summary>
        public static GameObject Build(Transform parent)
        {
            // 플레이어 빌드에는 머티리얼 에셋이 참조하는 셰이더(변형)만 들어간다. Shader.Find 는 에디터·테스트용 폴백.
            var template = Resources.Load<Material>(MaterialResource);
            var shader = template != null ? null : (Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
            if (template == null) Debug.LogWarning($"Resources/{MaterialResource} 가 없어 Shader.Find 로 대체한다 (빌드에서는 마젠타로 보일 수 있다)");
            Material Mat(Color32 c)
            {
                var m = template != null ? new Material(template) : shader != null ? new Material(shader) : null;
                if (m != null) m.color = c;
                return m;
            }

            var root = new GameObject(RootName);
            root.transform.SetParent(parent, false);

            // Head 는 스케일 없는 피벗(회전·위치). 구 메시만 HeadScale 로 줄인다. 눈·입·눈썹은 피벗의 자식이라
            // 아래 상수들이 월드 단위(머리 반지름 0.15) 그대로 적용된다. 구의 자식으로 두면 0.3 배로 줄어 구 안에 숨는다.
            var head = new GameObject("Head").transform;
            head.SetParent(root.transform, false);
            head.localPosition = new Vector3(0f, 1.4f, 0f);
            var headMesh = Primitive(PrimitiveType.Sphere, "HeadMesh", head, Vector3.zero, Vector3.one * PrimitiveExpressionDriver.HeadScale, Mat(Tokens.Light.Lavender));

            var eyeL = Eye("Eye.L", head, -0.09f, Mat(Color.white), Mat(Tokens.Light.Ink));
            var eyeR = Eye("Eye.R", head, 0.09f, Mat(Color.white), Mat(Tokens.Light.Ink));

            var browScale = new Vector3(0.07f, 0.012f, 0.02f);
            var bp = PrimitiveExpressionDriver.BrowBasePos;
            var browL = Primitive(PrimitiveType.Cube, "Brow.L", head, new Vector3(-bp.x, bp.y, bp.z), browScale, Mat(Tokens.Light.Ink));
            var browR = Primitive(PrimitiveType.Cube, "Brow.R", head, new Vector3(bp.x, bp.y, bp.z), browScale, Mat(Tokens.Light.Ink));

            var mouth = Primitive(PrimitiveType.Sphere, "Mouth", head, PrimitiveExpressionDriver.MouthBasePos, PrimitiveExpressionDriver.MouthBaseScale, Mat(Tokens.Light.Night));

            var tongue = Primitive(PrimitiveType.Sphere, "Tongue", head, PrimitiveExpressionDriver.MouthBasePos + new Vector3(0f, -0.03f, 0.02f), Vector3.one * 0.03f, Mat(new Color32(255, 143, 190, 255)));
            tongue.gameObject.SetActive(false);

            var driver = root.AddComponent<PrimitiveExpressionDriver>();
            driver.Bind(head, headMesh, eyeL, eyeR, browL, browR, mouth, tongue);

            var pose = root.AddComponent<HeadPoseDriver>();
            pose.Bind(head);
            return root;
        }

        private static Transform Eye(string name, Transform head, float x, Material white, Material dark)
        {
            var eye = Primitive(PrimitiveType.Sphere, name, head, new Vector3(x, 0.05f, 0.13f), Vector3.one * PrimitiveExpressionDriver.EyeScale, white);
            // 눈 스케일은 드라이버가 바꾸므로 동공은 눈의 자식으로 두어 같이 움직이게 한다.
            Primitive(PrimitiveType.Sphere, "Pupil", eye, new Vector3(0f, 0f, 0.35f), Vector3.one * 0.45f, dark);
            return eye;
        }

        private static Transform Primitive(PrimitiveType type, string name, Transform parent, Vector3 localPos, Vector3 localScale, Material mat)
        {
            // GameObject.CreatePrimitive 는 Collider 를 붙이는데, 플레이어 빌드에서 Physics 클래스가 스트리핑되어
            // "Can't add component because class 'SphereCollider' doesn't exist!" 가 난다. 충돌체는 필요 없으니 메시만 만든다.
            var go = new GameObject(name);
            go.AddComponent<MeshFilter>().sharedMesh = BuiltinMesh(type);
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = localScale;
            if (mat != null) renderer.sharedMaterial = mat;
            return go.transform;
        }

        private static readonly System.Collections.Generic.Dictionary<PrimitiveType, Mesh> MeshCache = new System.Collections.Generic.Dictionary<PrimitiveType, Mesh>();

        /// <summary>
        /// 내장 메시를 "x 반지름 0.5"(CreatePrimitive 와 같은 크기)로 정규화한 복사본. 에뮬레이터 점검에서 내장 Sphere.fbx 가
        /// 기대보다 커서 머리가 두 배로 그려지고 눈·입이 구 안에 묻혔다. 크기를 메시에서 고정해야 드라이버가 localScale 을 덮어써도 유지된다.
        /// </summary>
        private static Mesh BuiltinMesh(PrimitiveType type)
        {
            if (MeshCache.TryGetValue(type, out var cached) && cached != null) return cached;
            var src = RawBuiltinMesh(type);
            if (src == null) return null;
            var extent = src.bounds.extents.x;
            var mesh = src;
            if (extent > 0f && Mathf.Abs(extent - 0.5f) > 1e-3f)
            {
                var f = 0.5f / extent;
                mesh = Object.Instantiate(src);
                mesh.name = src.name + " (normalized)";
                var v = mesh.vertices;
                for (var i = 0; i < v.Length; i++) v[i] *= f;
                mesh.vertices = v;
                mesh.RecalculateBounds();
                Debug.Log($"[PrimitiveAvatar] {src.name} extents={src.bounds.extents} → normalized ×{f:F3}");
            }
            MeshCache[type] = mesh;
            return mesh;
        }

        private static Mesh RawBuiltinMesh(PrimitiveType type)
        {
            var file = type switch
            {
                PrimitiveType.Sphere => "Sphere.fbx",
                PrimitiveType.Cube => "Cube.fbx",
                PrimitiveType.Capsule => "Capsule.fbx",
                PrimitiveType.Cylinder => "Cylinder.fbx",
                PrimitiveType.Plane => "Plane.fbx",
                _ => "Quad.fbx",
            };
            var mesh = Resources.GetBuiltinResource<Mesh>(file);
            if (mesh == null) Debug.LogError($"내장 메시 '{file}' 를 찾지 못했다");
            return mesh;
        }
    }
}
