using Murmur.FaceProtocol;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 표정 시트 아틀라스를 입힌 쿼드 하나를 구동한다. 프레임의 블렌드셰이프를 스무딩해 SpriteExpression 으로 분류하고
    /// 아틀라스 셀(UV offset)을 바꾼다. 깜빡임을 막기 위해 최소 유지 시간을 둔다. 머리 포즈는 기울기(roll)와 약간의 평행이동으로만 표현한다.
    /// </summary>
    public sealed class SpriteExpressionDriver : MonoBehaviour, IFaceFrameConsumer
    {
        public const int AtlasCols = 5;
        public const int AtlasRows = 2;
        /// <summary>아틀라스에서 셀이 차지하는 비율 (scripts/slice-expression-sheet.py: 137×240 셀, 1024×512 아틀라스).</summary>
        public static readonly Vector2 CellUvScale = new Vector2(137f / 1024f, 240f / 512f);

        [Range(0.05f, 1f)] [SerializeField] private float smoothing = 0.5f;
        [Tooltip("표정이 바뀐 뒤 이 시간(초) 동안은 다시 바꾸지 않는다 (깜빡임 방지).")]
        [SerializeField] private float minHoldSeconds = 0.15f;
        [SerializeField] private float maxRollDegrees = 12f;
        [SerializeField] private float panScale = 0.03f;

        private Renderer _renderer;
        private Transform _pivot;
        private Vector3 _restPos;
        private SpriteExpressionClassifier.Features _features;
        private float _heldFor;
        private Quaternion _pose = Quaternion.identity;

        public SpriteExpression Current { get; private set; } = SpriteExpression.Neutral;

        public void Bind(Renderer quadRenderer, Transform pivot)
        {
            _renderer = quadRenderer;
            _pivot = pivot;
            _restPos = pivot != null ? pivot.localPosition : Vector3.zero;
            _heldFor = minHoldSeconds;
            ApplyCell(Current);
        }

        public void Apply(FaceFrame frame, float deltaTime)
        {
            if (_renderer == null) return;
            var lost = frame.Tracking == (byte)TrackingState.Lost;
            var k = 1f - Mathf.Pow(1f - smoothing, deltaTime * 30f);
            var target = lost ? default : SpriteExpressionClassifier.Features.From(frame);
            _features = SpriteExpressionClassifier.Features.Lerp(_features, target, k);

            _heldFor += deltaTime;
            var next = SpriteExpressionClassifier.Classify(_features, lost);
            if (next != Current && _heldFor >= minHoldSeconds)
            {
                Current = next;
                _heldFor = 0f;
                ApplyCell(next);
            }

            if (_pivot != null)
            {
                var goal = lost ? Quaternion.identity : HeadPoseDriver.Clamp(HeadPoseDriver.ToUnity(frame.Rx, frame.Ry, frame.Rz, frame.Rw), 45f);
                _pose = Quaternion.Slerp(_pose, goal, k);
                var e = _pose.eulerAngles;
                float Wrap(float a) => a > 180f ? a - 360f : a;
                var yaw = Wrap(e.y); var pitch = Wrap(e.x); var roll = Wrap(e.z);
                _pivot.localRotation = Quaternion.Euler(0f, 0f, Mathf.Clamp(roll, -maxRollDegrees, maxRollDegrees));
                _pivot.localPosition = _restPos + new Vector3(-yaw / 45f * panScale, pitch / 45f * panScale, 0f);
            }
        }

        /// <summary>표정 i 의 UV offset. row 0 이 아틀라스 위쪽(이미지 y=0)이므로 v 는 위에서부터 센다.</summary>
        public static Vector2 CellUvOffset(SpriteExpression e)
        {
            var i = (int)e;
            var col = i % AtlasCols;
            var row = i / AtlasCols;
            return new Vector2(col * CellUvScale.x, 1f - (row + 1) * CellUvScale.y);
        }

        private void ApplyCell(SpriteExpression e)
        {
            if (_renderer == null) return;
            // Build 가 슬롯별 Material 인스턴스를 만들어 두므로 sharedMaterial 이 곧 이 쿼드의 것이다 (renderer.material 은 에디트 모드에서 누수).
            var m = _renderer.sharedMaterial;
            if (m == null) return;
            m.mainTextureScale = CellUvScale;
            m.mainTextureOffset = CellUvOffset(e);
        }
    }
}
