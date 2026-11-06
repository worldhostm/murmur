using Murmur.FaceProtocol;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 머리 포즈(쿼터니언)를 머리 본에 적용한다. 위치는 쓰지 않는다(캐릭터는 제자리). 회전 각도는 clamp 한다.
    /// 좌표계: face-protocol 은 카메라 기준 오른손(ARKit/MediaPipe), Unity 는 왼손. z 를 뒤집어 변환한다.
    /// </summary>
    public sealed class HeadPoseDriver : MonoBehaviour, IFaceFrameConsumer
    {
        [SerializeField] private Transform headBone;
        [Range(0f, 90f)] [SerializeField] private float maxAngleDegrees = 45f;
        [Range(0.05f, 1f)] [SerializeField] private float smoothing = 0.5f;

        private Quaternion _rest = Quaternion.identity;
        private Quaternion _current = Quaternion.identity;

        private void Awake()
        {
            if (headBone != null) _rest = headBone.localRotation;
        }

        public void Bind(Transform bone)
        {
            headBone = bone;
            _rest = bone != null ? bone.localRotation : Quaternion.identity;
            _current = Quaternion.identity;
        }

        public static Quaternion ToUnity(float x, float y, float z, float w)
        {
            // 오른손 → 왼손: x, y 축 회전 방향이 뒤집히므로 (x, y, -z, -w) 와 동치인 (-x, -y, z, w) 를 쓴다.
            var q = new Quaternion(-x, -y, z, w);
            return q.normalized;
        }

        public void Apply(FaceFrame frame, float deltaTime)
        {
            if (headBone == null) return;
            var goal = frame.Tracking == (byte)TrackingState.Lost
                ? Quaternion.identity
                : Clamp(ToUnity(frame.Rx, frame.Ry, frame.Rz, frame.Rw), maxAngleDegrees);
            var k = 1f - Mathf.Pow(1f - smoothing, deltaTime * 30f);
            _current = Quaternion.Slerp(_current, goal, k);
            headBone.localRotation = _rest * _current;
        }

        public static Quaternion Clamp(Quaternion q, float maxDegrees)
        {
            q.ToAngleAxis(out var angle, out var axis);
            if (angle > 180f) angle -= 360f;
            angle = Mathf.Clamp(angle, -maxDegrees, maxDegrees);
            return Quaternion.AngleAxis(angle, axis);
        }
    }
}
