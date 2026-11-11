package com.murmur

import android.util.AtomicFile
import com.facebook.react.bridge.*
import java.io.File

/** Private, backup-excluded storage. Never sent to the AI service. */
class MoodStoreModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "MurmurMoodStore"
  private val file = AtomicFile(File(context.noBackupFilesDir, "moods.json"))

  @ReactMethod
  fun read(promise: Promise) {
    try {
      promise.resolve(if (file.baseFile.exists()) String(file.readFully(), Charsets.UTF_8) else null)
    } catch (e: Exception) { promise.reject("E_MOOD_READ", "Could not read records", e) }
  }

  @ReactMethod
  fun write(value: String, promise: Promise) {
    var stream: java.io.FileOutputStream? = null
    try {
      stream = file.startWrite()
      stream.write(value.toByteArray(Charsets.UTF_8))
      file.finishWrite(stream)
      promise.resolve(null)
    } catch (e: Exception) {
      file.failWrite(stream)
      promise.reject("E_MOOD_WRITE", "Could not save records", e)
    }
  }
}
