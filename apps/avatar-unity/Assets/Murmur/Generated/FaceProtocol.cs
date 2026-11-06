// GENERATED FROM schema/face-frame.schema.json — DO NOT EDIT
// Regenerate: pnpm --filter @murmur/face-protocol generate
using System;
using System.Buffers.Binary;

namespace Murmur.FaceProtocol
{
    /// <summary>ARKit ARFaceAnchor.BlendShapeLocation 순서와 동일한 정규 순서.</summary>
    public enum BlendShape
    {
        EyeBlinkLeft = 0,
        EyeLookDownLeft = 1,
        EyeLookInLeft = 2,
        EyeLookOutLeft = 3,
        EyeLookUpLeft = 4,
        EyeSquintLeft = 5,
        EyeWideLeft = 6,
        EyeBlinkRight = 7,
        EyeLookDownRight = 8,
        EyeLookInRight = 9,
        EyeLookOutRight = 10,
        EyeLookUpRight = 11,
        EyeSquintRight = 12,
        EyeWideRight = 13,
        JawForward = 14,
        JawLeft = 15,
        JawRight = 16,
        JawOpen = 17,
        MouthClose = 18,
        MouthFunnel = 19,
        MouthPucker = 20,
        MouthLeft = 21,
        MouthRight = 22,
        MouthSmileLeft = 23,
        MouthSmileRight = 24,
        MouthFrownLeft = 25,
        MouthFrownRight = 26,
        MouthDimpleLeft = 27,
        MouthDimpleRight = 28,
        MouthStretchLeft = 29,
        MouthStretchRight = 30,
        MouthRollLower = 31,
        MouthRollUpper = 32,
        MouthShrugLower = 33,
        MouthShrugUpper = 34,
        MouthPressLeft = 35,
        MouthPressRight = 36,
        MouthLowerDownLeft = 37,
        MouthLowerDownRight = 38,
        MouthUpperUpLeft = 39,
        MouthUpperUpRight = 40,
        BrowDownLeft = 41,
        BrowDownRight = 42,
        BrowInnerUp = 43,
        BrowOuterUpLeft = 44,
        BrowOuterUpRight = 45,
        CheekPuff = 46,
        CheekSquintLeft = 47,
        CheekSquintRight = 48,
        NoseSneerLeft = 49,
        NoseSneerRight = 50,
        TongueOut = 51,
    }

    public enum TrackingState : byte
    {
        Tracked = 0,
        Limited = 1,
        Lost = 2,
    }

    public static class FaceProtocol
    {
        public const int Version = 1;
        public const int BlendShapeCount = 52;
        public const int FrameByteLength = 144;
        public const byte Magic0 = 0x4D; // 'M'
        public const byte Magic1 = 0x46; // 'F'

        public static readonly string[] BlendShapeNames =
        {
            "eyeBlinkLeft",
            "eyeLookDownLeft",
            "eyeLookInLeft",
            "eyeLookOutLeft",
            "eyeLookUpLeft",
            "eyeSquintLeft",
            "eyeWideLeft",
            "eyeBlinkRight",
            "eyeLookDownRight",
            "eyeLookInRight",
            "eyeLookOutRight",
            "eyeLookUpRight",
            "eyeSquintRight",
            "eyeWideRight",
            "jawForward",
            "jawLeft",
            "jawRight",
            "jawOpen",
            "mouthClose",
            "mouthFunnel",
            "mouthPucker",
            "mouthLeft",
            "mouthRight",
            "mouthSmileLeft",
            "mouthSmileRight",
            "mouthFrownLeft",
            "mouthFrownRight",
            "mouthDimpleLeft",
            "mouthDimpleRight",
            "mouthStretchLeft",
            "mouthStretchRight",
            "mouthRollLower",
            "mouthRollUpper",
            "mouthShrugLower",
            "mouthShrugUpper",
            "mouthPressLeft",
            "mouthPressRight",
            "mouthLowerDownLeft",
            "mouthLowerDownRight",
            "mouthUpperUpLeft",
            "mouthUpperUpRight",
            "browDownLeft",
            "browDownRight",
            "browInnerUp",
            "browOuterUpLeft",
            "browOuterUpRight",
            "cheekPuff",
            "cheekSquintLeft",
            "cheekSquintRight",
            "noseSneerLeft",
            "noseSneerRight",
            "tongueOut",
        };
    }

    /// <summary>디코딩 결과를 담는 재사용 가능한 버퍼. 프레임마다 new 하지 않는다.</summary>
    public sealed class FaceFrame
    {
        public byte Version;
        public byte Tracking;
        public double TimestampMs;
        public readonly float[] BlendShapes = new float[FaceProtocol.BlendShapeCount];
        public float Rx, Ry, Rz, Rw;
        public float Px, Py, Pz;
    }

    public static class FaceFrameCodec
    {
        private const int OffVersion = 2;
        private const int OffTracking = 3;
        private const int OffTimestamp = 4;
        private const int OffBlendShapes = 12;
        private const int OffRotation = 12 + FaceProtocol.BlendShapeCount * 2;
        private const int OffPosition = OffRotation + 16;

