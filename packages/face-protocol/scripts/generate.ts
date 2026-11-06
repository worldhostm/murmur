/**
 * schema/face-frame.schema.json → dist/generated/{blendShapes.ts, FaceProtocol.cs, FaceProtocol.swift, FaceProtocol.kt}
 *
 *   tsx scripts/generate.ts          # 생성
 *   tsx scripts/generate.ts --check  # 생성물이 최신인지 확인 (다르면 exit 1)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const PKG_ROOT = resolve(import.meta.dirname, '..');
const SCHEMA_PATH = join(PKG_ROOT, 'schema', 'face-frame.schema.json');
const OUT_DIR = join(PKG_ROOT, 'dist', 'generated');

interface Schema {
  protocolVersion: number;
  blendShapeNames: string[];
  trackingStates: string[];
  wire: { byteLength: number };
}

const HEADER_LINE = 'GENERATED FROM schema/face-frame.schema.json — DO NOT EDIT';

function pascal(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function render(schema: Schema): Record<string, string> {
  const { protocolVersion, blendShapeNames, trackingStates, wire } = schema;
  const count = blendShapeNames.length;

  const ts = `// ${HEADER_LINE}
// Regenerate: pnpm --filter @murmur/face-protocol generate

export const PROTOCOL_VERSION = ${protocolVersion} as const;
export const FRAME_BYTE_LENGTH = ${wire.byteLength} as const;
export const BLEND_SHAPE_COUNT = ${count} as const;

export const BLEND_SHAPE_NAMES = [
${blendShapeNames.map((n) => `  '${n}',`).join('\n')}
] as const;

export const TRACKING_STATES = [${trackingStates.map((t) => `'${t}'`).join(', ')}] as const;
`;

  const cs = `// ${HEADER_LINE}
// Regenerate: pnpm --filter @murmur/face-protocol generate
using System;
using System.Buffers.Binary;

namespace Murmur.FaceProtocol
{
    /// <summary>ARKit ARFaceAnchor.BlendShapeLocation 순서와 동일한 정규 순서.</summary>
    public enum BlendShape
    {
${blendShapeNames.map((n, i) => `        ${pascal(n)} = ${i},`).join('\n')}
    }

    public enum TrackingState : byte
    {
${trackingStates.map((t, i) => `        ${pascal(t)} = ${i},`).join('\n')}
    }

    public static class FaceProtocol
    {
        public const int Version = ${protocolVersion};
        public const int BlendShapeCount = ${count};
        public const int FrameByteLength = ${wire.byteLength};
        public const byte Magic0 = 0x4D; // 'M'
        public const byte Magic1 = 0x46; // 'F'

        public static readonly string[] BlendShapeNames =
        {
${blendShapeNames.map((n) => `            "${n}",`).join('\n')}
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

        public static bool Decode(ReadOnlySpan<byte> b, FaceFrame into)
        {
            if (b.Length < FaceProtocol.FrameByteLength) return false;
            if (b[0] != FaceProtocol.Magic0 || b[1] != FaceProtocol.Magic1) return false;
            byte version = b[OffVersion];
            // 버전 정책: 현재 버전과 바로 이전 버전까지 받는다. v1이 최초 버전이므로 v1만 허용.
            if (version != FaceProtocol.Version) return false;

            into.Version = version;
            into.Tracking = b[OffTracking];
            into.TimestampMs = BinaryPrimitives.ReadDoubleLittleEndian(b.Slice(OffTimestamp, 8));
            for (int i = 0; i < FaceProtocol.BlendShapeCount; i++)
            {
                ushort q = BinaryPrimitives.ReadUInt16LittleEndian(b.Slice(OffBlendShapes + i * 2, 2));
                into.BlendShapes[i] = q / 65535f;
            }
            into.Rx = BinaryPrimitives.ReadSingleLittleEndian(b.Slice(OffRotation, 4));
            into.Ry = BinaryPrimitives.ReadSingleLittleEndian(b.Slice(OffRotation + 4, 4));
            into.Rz = BinaryPrimitives.ReadSingleLittleEndian(b.Slice(OffRotation + 8, 4));
            into.Rw = BinaryPrimitives.ReadSingleLittleEndian(b.Slice(OffRotation + 12, 4));
            into.Px = BinaryPrimitives.ReadSingleLittleEndian(b.Slice(OffPosition, 4));
            into.Py = BinaryPrimitives.ReadSingleLittleEndian(b.Slice(OffPosition + 4, 4));
            into.Pz = BinaryPrimitives.ReadSingleLittleEndian(b.Slice(OffPosition + 8, 4));
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
            BinaryPrimitives.WriteDoubleLittleEndian(dest.Slice(OffTimestamp, 8), frame.TimestampMs);
            for (int i = 0; i < FaceProtocol.BlendShapeCount; i++)
            {
                float v = frame.BlendShapes[i];
                if (float.IsNaN(v) || v < 0f) v = 0f;
                if (v > 1f) v = 1f;
                BinaryPrimitives.WriteUInt16LittleEndian(dest.Slice(OffBlendShapes + i * 2, 2), (ushort)Math.Round(v * 65535f));
            }
            BinaryPrimitives.WriteSingleLittleEndian(dest.Slice(OffRotation, 4), frame.Rx);
            BinaryPrimitives.WriteSingleLittleEndian(dest.Slice(OffRotation + 4, 4), frame.Ry);
            BinaryPrimitives.WriteSingleLittleEndian(dest.Slice(OffRotation + 8, 4), frame.Rz);
            BinaryPrimitives.WriteSingleLittleEndian(dest.Slice(OffRotation + 12, 4), frame.Rw);
            BinaryPrimitives.WriteSingleLittleEndian(dest.Slice(OffPosition, 4), frame.Px);
            BinaryPrimitives.WriteSingleLittleEndian(dest.Slice(OffPosition + 4, 4), frame.Py);
            BinaryPrimitives.WriteSingleLittleEndian(dest.Slice(OffPosition + 8, 4), frame.Pz);
            return FaceProtocol.FrameByteLength;
        }
    }
}
`;

  const swift = `// ${HEADER_LINE}
// Regenerate: pnpm --filter @murmur/face-protocol generate
import Foundation

public enum FaceProtocol {
    public static let version: UInt8 = ${protocolVersion}
    public static let blendShapeCount = ${count}
    public static let frameByteLength = ${wire.byteLength}
    public static let magic: [UInt8] = [0x4D, 0x46] // "MF"
}

public enum TrackingState: UInt8, CaseIterable {
${trackingStates.map((t, i) => `    case ${t} = ${i}`).join('\n')}
}

/// ARKit ARFaceAnchor.BlendShapeLocation 순서와 동일한 정규 순서.
public enum BlendShape: Int, CaseIterable {
${blendShapeNames.map((n, i) => `    case ${n} = ${i}`).join('\n')}

    /// ARKit의 BlendShapeLocation raw value. 이름이 동일하다.
    public var arkitKey: String {
        switch self {
${blendShapeNames.map((n) => `        case .${n}: return "${n}"`).join('\n')}
        }
    }
}
`;

  const kt = `// ${HEADER_LINE}
// Regenerate: pnpm --filter @murmur/face-protocol generate
package app.murmur.faceprotocol

object FaceProtocol {
    const val VERSION: Int = ${protocolVersion}
    const val BLEND_SHAPE_COUNT: Int = ${count}
    const val FRAME_BYTE_LENGTH: Int = ${wire.byteLength}
    val MAGIC: ByteArray = byteArrayOf(0x4D, 0x46) // "MF"

    /**
     * MediaPipe Face Landmarker의 faceBlendshapes 카테고리는 index 0에 "_neutral"을 먼저 내고,
     * 그 뒤 52개가 ARKit과 같은 camelCase 이름·순서로 온다. 따라서 category index = ordinal + 1.
     */
    const val MEDIAPIPE_INDEX_OFFSET: Int = 1
}

