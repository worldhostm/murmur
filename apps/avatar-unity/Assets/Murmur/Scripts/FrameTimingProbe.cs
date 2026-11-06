using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 성능 예산 측정용 (PLANNING.md 0단계: 프레임 시간, 수신→렌더 지연). 1초마다 평균을 로그로 남긴다.
    /// 2020년 보급형 Android 기준 30fps, 지연 1프레임(33ms) 이내가 목표.
    /// </summary>
    public sealed class FrameTimingProbe : MonoBehaviour
    {
        [SerializeField] private string slot = "remote";
        private int _frames;
        private float _accum;
        private float _worst;
        private double _lastReceived;
        private double _latencyAccum;
        private int _latencySamples;
        private readonly FaceProtocol.FaceFrame _frame = new FaceProtocol.FaceFrame();

        public float AverageFrameMs { get; private set; }
        public float WorstFrameMs { get; private set; }
        public float AverageReceiveToRenderMs { get; private set; }

        private void Update()
        {
            var dt = Time.unscaledDeltaTime * 1000f;
            _frames++;
            _accum += dt;
            if (dt > _worst) _worst = dt;

            if (FaceFrameReceiver.Instance.TryGetLatest(slot, _frame, out var receivedAt) && receivedAt != _lastReceived)
            {
                _lastReceived = receivedAt;
                _latencyAccum += (Time.realtimeSinceStartupAsDouble - receivedAt) * 1000.0;
                _latencySamples++;
            }

            if (_accum >= 1000f)
            {
                AverageFrameMs = _accum / _frames;
                WorstFrameMs = _worst;
                AverageReceiveToRenderMs = _latencySamples > 0 ? (float)(_latencyAccum / _latencySamples) : 0f;
                Debug.Log($"[perf] frame avg {AverageFrameMs:F1}ms worst {WorstFrameMs:F1}ms, receive→render {AverageReceiveToRenderMs:F1}ms, dropped {FaceFrameReceiver.Instance.DroppedFrames}");
                _frames = 0; _accum = 0; _worst = 0; _latencyAccum = 0; _latencySamples = 0;
            }
        }
    }
}
