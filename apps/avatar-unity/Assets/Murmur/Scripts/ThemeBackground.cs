using Murmur.Design;
using UnityEngine;

namespace Murmur
{
    /// <summary>통화 화면 배경색. 토큰(Tokens.Light/Dark.Night)만 쓴다. RN 오버레이(night 80%)와 맞닿는 면이다.</summary>
    public sealed class ThemeBackground : MonoBehaviour
    {
        [SerializeField] private Camera targetCamera;

        private void Awake()
        {
            if (targetCamera == null) targetCamera = GetComponent<Camera>() ?? Camera.main;
            Apply(ThemeId.Dark);
        }

        public void Apply(ThemeId theme)
        {
            if (targetCamera == null) return;
            targetCamera.clearFlags = CameraClearFlags.SolidColor;
            targetCamera.backgroundColor = theme == ThemeId.Light ? Tokens.Light.Night : Tokens.Dark.Night;
        }
    }
}