enum class TrackingState(val code: Int) {
${trackingStates.map((t, i) => `    ${t.toUpperCase()}(${i}),`).join('\n')}
}

/** ARKit ARFaceAnchor.BlendShapeLocation 순서와 동일한 정규 순서. */
enum class BlendShape(val mediaPipeName: String) {
${blendShapeNames.map((n) => `    ${pascal(n)}("${n}"),`).join('\n')}
    ;

    /** MediaPipe faceBlendshapes 카테고리 배열에서의 index. */
    val mediaPipeIndex: Int get() = ordinal + FaceProtocol.MEDIAPIPE_INDEX_OFFSET
}
`;

  return {
    'blendShapes.ts': ts,
    'FaceProtocol.cs': cs,
    'FaceProtocol.swift': swift,
    'FaceProtocol.kt': kt,
  };
}

export function loadSchema(): Schema {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Schema;
}

export function writeGenerated(outDir: string): string[] {
  mkdirSync(outDir, { recursive: true });
  const files = render(loadSchema());
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(outDir, name), content);
  }
  return Object.keys(files);
}

/** dist/generated 가 schema와 일치하면 [] , 아니면 다른 파일 이름 목록. */
export function checkGenerated(): string[] {
  const tmp = mkdtempSync(join(tmpdir(), 'face-protocol-gen-'));
  try {
    const names = writeGenerated(tmp);
    const stale: string[] = [];
    for (const name of names) {
      const expected = readFileSync(join(tmp, name), 'utf8');
      const target = join(OUT_DIR, name);
      const actual = existsSync(target) ? readFileSync(target, 'utf8') : null;
      if (actual !== expected) stale.push(name);
    }
    return stale;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isMain) {
  if (process.argv.includes('--check')) {
    const stale = checkGenerated();
    if (stale.length > 0) {
      console.error(`생성물이 schema와 다릅니다: ${stale.join(', ')}. pnpm generate 를 실행하세요.`);
      process.exit(1);
    }
    console.log('face-protocol 생성물 최신 OK');
  } else {
    const names = writeGenerated(OUT_DIR);
    console.log(`face-protocol 생성 완료: ${names.join(', ')}`);
  }
}
