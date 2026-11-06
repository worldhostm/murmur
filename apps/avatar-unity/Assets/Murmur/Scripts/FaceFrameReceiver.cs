using System;
using System.Collections.Generic;
using Murmur.FaceProtocol;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 슬롯("local", "remote")별 최신 표정 프레임을 보관한다. 네이티브 스레드에서 Push 되고 Unity 메인 스레드에서 읽는다.
    /// 프레임은 face-protocol 바이너리(144바이트)만 받는다. 카메라 영상은 이 클래스와 무관하다.
    /// </summary>
    public sealed class FaceFrameReceiver
    {
        public static readonly FaceFrameReceiver Instance = new FaceFrameReceiver();

        private readonly object _lock = new object();
        private readonly Dictionary<string, FaceFrame> _latest = new Dictionary<string, FaceFrame>();
        private readonly Dictionary<string, double> _receivedAt = new Dictionary<string, double>();
        private readonly Dictionary<string, FaceFrame> _scratch = new Dictionary<string, FaceFrame>();

        public int DroppedFrames { get; private set; }
        public int ReceivedFrames { get; private set; }

        /// <summary>바이트를 디코드해 슬롯에 넣는다. 잘못된 프레임은 무시하고 카운트만 올린다.</summary>
        public bool Push(string slot, byte[] bytes, double nowSeconds)
        {
            lock (_lock)
            {
                if (!_scratch.TryGetValue(slot, out var frame))
                {
                    frame = new FaceFrame();
                    _scratch[slot] = frame;
                }
                if (!FaceFrameCodec.Decode(bytes, frame))
                {
                    DroppedFrames++;
                    return false;
                }
                if (!_latest.TryGetValue(slot, out var dst))
                {
                    dst = new FaceFrame();
                    _latest[slot] = dst;
                }
                Copy(frame, dst);
                _receivedAt[slot] = nowSeconds;
                ReceivedFrames++;
                return true;
            }
        }

        /// <summary>최신 프레임을 into 에 복사한다. 없으면 false.</summary>
        public bool TryGetLatest(string slot, FaceFrame into, out double receivedAtSeconds)
        {
            lock (_lock)
            {
                if (!_latest.TryGetValue(slot, out var src))
                {
                    receivedAtSeconds = 0;
                    return false;
                }
                Copy(src, into);
                receivedAtSeconds = _receivedAt[slot];
                return true;
            }
        }

        public void Clear(string slot)
        {
            lock (_lock)
            {
                _latest.Remove(slot);
                _receivedAt.Remove(slot);
            }
        }

        private static void Copy(FaceFrame src, FaceFrame dst)
        {
            dst.Version = src.Version;
            dst.Tracking = src.Tracking;
            dst.TimestampMs = src.TimestampMs;
            Array.Copy(src.BlendShapes, dst.BlendShapes, FaceProtocol.FaceProtocol.BlendShapeCount);
            dst.Rx = src.Rx; dst.Ry = src.Ry; dst.Rz = src.Rz; dst.Rw = src.Rw;
            dst.Px = src.Px; dst.Py = src.Py; dst.Pz = src.Pz;
        }
    }
}
