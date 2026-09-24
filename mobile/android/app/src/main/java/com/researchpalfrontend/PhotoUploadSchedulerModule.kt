package com.researchpalfrontend

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class PhotoUploadSchedulerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "PhotoUploadScheduler"

    @ReactMethod
    fun getConditions(promise: Promise) {
        val map = Arguments.createMap()
        map.putBoolean("isUnmetered", isUnmetered(reactContext))
        map.putBoolean("isCharging", isCharging(reactContext))
        promise.resolve(map)
    }

    @ReactMethod
    fun schedule(wifiOnly: Boolean, chargingOnly: Boolean, promise: Promise) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
            .setRequiresCharging(chargingOnly)
            .build()
        val request = OneTimeWorkRequestBuilder<PhotoUploadWorker>()
            .setConstraints(constraints)
            .build()
        WorkManager.getInstance(reactContext).enqueueUniqueWork(
            "researchpal-photo-upload",
            ExistingWorkPolicy.KEEP,
            request,
        )
        promise.resolve(null)
    }

    private fun isCharging(context: Context): Boolean {
        val battery = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return battery.isCharging
    }

    private fun isUnmetered(context: Context): Boolean {
        val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivity.activeNetwork ?: return false
        val capabilities = connectivity.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }
}

class PhotoUploadSchedulerPackage : com.facebook.react.ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext) =
        listOf(PhotoUploadSchedulerModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext) =
        emptyList<com.facebook.react.uimanager.ViewManager<*, *>>()
}

class PhotoUploadWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val intent = Intent(applicationContext, PhotoUploadHeadlessService::class.java)
        applicationContext.startService(intent)
        HeadlessJsTaskService.acquireWakeLockNow(applicationContext)
        return Result.success()
    }
}

class PhotoUploadHeadlessService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
        HeadlessJsTaskConfig(
            "PhotoUploadWorker",
            Arguments.createMap(),
            120000,
            true,
        )
}
