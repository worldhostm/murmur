package com.murmur.facetracker

import app.murmur.faceprotocol.FaceProtocol
import app.murmur.faceprotocol.TrackingState
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * face-protocol v1 바이너리 인코더 (144 bytes, little-endian).
 * 레이아웃은 packages/face-protocol/schema/face-frame.schema.json 과 같아야 한다.
 *   magic 'M','F' | version u8 | tracking u8 | timestampMs f64 | 52 × u16 (0..1 양자화) | quat x,y,z,w f32 | pos x,y,z f32
 */
class FaceFrameEncoder {
  private val buffer: ByteBuffer = ByteBuffer.allocate(FaceProtocol.FRAME_BYTE_LENGTH).order(ByteOrder.LITTLE_ENDIAN)

  fun encode(
    timestampMs: Double,
    tracking: TrackingState,
    blendShapes: FloatArray,
    qx: Float, qy: Float, qz: Float, qw: Float,
    px: Float, py: Float, pz: Float,
  ): ByteArray {
    require(blendShapes.size == FaceProtocol.BLEND_SHAPE_COUNT) { "blendShapes must have ${FaceProtocol.BLEND_SHAPE_COUNT} entries" }
    val b = buffer
    b.clear()
    b.put(FaceProtocol.MAGIC[0]).put(FaceProtocol.MAGIC[1])
    b.put(FaceProtocol.VERSION.toByte())
    b.put(tracking.code.toByte())
    b.putDouble(timestampMs)
    for (v in blendShapes) {
      val c = if (v.isNaN() || v < 0f) 0f else if (v > 1f) 1f else v
      b.putShort(Math.round(c * 65535f).toShort())
    }
    b.putFloat(qx).putFloat(qy).putFloat(qz).putFloat(qw)
    b.putFloat(px).putFloat(py).putFloat(pz)
    return b.array().copyOf()
  }
}
