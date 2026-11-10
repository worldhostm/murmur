using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 아바타가 가만히 서 있지 않게 하는 미세한 아이들 모션: 숨쉬기(스케일), 상하 bob, roll 흔들림.
    /// 표정 드라이버가 움직이는 피벗이 아니라 그 부모(루트)에 붙여 서로 겹치지 않는다. MotionSettings.Reduced 면 정지 자세.
    /// </summary>
    public sealed class IdleMotion : MonoBehaviour
    {
        [SerializeField] private float breathAmplitude = 0.012f;
        [SerializeField] private float breathPeriod = 3.2f;
        [SerializeField] private float bobAmplitude = 0.006f;
        [SerializeField] private float bobPeriod = 4.1f;
        [SerializeField] private float swayDegrees = 1.2f;
        [SerializeField] private float swayPeriod = 5.3f;

        private Vector3 _restPos;
        private Vector3 _restScale;
        private Quaternion _restRot;
        private bool _captured;

        public bool IsAtRest { get; private set; } = true;

        private void OnEnable() => CaptureRest();

        /// <summary>현재 transform 을 정지 자세로 기억한다. 테스트와 OnEnable 에서 부른다.</summary>
        public void CaptureRest()
        {
            _restPos = transform.localPosition;
            _restScale = transform.localScale;
            _restRot = transform.localRotation;
            _captured = true;
        }

        private void Update() => Tick(Time.time);

        /// <summary>시각 t(초)의 자세를 적용한다. Reduced 면 정지 자세.</summary>
        public void Tick(float t)
        {
            if (!_captured) CaptureRest();
            if (MotionSettings.Reduced)
            {
                Rest();
                return;
            }
            const float tau = Mathf.PI * 2f;
            var breath = 1f + breathAmplitude * Mathf.Sin(t * tau / breathPeriod);
            var bob = bobAmplitude * Mathf.Sin(t * tau / bobPeriod + 0.7f);
            var sway = swayDegrees * Mathf.Sin(t * tau / swayPeriod + 1.9f);
            transform.localPosition = _restPos + new Vector3(0f, bob, 0f);
            transform.localScale = new Vector3(_restScale.x * breath, _restScale.y * breath, _restScale.z);
            transform.localRotation = _restRot * Quaternion.Euler(0f, 0f, sway);
            IsAtRest = false;
        }

        public void Rest()
        {
            transform.localPosition = _restPos;
            transform.localScale = _restScale;
            transform.localRotation = _restRot;
            IsAtRest = true;
        }
    }
}
