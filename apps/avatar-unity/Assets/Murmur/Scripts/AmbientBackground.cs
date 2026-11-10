using Murmur.Design;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 아바타 뒤에서 천천히 떠다니는 부드러운 빛 덩어리 3개. 런타임 생성 방사형 알파 텍스처를 입힌 쿼드이며
    /// 색은 토큰(Brand·Lavender·Accent)에서 테마별로 고른다. MotionSettings.Reduced 면 제자리에 멈춘다.
    /// 머티리얼은 Resources/Murmur/GlowUnlit (Editor/SceneSetup.EnsureGlowMaterial, URP Unlit Transparent, Cull Off).
    /// </summary>
    public sealed class AmbientBackground : MonoBehaviour
    {
        public const string RootName = "AmbientGlow";
        public const string MaterialResource = "Murmur/GlowUnlit";
        public const int GlowCount = 3;
        /// <summary>아바타(z=0) 뒤, 카메라(z=0.8) 반대쪽.</summary>
        public const float Depth = -1.2f;

        private struct Glow
        {
            public Transform Tf;
            public Material Mat;
            public Vector2 Center;
            public Vector2 Radius;
            public float PeriodX, PeriodY, Phase, AlphaPeriod;
            public Color BaseColor;
        }

        private static readonly (Vector2 center, Vector2 radius, float px, float py, float scale)[] Layout =
        {
            (new Vector2(-0.45f, 1.75f), new Vector2(0.18f, 0.12f), 11f, 9f, 1.6f),
            (new Vector2(0.5f, 1.15f), new Vector2(0.15f, 0.16f), 13f, 10f, 1.4f),
            (new Vector2(0.05f, 1.95f), new Vector2(0.22f, 0.1f), 14f, 12f, 1.2f),
        };

        private readonly Glow[] _glows = new Glow[GlowCount];
        private Transform _root;
        private static Texture2D _radial;

        public bool IsBuilt => _root != null;
        public int Count => IsBuilt ? _root.childCount : 0;

        private void Awake()
        {
            EnsureBuilt();
            ApplyTheme(ThemeId.Dark);
        }

        /// <summary>빛 3개를 만든다 (이미 있으면 그대로). 테스트에서 직접 부른다.</summary>
        public void EnsureBuilt()
        {
            if (_root != null) return;
            var existing = transform.Find(RootName);
            if (existing != null) { if (Application.isPlaying) Destroy(existing.gameObject); else DestroyImmediate(existing.gameObject); }
            _root = new GameObject(RootName).transform;
            _root.SetParent(null, false); // 카메라와 무관한 월드 좌표
            var template = Resources.Load<Material>(MaterialResource);
            var shader = template != null ? null : (Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Transparent"));
            for (var i = 0; i < GlowCount; i++)
            {
                var (center, radius, px, py, scale) = Layout[i];
                var go = new GameObject($"Glow{i}");
                go.transform.SetParent(_root, false);
                go.transform.localPosition = new Vector3(center.x, center.y, Depth);
                go.transform.localScale = new Vector3(scale, scale, 1f);
                go.AddComponent<MeshFilter>().sharedMesh = Resources.GetBuiltinResource<Mesh>("Quad.fbx");
                var renderer = go.AddComponent<MeshRenderer>();
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;
                Material mat = template != null ? new Material(template) : shader != null ? new Material(shader) : null;
                if (mat != null)
                {
                    mat.mainTexture = RadialTexture();
                    renderer.sharedMaterial = mat;
                }
                _glows[i] = new Glow
                {
                    Tf = go.transform, Mat = mat, Center = center, Radius = radius,
                    PeriodX = px, PeriodY = py, Phase = i * 2.1f, AlphaPeriod = 7f + i * 1.5f,
                };
            }
        }

        public void ApplyTheme(ThemeId theme)
        {
            EnsureBuilt();
            var light = theme == ThemeId.Light;
            Color32 brand = light ? Tokens.Light.Brand : Tokens.Dark.Brand;
            Color32 lavender = light ? Tokens.Light.Lavender : Tokens.Dark.Lavender;
            Color32 accent = light ? Tokens.Light.Accent : Tokens.Dark.Accent;
            SetBase(0, brand, 0.18f);
            SetBase(1, lavender, 0.14f);
            SetBase(2, accent, 0.10f);
            Tick(Time.time);
        }

        private void SetBase(int i, Color32 c, float alpha)
        {
            var color = (Color)c;
            color.a = alpha;
            _glows[i].BaseColor = color;
        }

        public Color ColorOf(int i) => _glows[i].Mat != null ? _glows[i].Mat.color : Color.clear;
        public Vector3 PositionOf(int i) => _glows[i].Tf != null ? _glows[i].Tf.localPosition : Vector3.zero;

        private void Update() => Tick(Time.time);

        /// <summary>시각 t 의 위치·알파. Reduced 면 기준 위치·기준 알파에 고정.</summary>
        public void Tick(float t)
        {
            if (_root == null) return;
            const float tau = Mathf.PI * 2f;
            var reduced = MotionSettings.Reduced;
            for (var i = 0; i < GlowCount; i++)
            {
                ref var g = ref _glows[i];
                if (g.Tf == null) continue;
                var x = g.Center.x;
                var y = g.Center.y;
                var a = g.BaseColor.a;
                if (!reduced)
                {
                    x += g.Radius.x * Mathf.Sin(t * tau / g.PeriodX + g.Phase);
                    y += g.Radius.y * Mathf.Sin(t * tau / g.PeriodY + g.Phase * 0.5f);
                    a *= 0.8f + 0.2f * Mathf.Sin(t * tau / g.AlphaPeriod + g.Phase);
                }
                g.Tf.localPosition = new Vector3(x, y, Depth);
                if (g.Mat != null)
                {
                    var c = g.BaseColor;
                    c.a = a;
                    g.Mat.color = c;
                }
            }
        }

        private static Texture2D RadialTexture()
        {
            if (_radial != null) return _radial;
            const int size = 128;
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = "RadialGlow" };
            var pixels = new Color32[size * size];
            var half = (size - 1) * 0.5f;
            for (var y = 0; y < size; y++)
            for (var x = 0; x < size; x++)
            {
                var d = Mathf.Sqrt((x - half) * (x - half) + (y - half) * (y - half)) / half;
                var a = Mathf.Clamp01(1f - d);
                a = a * a * (3f - 2f * a); // smoothstep 으로 가장자리를 부드럽게
                pixels[y * size + x] = new Color32(255, 255, 255, (byte)(a * 255f));
            }
            tex.SetPixels32(pixels);
            tex.Apply(false, true);
            _radial = tex;
            return tex;
        }

        private void OnDestroy()
        {
            if (_root != null) { if (Application.isPlaying) Destroy(_root.gameObject); else DestroyImmediate(_root.gameObject); }
            _root = null;
        }
    }
}
