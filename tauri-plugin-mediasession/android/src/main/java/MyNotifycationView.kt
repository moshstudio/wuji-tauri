import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import snow.player.PlayerService.MediaNotificationView
import tauri.plugin.mediasession.R


class MyMediaNotificationView : MediaNotificationView() {
    private var mContentIntent: PendingIntent? = null
    override fun onInit(context: Context?) {
        super.onInit(context)
        val intent =
                Intent().apply {
                    setClassName("com.wuji_app.app", "com.wuji_app.app.MainActivity")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
        mContentIntent =
                PendingIntent.getActivity(
                        context?.applicationContext,
                        0,
                        intent,
                        PendingIntent.FLAG_IMMUTABLE
                )
    }

    override fun onBuildNotification(builder: NotificationCompat.Builder?) {
        super.onBuildNotification(builder)
        addStopPlay(builder);
        builder?.setContentIntent(mContentIntent)
        builder?.foregroundServiceBehavior = NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE
    }

    private fun addStopPlay(builder: NotificationCompat.Builder?) {
        builder?.addAction(
            R.drawable.ic_stop,
            "stop play",
            doShutdown()
        )
    }

    override fun getNotificationId(): Int {
        return super.getNotificationId()
    }
}
