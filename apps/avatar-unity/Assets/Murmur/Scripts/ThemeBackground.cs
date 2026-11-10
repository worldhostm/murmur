using Murmur.Design;
using UnityEngine;

namespace Murmur
{
    /// <summary>통화 화면 배경색. 토큰(Tokens.Light/Dark.Night)만 쓴다. RN 오버레이(night 80%)와 맞닿는 면이다.</summary>
    public sealed class ThemeBackground : MonoBehaviour
    {
        [SerializeField] private Camera targetCamera;
        private AmbientBackground _ambient;

        private void Awake()
        {
            if (targetCamera == null) targetCamera = GetComponent<Camera>() ?? Camera.main;
            // 배경의 느린 빛 움직임 (docs/specs/avatar-presence.md 3). 씬 파일을 바꾸지 않고 런타임에 붙인다.
            _ambient = GetComponent<AmbientBackground>() ?? gameObject.AddComponent<AmbientBackground>();
            Apply(ThemeId.Dark);
        }

        public void Apply(ThemeId theme)
        {
            if (targetCamera != null)
            {
                targetCamera.clearFlags = CameraClearFlags.SolidColor;
                targetCamera.backgroundColor = theme == ThemeId.Light ? Tokens.Light.Night : Tokens.Dark.Night;
            }
            if (_ambient != null) _ambient.ApplyTheme(theme);
        }
    }
}
