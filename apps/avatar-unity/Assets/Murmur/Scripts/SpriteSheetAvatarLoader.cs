using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 에셋 키 "characters/&lt;id&gt;/front" → Resources/Characters/&lt;id&gt; 아틀라스를 입힌 쿼드. 표정은 SpriteExpressionDriver 가 셀을 골라 보여준다.
    /// 외주 일러스트와 실사형 구동이 들어오기 전까지, 기획 캐릭터 4종이 화면에 "보이고 표정에 반응하는" PoC 용도.
    /// 아틀라스는 scripts/slice-expression-sheet.py 로 만든다 (AI 생성 시안 시트, 출시용 아님).
    /// </summary>
    public sealed class SpriteSheetAvatarLoader : MonoBehaviour, IAvatarLoader
    {
        public const string RootName = "SpriteAvatar";
        public const string KeyPrefix = "characters/";
        public const string KeySuffix = "/front";
        public const string ResourceFolder = "Characters/";
        /// <summary>Resources 에 있어야 플레이어 빌드에 URP Unlit 셰이더가 포함된다 (Editor/SceneSetup.EnsureSpriteMaterial).</summary>
        public const string MaterialResource = "Murmur/SpriteUnlit";
        /// <summary>셀 가로/세로 비 (137/240).</summary>
        public const float CellAspect = 137f / 240f;
        /// <summary>쿼드 높이(월드). 카메라 (0,1.4,0.8)·FOV 60 에서 보이는 높이 0.92 안에 들어온다.</summary>
        public const float QuadHeight = 0.86f;

        public bool CanLoad(string assetKey) => CharacterId(assetKey) != null;

        public static string CharacterId(string assetKey)
        {
            if (string.IsNullOrEmpty(assetKey) || !assetKey.StartsWith(KeyPrefix) || !assetKey.EndsWith(KeySuffix)) return null;
            var id = assetKey.Substring(KeyPrefix.Length, assetKey.Length - KeyPrefix.Length - KeySuffix.Length);
            return id.Length > 0 && !id.Contains("/") ? id : null;
        }

        public void Load(string assetKey, AvatarSlotController slot)
        {
            var id = CharacterId(assetKey);
            if (id == null) { Debug.LogWarning($"[{slot.Slot}] SpriteSheetAvatarLoader 가 모르는 키: {assetKey}"); return; }
            var texture = Resources.Load<Texture2D>(ResourceFolder + id);
            if (texture == null) { Debug.LogWarning($"[{slot.Slot}] Resources/{ResourceFolder}{id} 아틀라스가 없다"); return; }

            foreach (var name in new[] { RootName, PrimitiveAvatarLoader.RootName })
            {
                var old = slot.transform.Find(name);
                if (old != null) { if (Application.isPlaying) Destroy(old.gameObject); else DestroyImmediate(old.gameObject); }
            }
            Build(slot.transform, texture);
            slot.RefreshConsumers();
            Debug.Log($"[SpriteAvatar] [{slot.Slot}] loaded {id} ({texture.width}x{texture.height})");
        }

        /// <summary>parent 아래에 쿼드 + 드라이버를 만든다. 테스트에서 씬 없이 호출할 수 있다.</summary>
        public static GameObject Build(Transform parent, Texture2D texture)
        {
            var root = new GameObject(RootName);
            root.transform.SetParent(parent, false);

            var pivot = new GameObject("Pivot").transform;
            pivot.SetParent(root.transform, false);
            pivot.localPosition = new Vector3(0f, 1.4f, 0f);

            var quad = new GameObject("Quad");
            quad.transform.SetParent(pivot, false);
            // 내장 Quad 의 정면은 -Z 를 향하는데 씬 카메라는 +Z 쪽(0,1.4,0.8)에서 -Z 를 본다. 그대로 두면 뒷면 컬링으로 안 보인다.
            // Y 축 180° 회전은 그림이 좌우로 뒤집히므로, Z 스케일을 -1 로 뒤집어 법선만 +Z 로 돌린다 (그림 방향은 그대로).
            quad.transform.localScale = new Vector3(QuadHeight * CellAspect, QuadHeight, -1f);
            quad.AddComponent<MeshFilter>().sharedMesh = Resources.GetBuiltinResource<Mesh>("Quad.fbx");
            var renderer = quad.AddComponent<MeshRenderer>();
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            var template = Resources.Load<Material>(MaterialResource);
            var shader = template != null ? null : (Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Texture"));
            var mat = template != null ? new Material(template) : shader != null ? new Material(shader) : null;
            if (mat != null)
            {
                mat.mainTexture = texture;
                renderer.sharedMaterial = mat;
            }

            var driver = root.AddComponent<SpriteExpressionDriver>();
            driver.Bind(renderer, pivot);
            // 숨쉬기·흔들림은 루트에, 표정·머리 포즈는 피벗에 (서로 덮어쓰지 않는다).
            root.AddComponent<IdleMotion>().CaptureRest();
            return root;
        }
    }
}
