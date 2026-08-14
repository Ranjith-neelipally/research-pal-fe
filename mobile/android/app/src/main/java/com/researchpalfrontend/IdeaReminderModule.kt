package com.researchpalfrontend

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.os.Build
import android.text.format.DateFormat
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

private const val CHANNEL_ID = "quick_idea_reminders"
private const val PREFS = "quick_idea_reminders"

object IdeaReminderScheduler {
    fun schedule(context: Context, ideaId: String, text: String, times: List<Long>): IntArray {
        cancel(context, ideaId)
        val ids = times.mapIndexed { index, time ->
            val id = ("$ideaId:$index").hashCode() and 0x7fffffff
            val intent = Intent(context, IdeaReminderReceiver::class.java).apply {
                putExtra("notificationId", id); putExtra("ideaId", ideaId); putExtra("text", text)
            }
            val pending = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            if (Build.VERSION.SDK_INT >= 31 && alarm.canScheduleExactAlarms())
                alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pending)
            else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pending)
            id
        }.toIntArray()
        val record = JSONObject().put("text", text).put("times", JSONArray(times)).put("ids", JSONArray(ids.toList()))
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(ideaId, record.toString()).apply()
        return ids
    }

    fun cancel(context: Context, ideaId: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val record = prefs.getString(ideaId, null)
        if (record != null) {
            val ids = JSONObject(record).getJSONArray("ids")
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            for (i in 0 until ids.length()) {
                val id = ids.getInt(i)
                val pending = PendingIntent.getBroadcast(context, id, Intent(context, IdeaReminderReceiver::class.java), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
                if (pending != null) { alarm.cancel(pending); pending.cancel() }
                NotificationManagerCompat.from(context).cancel(id)
            }
        }
        prefs.edit().remove(ideaId).apply()
    }

    fun cancelAll(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        // Snapshot keys because cancel() removes each entry as it goes.
        prefs.all.keys.toList().forEach { ideaId -> cancel(context, ideaId) }
        prefs.edit().clear().apply()
    }
}

class IdeaReminderModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "IdeaReminder"

    @ReactMethod fun requestPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < 33 || ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            promise.resolve(true); return
        }
        val activity = reactContext.currentActivity ?: run { promise.resolve(false); return }
        ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7412)
        // Android owns the permission dialog; scheduling is safe even if the user declines.
        promise.resolve(true)
    }

    @ReactMethod fun pickTime(initialTime: String?, promise: Promise) {
        val activity = reactContext.currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Time picker requires an active screen")
            return
        }
        val parts = initialTime?.split(":")
        val initialHour = parts?.getOrNull(0)?.toIntOrNull() ?: 7
        val initialMinute = parts?.getOrNull(1)?.toIntOrNull() ?: 0
        activity.runOnUiThread {
            var settled = false
            val dialog = TimePickerDialog(
                activity,
                { _, hour, minute ->
                    if (!settled) {
                        settled = true
                        promise.resolve(String.format("%02d:%02d", hour, minute))
                    }
                },
                initialHour,
                initialMinute,
                DateFormat.is24HourFormat(activity),
            )
            dialog.setOnCancelListener {
                if (!settled) {
                    settled = true
                    promise.resolve(null)
                }
            }
            dialog.show()
        }
    }

    @ReactMethod fun schedule(ideaId: String, text: String, times: ReadableArray, promise: Promise) {
        val future = (0 until times.size()).map { times.getDouble(it).toLong() }.filter { it > System.currentTimeMillis() }
        val ids = IdeaReminderScheduler.schedule(reactContext, ideaId, text, future)
        val result = Arguments.createArray()
        ids.forEach { result.pushInt(it) }
        promise.resolve(result)
    }

    @ReactMethod fun cancel(ideaId: String, promise: Promise) { IdeaReminderScheduler.cancel(reactContext, ideaId); promise.resolve(null) }

    @ReactMethod fun cancelAll(promise: Promise) { IdeaReminderScheduler.cancelAll(reactContext); promise.resolve(null) }
}

class IdeaReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra("notificationId", 0)
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val content = PendingIntent.getActivity(context, id, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher).setContentTitle("Quick Idea")
            .setContentText(intent.getStringExtra("text") ?: "").setStyle(NotificationCompat.BigTextStyle().bigText(intent.getStringExtra("text") ?: ""))
            .setAutoCancel(true).setContentIntent(content).setPriority(NotificationCompat.PRIORITY_HIGH).build()
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < 33)
            NotificationManagerCompat.from(context).notify(id, notification)
    }
}

class IdeaReminderBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.all.forEach { (ideaId, value) ->
            try {
                val record = JSONObject(value as String); val jsonTimes = record.getJSONArray("times")
                val times = (0 until jsonTimes.length()).map { jsonTimes.getLong(it) }.filter { it > System.currentTimeMillis() }
                if (times.isEmpty()) prefs.edit().remove(ideaId).apply()
                else IdeaReminderScheduler.schedule(context, ideaId, record.getString("text"), times)
            } catch (_: Exception) { prefs.edit().remove(ideaId).apply() }
        }
    }
}
