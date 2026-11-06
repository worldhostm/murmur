package com.murmur.facetracker

import kotlin.math.sqrt

/** 머리 포즈: 단위 쿼터니언 + 카메라 기준 위치(m). */
data class HeadPose(
  val qx: Float, val qy: Float, val qz: Float, val qw: Float,
  val px: Float, val py: Float, val pz: Float,
) {
  companion object {
    val IDENTITY = HeadPose(0f, 0f, 0f, 1f, 0f, 0f, -0.5f)

    /**
     * MediaPipe facialTransformationMatrix(열 우선 4x4, 단위 cm)에서 쿼터니언과 위치(m)를 만든다.
     * 회전 추출은 Shepperd 방식. 결과는 정규화한다.
     */
    fun fromColumnMajor(m: FloatArray): HeadPose {
      require(m.size == 16) { "4x4 matrix expected" }
      // 열 우선: m[col*4 + row]
      val r00 = m[0]; val r10 = m[1]; val r20 = m[2]
      val r01 = m[4]; val r11 = m[5]; val r21 = m[6]
      val r02 = m[8]; val r12 = m[9]; val r22 = m[10]
      val tx = m[12] / 100f; val ty = m[13] / 100f; val tz = m[14] / 100f

      val trace = r00 + r11 + r22
      var x: Float; var y: Float; var z: Float; var w: Float
      if (trace > 0f) {
        val s = sqrt(trace + 1f) * 2f
        w = 0.25f * s; x = (r21 - r12) / s; y = (r02 - r20) / s; z = (r10 - r01) / s
      } else if (r00 > r11 && r00 > r22) {
        val s = sqrt(1f + r00 - r11 - r22) * 2f
        w = (r21 - r12) / s; x = 0.25f * s; y = (r01 + r10) / s; z = (r02 + r20) / s
      } else if (r11 > r22) {
        val s = sqrt(1f + r11 - r00 - r22) * 2f
        w = (r02 - r20) / s; x = (r01 + r10) / s; y = 0.25f * s; z = (r12 + r21) / s
      } else {
        val s = sqrt(1f + r22 - r00 - r11) * 2f
        w = (r10 - r01) / s; x = (r02 + r20) / s; y = (r12 + r21) / s; z = 0.25f * s
      }
      val n = sqrt(x * x + y * y + z * z + w * w)
      if (n == 0f || n.isNaN()) return IDENTITY.copy(px = tx, py = ty, pz = tz)
      return HeadPose(x / n, y / n, z / n, w / n, tx, ty, tz)
    }
  }
}
