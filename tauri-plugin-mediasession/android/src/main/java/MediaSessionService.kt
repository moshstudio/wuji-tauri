package tauri.plugin.mediasession

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import androidx.media.session.MediaButtonReceiver
import java.util.Arrays
import java.util.HashSet

class MediaSessionService : Service() {
    companion object {
        private const val TAG = "MediaSessionService"
        private const val NOTIFICATION_ID = 1
    }

    private var mediaSession: MediaSessionCompat? = null
    private var playbackStateBuilder: PlaybackStateCompat.Builder? = null
    private var mediaMetadataBuilder: MediaMetadataCompat.Builder? = null
    private var notificationManager: NotificationManager? = null
    private var notificationBuilder: NotificationCompat.Builder? = null
    private var notificationStyle: MediaStyle? = null
    private val notificationActions = mutableMapOf<String, NotificationCompat.Action>()
    private val playbackStateActions = mutableMapOf<String, Long>()
    private val possibleActions = arrayOf(
        "previoustrack",
        "seekbackward",
        "play",
        "pause",
        "seekforward",
        "nexttrack",
        "seekto",
        "stop"
    )
    private val possibleCompactViewActions = HashSet(
        listOf(
            "previoustrack", "play", "pause", "nexttrack", "stop"
        )
    )

    var playbackState: Int = PlaybackStateCompat.STATE_NONE
        set(value) {
            if (field != value) {
                field = value
                playbackStateUpdate = true
                possibleActionsUpdate = true
            }
        }
    var title: String = ""
        set(value) {
            if (field != value) {
                field = value
                mediaMetadataUpdate = true
                notificationUpdate = true
            }
        }
    var artist: String = ""
        set(value) {
            if (field != value) {
                field = value
                mediaMetadataUpdate = true
                notificationUpdate = true
            }
        }
    var album: String = ""
        set(value) {
            if (field != value) {
                field = value
                mediaMetadataUpdate = true
                notificationUpdate = true
            }
        }
    var cover: Bitmap? = null
        set(value) {
            if (field != value) {
                field = value
                mediaMetadataUpdate = true
                notificationUpdate = true
            }
        }

    var duration: Long = 0
        set(value) {
            if (field != value) {
                field = value
                mediaMetadataUpdate = true
                notificationUpdate = true
            }
        }
    var position: Long = 0
        set(value) {
            if (field != value) {
                field = value
                playbackStateUpdate = true
            }
        }
    var playbackSpeed: Float = 1.0F
        set(value) {
            if (field != value) {
                field = value
                playbackStateUpdate = true
            }
        }

    private var possibleActionsUpdate = true
    private var playbackStateUpdate = false
    private var mediaMetadataUpdate = false
    private var notificationUpdate = false

    private var plugin: MediaSessionPlugin? = null
    private var callback: MediaSessionCallback? = null

    private val binder = LocalBinder()

    inner class LocalBinder : Binder() {
        fun getService(): MediaSessionService = this@MediaSessionService
    }

    override fun onBind(intent: Intent): IBinder {
        return binder
    }

    override fun onUnbind(intent: Intent?): Boolean {
        this.onDestroy()
        return super.onUnbind(intent)
    }

    @SuppressLint("WrongConstant")
    fun connectAndInitialize(plugin: MediaSessionPlugin, intent: Intent) {
        this.plugin = plugin

        mediaSession = MediaSessionCompat(this, "WebViewMediaSession").apply {
            setCallback(MediaSessionCallback(plugin))
            isActive = true
        }


        playbackStateBuilder = PlaybackStateCompat.Builder()
            .setActions(PlaybackStateCompat.ACTION_PLAY)
            .setState(PlaybackStateCompat.STATE_PAUSED, position, playbackSpeed)
        mediaSession?.setPlaybackState(playbackStateBuilder?.build())

        mediaMetadataBuilder = MediaMetadataCompat.Builder()
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration)
        mediaSession?.setMetadata(mediaMetadataBuilder?.build())

        notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "playback",
                "Playback",
                NotificationManager.IMPORTANCE_LOW
            )
            notificationManager?.createNotificationChannel(channel)
        }

        notificationStyle = MediaStyle().setMediaSession(mediaSession?.sessionToken)
        notificationBuilder = NotificationCompat.Builder(this, "playback")
            .setStyle(notificationStyle)
            .setSmallIcon(R.drawable.ic_baseline_volume_up_24)
            .setContentIntent(
                PendingIntent.getActivity(
                    applicationContext,
                    0,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE
                )
            )
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            notificationBuilder?.build()?.let {
                startForeground(
                    NOTIFICATION_ID,
                    it,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                )
            }
        } else {
            startForeground(NOTIFICATION_ID, notificationBuilder?.build())
        }

        notificationActions["play"] = NotificationCompat.Action(
            R.drawable.ic_baseline_play_arrow_24,
            "Play",
            MediaButtonReceiver.buildMediaButtonPendingIntent(
                this,
                (PlaybackStateCompat.ACTION_PLAY)
            )
        )
        notificationActions["pause"] = NotificationCompat.Action(
            R.drawable.ic_baseline_pause_24,
            "Pause",
            MediaButtonReceiver.buildMediaButtonPendingIntent(
                this,
                (PlaybackStateCompat.ACTION_PLAY_PAUSE)
            )
        )
        notificationActions["seekbackward"] = NotificationCompat.Action(
            R.drawable.ic_baseline_replay_30_24,
            "Previous Track",
            MediaButtonReceiver.buildMediaButtonPendingIntent(
                this,
                PlaybackStateCompat.ACTION_REWIND
            )
        )
        notificationActions["seekforward"] = NotificationCompat.Action(
            R.drawable.ic_baseline_forward_30_24,
            "Next Track",
            MediaButtonReceiver.buildMediaButtonPendingIntent(
                this,
                PlaybackStateCompat.ACTION_FAST_FORWARD
            )
        )
        notificationActions["previoustrack"] = NotificationCompat.Action(
            R.drawable.ic_baseline_skip_previous_24,
            "Previous Track",
            MediaButtonReceiver.buildMediaButtonPendingIntent(
                this,
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            )
        )
        notificationActions["nexttrack"] = NotificationCompat.Action(
            R.drawable.ic_baseline_skip_next_24,
            "Next Track",
            MediaButtonReceiver.buildMediaButtonPendingIntent(
                this,
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            )
        )
        notificationActions["stop"] = NotificationCompat.Action(
            R.drawable.ic_baseline_stop_24,
            "Stop",
            MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_STOP)
        )

        playbackStateActions["previoustrack"] = PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
        playbackStateActions["seekbackward"] = PlaybackStateCompat.ACTION_REWIND
        playbackStateActions["play"] =
            (PlaybackStateCompat.ACTION_PLAY_PAUSE or PlaybackStateCompat.ACTION_PLAY).toLong()
        playbackStateActions["pause"] =
            (PlaybackStateCompat.ACTION_PLAY_PAUSE or PlaybackStateCompat.ACTION_PAUSE).toLong()
        playbackStateActions["seekforward"] = PlaybackStateCompat.ACTION_FAST_FORWARD
        playbackStateActions["nexttrack"] = PlaybackStateCompat.ACTION_SKIP_TO_NEXT
        playbackStateActions["seekto"] = PlaybackStateCompat.ACTION_SEEK_TO
        playbackStateActions["stop"] = PlaybackStateCompat.ACTION_STOP
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(true)
        stopSelf()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            MediaButtonReceiver.handleIntent(mediaSession, it)
        }
        return super.onStartCommand(intent, flags, startId)
    }


    @SuppressLint("RestrictedApi")
    fun update() {
        if (possibleActionsUpdate) {
            notificationBuilder?.mActions?.clear()

            var activePlaybackStateActions: Long = 0
            val activeCompactViewActionIndices = IntArray(3)

            var notificationActionIndex = 0
            var compactNotificationActionIndicesIndex = 0
            for (actionName in possibleActions) {
                if (plugin?.hasActionHandler(actionName) == true) {
                    if (actionName == "play" && playbackState != PlaybackStateCompat.STATE_PAUSED) {
                        continue
                    }
                    if (actionName == "pause" && playbackState != PlaybackStateCompat.STATE_PLAYING) {
                        continue
                    }

                    playbackStateActions[actionName]?.let {
                        activePlaybackStateActions = activePlaybackStateActions or it
                    }

                    notificationActions[actionName]?.let { action ->
                        notificationBuilder?.addAction(action)
                        if (possibleCompactViewActions.contains(actionName) && compactNotificationActionIndicesIndex < 3) {
                            activeCompactViewActionIndices[compactNotificationActionIndicesIndex] =
                                notificationActionIndex
                            compactNotificationActionIndicesIndex++
                        }
                        notificationActionIndex++
                    }
                }
            }

            playbackStateBuilder?.setActions(activePlaybackStateActions)
            if (compactNotificationActionIndicesIndex > 0) {
                notificationStyle?.setShowActionsInCompactView(
                    *Arrays.copyOfRange(
                        activeCompactViewActionIndices,
                        0,
                        compactNotificationActionIndicesIndex
                    )
                )
            } else {
                notificationStyle?.setShowActionsInCompactView()
            }

            possibleActionsUpdate = false
            playbackStateUpdate = true
            notificationUpdate = true
        }

        if (playbackStateUpdate) {
            playbackStateBuilder?.setState(this.playbackState, this.position, this.playbackSpeed)
            mediaSession?.setPlaybackState(playbackStateBuilder?.build())
            playbackStateUpdate = false
        }

        if (mediaMetadataUpdate) {
            mediaMetadataBuilder?.apply {
                putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
                putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, cover)
                putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration)
            }
            mediaSession?.setMetadata(mediaMetadataBuilder?.build())
            mediaMetadataUpdate = false
        }

        if (notificationUpdate) {
            notificationBuilder?.apply {
                setContentTitle(title)
                setContentText(
                    when {
                        album.isBlank() -> artist
                        else -> "$artist - $album"
                    }
                )
                setLargeIcon(cover)
            }
            notificationManager?.notify(NOTIFICATION_ID, notificationBuilder?.build())
            notificationUpdate = false
        }
    }

    fun updatePossibleActions() {
        this.possibleActionsUpdate = true
        this.update()
    }
}