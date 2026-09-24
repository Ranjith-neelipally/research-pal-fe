package com.researchpalfrontend

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                add(DeviceStoragePackage())
                add(IdeaReminderPackage())
                add(PhotoUploadSchedulerPackage())
            },
        )
    }

    override fun onCreate() {
        super.onCreate()

        loadReactNative(this)

        if (android.os.Build.VERSION.SDK_INT >= 26) {
            val channel = android.app.NotificationChannel("quick_idea_reminders", "Quick Idea reminders", android.app.NotificationManager.IMPORTANCE_HIGH)
            getSystemService(android.app.NotificationManager::class.java).createNotificationChannel(channel)
            val uploadChannel = android.app.NotificationChannel("photo_uploads", "Photo uploads", android.app.NotificationManager.IMPORTANCE_DEFAULT)
            getSystemService(android.app.NotificationManager::class.java).createNotificationChannel(uploadChannel)
        }
    }
}
