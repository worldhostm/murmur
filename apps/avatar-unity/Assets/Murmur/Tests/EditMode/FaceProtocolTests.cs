using System;
using Murmur.FaceProtocol;
using NUnit.Framework;
using UnityEngine;

namespace Murmur.Tests
{
    /// <summary>생성된 C# 코덱이 TS 코덱과 같은 와이어 규격을 지키는지 확인한다. Unity Test Runner(EditMode)에서 돈다.</summary>
    public class FaceProtocolTests
    {
        private static FaceFrame Sample()
        {
            var f = new FaceFrame { Version = 1, Tracking = 0, TimestampMs = 1234.5 };
            for (var i = 0; i < FaceProtocol.FaceProtocol.BlendShapeCount; i++) f.BlendShapes[i] = (i % 10) / 10f;
            f.Rx = 0f; f.Ry = 0.3826834f; f.Rz = 0f; f.Rw = 0.9238795f;
            f.Px = 0.01f; f.Py = -0.02f; f.Pz = -0.5f;
            return f;
        }

        [Test]
        public void EncodeDecodeRoundTrip()
        {
            var src = Sample();
            var bytes = new byte[FaceProtocol.FaceProtocol.FrameByteLength];
            Assert.AreEqual(144, FaceFrameCodec.Encode(src, bytes));
            Assert.AreEqual((byte)'M', bytes[0]);
            Assert.AreEqual((byte)'F', bytes[1]);
            Assert.AreEqual(1, bytes[2]);

            var dst = new FaceFrame();
            Assert.IsTrue(FaceFrameCodec.Decode(bytes, dst));
            Assert.AreEqual(src.TimestampMs, dst.TimestampMs);
            for (var i = 0; i < FaceProtocol.FaceProtocol.BlendShapeCount; i++)
                Assert.AreEqual(src.BlendShapes[i], dst.BlendShapes[i], 1f / 65535f);
            Assert.AreEqual(src.Rw, dst.Rw, 1e-6f);
            Assert.AreEqual(src.Pz, dst.Pz, 1e-6f);
        }

        [Test]
        public void RejectsBadMagicAndVersion()
        {
            var bytes = new byte[FaceProtocol.FaceProtocol.FrameByteLength];
            FaceFrameCodec.Encode(Sample(), bytes);
            var dst = new FaceFrame();
            bytes[0] = 0;
            Assert.IsFalse(FaceFrameCodec.Decode(bytes, dst));
            bytes[0] = (byte)'M'; bytes[2] = 9;
            Assert.IsFalse(FaceFrameCodec.Decode(bytes, dst));
            Assert.IsFalse(FaceFrameCodec.Decode(new byte[10], dst));
        }

        [Test]
        public void ReceiverKeepsLatestPerSlot()
        {
            var bytes = new byte[FaceProtocol.FaceProtocol.FrameByteLength];
            var src = Sample();
            src.TimestampMs = 1;
            FaceFrameCodec.Encode(src, bytes);
            Assert.IsTrue(FaceFrameReceiver.Instance.Push("test", bytes, 10.0));
            src.TimestampMs = 2;
            FaceFrameCodec.Encode(src, bytes);
            Assert.IsTrue(FaceFrameReceiver.Instance.Push("test", bytes, 11.0));

            var got = new FaceFrame();
            Assert.IsTrue(FaceFrameReceiver.Instance.TryGetLatest("test", got, out var at));
            Assert.AreEqual(2.0, got.TimestampMs);
            Assert.AreEqual(11.0, at);
            Assert.IsFalse(FaceFrameReceiver.Instance.Push("test", new byte[3], 12.0));
            FaceFrameReceiver.Instance.Clear("test");
            Assert.IsFalse(FaceFrameReceiver.Instance.TryGetLatest("test", got, out _));
        }

        [Test]
        public void HeadPoseClampLimitsAngle()
        {
            var q = Quaternion.AngleAxis(80f, Vector3.up);
            var c = HeadPoseDriver.Clamp(q, 45f);
            c.ToAngleAxis(out var angle, out _);
            Assert.AreEqual(45f, angle, 0.01f);
        }

        [Test]
        public void BlendShapeNamesMatchEnum()
        {
            Assert.AreEqual(52, FaceProtocol.FaceProtocol.BlendShapeNames.Length);
            Assert.AreEqual(52, Enum.GetValues(typeof(BlendShape)).Length);
            Assert.AreEqual("jawOpen", FaceProtocol.FaceProtocol.BlendShapeNames[(int)BlendShape.JawOpen]);
        }
    }
}
