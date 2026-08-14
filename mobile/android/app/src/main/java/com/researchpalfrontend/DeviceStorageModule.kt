package com.researchpalfrontend

import android.os.Environment
import android.os.StatFs
import android.content.ContentValues
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceStorageModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceStorage"

    @ReactMethod
    fun getStorageInfo(promise: Promise) {
        try {
            val stat = StatFs(Environment.getDataDirectory().absolutePath)
            val result = com.facebook.react.bridge.Arguments.createMap().apply {
                putDouble("totalSpace", stat.totalBytes.toDouble())
                putDouble("freeSpace", stat.availableBytes.toDouble())
            }
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("STORAGE_INFO_UNAVAILABLE", "Unable to read device storage", error)
        }
    }

    @ReactMethod
    fun saveToDownloads(fileName: String, mimeType: String, base64Data: String, promise: Promise) {
        try {
            val resolver = reactApplicationContext.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Unable to create Downloads entry")
            try {
                resolver.openOutputStream(uri)?.use { it.write(Base64.decode(base64Data, Base64.DEFAULT)) }
                    ?: throw IllegalStateException("Unable to open Downloads output stream")
                values.clear(); values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
                promise.resolve(uri.toString())
            } catch (error: Exception) {
                resolver.delete(uri, null, null)
                throw error
            }
        } catch (error: Exception) {
            promise.reject("DOWNLOAD_SAVE_FAILED", "Unable to publish file to Downloads", error)
        }
    }
}
