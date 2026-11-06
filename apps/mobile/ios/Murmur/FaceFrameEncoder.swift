import Foundation
import simd

/// face-protocol v1 바이너리 인코더 (packages/face-protocol/schema/face-frame.schema.json "wire" 참고).
/// 144바이트, little-endian:
///   [0..1]   magic 'M','F'
///   [2]      version u8
///   [3]      tracking u8 (TrackingState rawValue)
///   [4..11]  timestampMs f64
///   [12..115] blendShapes u16[52]  (0..65535 ↔ 0.0..1.0, 클램프)
///   [116..131] rotation f32[4] x,y,z,w
///   [132..143] position f32[3] x,y,z
enum FaceFrameEncoder {
    static func encode(
        timestampMs: Double,
        tracking: TrackingState,
        blendShapes: [Float],
        rotation: simd_quatf,
        position: SIMD3<Float>
    ) -> Data {
        precondition(blendShapes.count == FaceProtocol.blendShapeCount, "blendShapes must have 52 entries")
        var data = Data(count: FaceProtocol.frameByteLength)
        data.withUnsafeMutableBytes { (raw: UnsafeMutableRawBufferPointer) in
            raw[0] = FaceProtocol.magic[0]
            raw[1] = FaceProtocol.magic[1]
            raw[2] = FaceProtocol.version
            raw[3] = tracking.rawValue
            raw.storeBytes(of: timestampMs.bitPattern.littleEndian, toByteOffset: 4, as: UInt64.self)
            var offset = 12
            for v in blendShapes {
                let clamped: Float = v.isNaN ? 0 : min(max(v, 0), 1)
                let q = UInt16((clamped * 65535).rounded())
                raw.storeBytes(of: q.littleEndian, toByteOffset: offset, as: UInt16.self)
                offset += 2
            }
            let floats: [Float] = [
                rotation.imag.x, rotation.imag.y, rotation.imag.z, rotation.real,
                position.x, position.y, position.z,
            ]
            for f in floats {
                raw.storeBytes(of: f.bitPattern.littleEndian, toByteOffset: offset, as: UInt32.self)
                offset += 4
            }
        }
        return data
    }
}