        /// <summary>v1 레이아웃(리틀엔디언)을 읽어 <paramref name="into"/>에 채운다. 실패 시 false.</summary>
        public static bool Decode(byte[] bytes, FaceFrame into)
        {
            return Decode(new ReadOnlySpan<byte>(bytes), into);
        }

        // float/double 은 Int32/Int64 비트 변환으로 읽고 쓴다. Unity 의 .NET Standard 2.1 에는 Read/WriteSingleLittleEndian 이 없다.
        public static bool Decode(ReadOnlySpan<byte> b, FaceFrame into)
        {
            if (b.Length < FaceProtocol.FrameByteLength) return false;
            if (b[0] != FaceProtocol.Magic0 || b[1] != FaceProtocol.Magic1) return false;
            byte version = b[OffVersion];
            // 버전 정책: 현재 버전과 바로 이전 버전까지 받는다. v1이 최초 버전이므로 v1만 허용.
            if (version != FaceProtocol.Version) return false;

            into.Version = version;
            into.Tracking = b[OffTracking];
            into.TimestampMs = BitConverter.Int64BitsToDouble(BinaryPrimitives.ReadInt64LittleEndian(b.Slice(OffTimestamp, 8)));
            for (int i = 0; i < FaceProtocol.BlendShapeCount; i++)
            {
                ushort q = BinaryPrimitives.ReadUInt16LittleEndian(b.Slice(OffBlendShapes + i * 2, 2));
                into.BlendShapes[i] = q / 65535f;
            }
            into.Rx = BitConverter.Int32BitsToSingle(BinaryPrimitives.ReadInt32LittleEndian(b.Slice(OffRotation, 4)));
            into.Ry = BitConverter.Int32BitsToSingle(BinaryPrimitives.ReadInt32LittleEndian(b.Slice(OffRotation + 4, 4)));
            into.Rz = BitConverter.Int32BitsToSingle(BinaryPrimitives.ReadInt32LittleEndian(b.Slice(OffRotation + 8, 4)));
            into.Rw = BitConverter.Int32BitsToSingle(BinaryPrimitives.ReadInt32LittleEndian(b.Slice(OffRotation + 12, 4)));
            into.Px = BitConverter.Int32BitsToSingle(BinaryPrimitives.ReadInt32LittleEndian(b.Slice(OffPosition, 4)));
            into.Py = BitConverter.Int32BitsToSingle(BinaryPrimitives.ReadInt32LittleEndian(b.Slice(OffPosition + 4, 4)));
            into.Pz = BitConverter.Int32BitsToSingle(BinaryPrimitives.ReadInt32LittleEndian(b.Slice(OffPosition + 8, 4)));
            return true;
        }

        /// <summary>v1 레이아웃으로 인코딩한다. <paramref name="dest"/>는 FrameByteLength 이상이어야 한다.</summary>
        public static int Encode(FaceFrame frame, Span<byte> dest)
        {
            if (dest.Length < FaceProtocol.FrameByteLength) throw new ArgumentException("dest too small");
            dest[0] = FaceProtocol.Magic0;
            dest[1] = FaceProtocol.Magic1;
            dest[OffVersion] = (byte)FaceProtocol.Version;
            dest[OffTracking] = frame.Tracking;
            BinaryPrimitives.WriteInt64LittleEndian(dest.Slice(OffTimestamp, 8), BitConverter.DoubleToInt64Bits(frame.TimestampMs));
            for (int i = 0; i < FaceProtocol.BlendShapeCount; i++)
            {
                float v = frame.BlendShapes[i];
                if (float.IsNaN(v) || v < 0f) v = 0f;
                if (v > 1f) v = 1f;
                BinaryPrimitives.WriteUInt16LittleEndian(dest.Slice(OffBlendShapes + i * 2, 2), (ushort)Math.Round(v * 65535f));
            }
            BinaryPrimitives.WriteInt32LittleEndian(dest.Slice(OffRotation, 4), BitConverter.SingleToInt32Bits(frame.Rx));
            BinaryPrimitives.WriteInt32LittleEndian(dest.Slice(OffRotation + 4, 4), BitConverter.SingleToInt32Bits(frame.Ry));
            BinaryPrimitives.WriteInt32LittleEndian(dest.Slice(OffRotation + 8, 4), BitConverter.SingleToInt32Bits(frame.Rz));
            BinaryPrimitives.WriteInt32LittleEndian(dest.Slice(OffRotation + 12, 4), BitConverter.SingleToInt32Bits(frame.Rw));
            BinaryPrimitives.WriteInt32LittleEndian(dest.Slice(OffPosition, 4), BitConverter.SingleToInt32Bits(frame.Px));
            BinaryPrimitives.WriteInt32LittleEndian(dest.Slice(OffPosition + 4, 4), BitConverter.SingleToInt32Bits(frame.Py));
            BinaryPrimitives.WriteInt32LittleEndian(dest.Slice(OffPosition + 8, 4), BitConverter.SingleToInt32Bits(frame.Pz));
            return FaceProtocol.FrameByteLength;
        }
    }
}
