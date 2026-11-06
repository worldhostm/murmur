using Murmur.FaceProtocol;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 프리미티브 마스코트(PrimitiveAvatarLoader)의 표정 구동. VRM 없이 표정 수치가 눈에 보이게 하는 PoC 용.
    /// 입(jawOpen/smile/frown), 눈(blink/wide), 눈썹(browInnerUp/browDown), 볼(cheekPuff), 혀(tongueOut)를 스케일·위치로 표현한다.
    /// </summary>
    public sealed class PrimitiveExpressionDriver : MonoBehaviour, IFaceFrameConsumer
    {
        [Range(0.05f, 1f)] [SerializeField] private float smoothing = 0.6f;

        public Transform Head { get; private set; }
        public Transform EyeLeft { get; private set; }
        public Transform EyeRight { get; private set; }
        public Transform BrowLeft { get; private set; }
        public Transform BrowRight { get; private set; }
        public Transform Mouth { get; private set; }
        public Transform Tongue { get; private set; }

        public const float HeadScale = 0.3f;
        public const float EyeScale = 0.07f;
        public static readonly Vector3 MouthBaseScale = new Vector3(0.12f, 0.02f, 0.04f);
        public static readonly Vector3 MouthBasePos = new Vector3(0f, -0.1f, 0.13f);
        public static readonly Vector3 BrowBasePos = new Vector3(0.09f, 0.12f, 0.12f);

        // 현재(스무딩된) 값. 0..1
        private float _jaw, _smile, _frown, _blinkL, _blinkR, _wideL, _wideR, _browUp, _browDown, _cheek, _tongue;

        public void Bind(Transform head, Transform eyeL, Transform eyeR, Transform browL, Transform browR, Transform mouth, Transform tongue)
        {
            Head = head; EyeLeft = eyeL; EyeRight = eyeR; BrowLeft = browL; BrowRight = browR; Mouth = mouth; Tongue = tongue;
            ApplyValues();
        }

        private static float Bs(FaceFrame f, BlendShape s) => f.BlendShapes[(int)s];
        private static float Avg(FaceFrame f, BlendShape a, BlendShape b) => (Bs(f, a) + Bs(f, b)) * 0.5f;

        public void Apply(FaceFrame frame, float deltaTime)
        {
            if (Head == null) return;
            var lost = frame.Tracking == (byte)TrackingState.Lost;
            float jaw = 0, smile = 0, frown = 0, blinkL = 0, blinkR = 0, wideL = 0, wideR = 0, browUp = 0, browDown = 0, cheek = 0, tongue = 0;
            if (!lost)
            {
                jaw = Bs(frame, BlendShape.JawOpen);
                smile = Avg(frame, BlendShape.MouthSmileLeft, BlendShape.MouthSmileRight);
                frown = Avg(frame, BlendShape.MouthFrownLeft, BlendShape.MouthFrownRight);
                blinkL = Bs(frame, BlendShape.EyeBlinkLeft);
                blinkR = Bs(frame, BlendShape.EyeBlinkRight);
                wideL = Bs(frame, BlendShape.EyeWideLeft);
                wideR = Bs(frame, BlendShape.EyeWideRight);
                browUp = Bs(frame, BlendShape.BrowInnerUp);
                browDown = Avg(frame, BlendShape.BrowDownLeft, BlendShape.BrowDownRight);
                cheek = Bs(frame, BlendShape.CheekPuff);
                tongue = Bs(frame, BlendShape.TongueOut);
            }
            var k = 1f - Mathf.Pow(1f - smoothing, deltaTime * 30f);
            _jaw = Mathf.Lerp(_jaw, jaw, k);
            _smile = Mathf.Lerp(_smile, smile, k);
            _frown = Mathf.Lerp(_frown, frown, k);
            _blinkL = Mathf.Lerp(_blinkL, blinkL, k);
            _blinkR = Mathf.Lerp(_blinkR, blinkR, k);
            _wideL = Mathf.Lerp(_wideL, wideL, k);
            _wideR = Mathf.Lerp(_wideR, wideR, k);
            _browUp = Mathf.Lerp(_browUp, browUp, k);
            _browDown = Mathf.Lerp(_browDown, browDown, k);
            _cheek = Mathf.Lerp(_cheek, cheek, k);
            _tongue = Mathf.Lerp(_tongue, tongue, k);
            ApplyValues();
        }

        private void ApplyValues()
        {
            if (Head == null) return;
            // 입: 벌림은 세로, 웃음은 가로. 웃으면 살짝 위로, 찡그리면 아래로.
            var mouthScale = new Vector3(
                Mathf.Lerp(MouthBaseScale.x, 0.18f, _smile),
                Mathf.Lerp(MouthBaseScale.y, 0.12f, _jaw),
                MouthBaseScale.z);
            var mouthPos = MouthBasePos + new Vector3(0f, -_jaw * 0.03f + _smile * 0.02f - _frown * 0.02f, 0f);
            Mouth.localScale = mouthScale;
            Mouth.localPosition = mouthPos;

            // 눈: 감으면 세로로 납작, 크게 뜨면 조금 커진다.
            EyeLeft.localScale = EyeVec(_blinkL, _wideL);
            EyeRight.localScale = EyeVec(_blinkR, _wideR);

            // 눈썹: 안쪽 올리면 위로, 내리면 아래로.
            var browY = BrowBasePos.y + _browUp * 0.02f - _browDown * 0.015f;
            BrowLeft.localPosition = new Vector3(-BrowBasePos.x, browY, BrowBasePos.z);
            BrowRight.localPosition = new Vector3(BrowBasePos.x, browY, BrowBasePos.z);

            // 볼: 부풀리면 머리가 가로로 10% 커진다.
            var puff = HeadScale * (1f + 0.1f * _cheek);
            Head.localScale = new Vector3(puff, HeadScale, puff);

            // 혀: 0.3 이상일 때만 보인다.
            if (Tongue != null)
            {
                var show = _tongue > 0.3f;
                if (Tongue.gameObject.activeSelf != show) Tongue.gameObject.SetActive(show);
                Tongue.localScale = Vector3.one * (0.03f + 0.03f * _tongue);
                Tongue.localPosition = mouthPos + new Vector3(0f, -0.03f, 0.02f);
            }
        }

        private static Vector3 EyeVec(float blink, float wide)
        {
            var s = EyeScale * (1f + 0.3f * wide);
            return new Vector3(s, Mathf.Lerp(s, s * 0.1f, blink), s);
        }
    }
}
