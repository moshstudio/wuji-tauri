package tauri.plugin.mediasession

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.IBinder
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Base64
import android.util.Log
import android.webkit.WebView
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

typealias PluginCall = (params: String?) -> Unit

@InvokeArg
class PlayMusicItem {
    lateinit var title: String
    var artist: String? = null
    var album: String? = null
    var cover: String? = null
}

@InvokeArg
class PlaybackStateArgs {
    lateinit var state: String // "playing"|"paused"|"stopped"
}

@InvokeArg
class PositionStateArgs {
    var duration: Double? = null
    var position: Double? = null
    var playbackRate: Double? = null
}


@TauriPlugin(
    permissions = [
        Permission(strings = [Manifest.permission.FOREGROUND_SERVICE], alias = "foregroundService"),
        Permission(
            strings = [Manifest.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK],
            alias = "foregroundServiceMediaPlayback"
        ),
        Permission(strings = [Manifest.permission.WAKE_LOCK], alias = "wakeLock"),
    ]
)
class MediaSessionPlugin(private val activity: Activity) : Plugin(activity) {
    private val TAG = "MediaSessionPlugin"

    private var startServiceOnlyDuringPlayback = true

    private var title = ""
    private var artist = ""
    private var album = ""
    private var cover: Bitmap? = null
    private var playbackState = "none"
    private var duration = 0.0
    private var position = 0.0
    private var playbackRate = 1.0
    private val actionHandlers = mutableMapOf<String, PluginCall>()

    private var service: MediaSessionService? = null

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(componentName: ComponentName, iBinder: IBinder) {
            val binder = iBinder as MediaSessionService.LocalBinder
            service = binder.getService()
            val intent = Intent(activity, activity!!.javaClass)
            service?.connectAndInitialize(this@MediaSessionPlugin, intent)
            updateServiceMetadata()
            updateServicePlaybackState()
            updateServicePositionState()
        }

        override fun onServiceDisconnected(componentName: ComponentName) {
            Log.d(TAG, "Disconnected from MediaSessionService")
        }
    }

    override fun load(webView: WebView) {
        super.load(webView)
        startServiceOnlyDuringPlayback = true
        if (!startServiceOnlyDuringPlayback) {
            startMediaService()
        }
        for (actionName in listOf(
            "play",
            "pause",
            "seekto",
            "seekbackward",
            "seekforward",
            "previoustrack",
            "nexttrack",
            "stop"
        )) {
            setActionHandler(actionName) { params ->
                trigger(actionName, JSObject().apply {
                    put("value", params)
                })
            }
        }
    }

    fun startMediaService() {
        val intent = Intent(activity, MediaSessionService::class.java)
        ContextCompat.startForegroundService(activity, intent)
        activity.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
    }

    private fun updateServiceMetadata() {
        service?.let {
            it.title = title
            it.artist = artist
            it.album = album
            it.cover = cover
            it.update()
        }
    }

    @Throws(IOException::class)
    private fun urlToBitmap(url: String): Bitmap? {
        Log.e("urlToBitmap", url)
        val blobUrl = url.startsWith("blob:")
        if (blobUrl) {
            Log.i(TAG, "Converting Blob URLs to Bitmap for media artwork is not yet supported")
        }

        val httpUrl = url.startsWith("http")
        if (httpUrl) {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.doInput = true
            connection.connect()
            val inputStream: InputStream = connection.inputStream
            return BitmapFactory.decodeStream(inputStream)
        }

        val fileUrl = url.startsWith("file")
        if (fileUrl) {
            val cacheDir = activity.cacheDir
            val relativePath = url.substring("file://".length)
            val file = File(cacheDir, relativePath)
            Log.e(TAG, "$cacheDir $relativePath")
            return BitmapFactory.decodeFile(file.absolutePath)
        }

        val base64Index = url.indexOf(";base64,")
        if (base64Index != -1) {
            val base64Data = url.substring(base64Index + 8)
            val decoded = Base64.decode(base64Data, Base64.DEFAULT)
            return BitmapFactory.decodeByteArray(decoded, 0, decoded.size)
        }

        return null
    }

    @Command
    fun setMetadata(invoke: Invoke) {
        val args = invoke.parseArgs(PlayMusicItem::class.java)
        title = args.title ?: title
        artist = args.artist ?: artist
        album = args.album ?: album
        if (args.cover != null) {
            cover = urlToBitmap(args.cover!!)
        }
        if (service != null) updateServiceMetadata()
        invoke.resolve(JSObject().apply {
            put("value", true)
        })
    }

    private fun updateServicePlaybackState() {
        when (playbackState) {
            "playing" -> {
                service?.playbackState = PlaybackStateCompat.STATE_PLAYING
                service?.update()
            }
            "paused" -> {
                service?.playbackState = PlaybackStateCompat.STATE_PAUSED
                service?.update()
            }
            else -> {
                service?.playbackState = PlaybackStateCompat.STATE_NONE
                service?.update()
            }
        }
    }

    @Command
    fun setPlaybackState(invoke: Invoke) {
        val args = invoke.parseArgs(PlaybackStateArgs::class.java)
        playbackState = args.state

        val playback = playbackState == "playing" || playbackState == "paused"
        if (startServiceOnlyDuringPlayback) {
            when {
                service == null && playback -> startMediaService()
                service != null && !playback -> {
                    activity.unbindService(serviceConnection)
                    service = null
                }

                else -> updateServicePlaybackState()
            }
        } else if (service != null) {
            updateServicePlaybackState()
        }
        invoke.resolve(JSObject().apply {
            put("value", true)
        })
    }

    private fun updateServicePositionState() {
        service?.let {
            it.duration = (duration * 1000).toLong()
            it.position = (position * 1000).toLong()
            val playbackSpeed = if (playbackRate == 0.0) 1.0f else playbackRate.toFloat()
            it.playbackSpeed = playbackSpeed
            it.update()
        }
    }

    @Command
    fun setPositionState(invoke: Invoke) {
        val args = invoke.parseArgs(PositionStateArgs::class.java)
        duration = args.duration ?: 0.0
        position = args.position ?: 0.0
        playbackRate = args.playbackRate ?: 1.0

        if (service != null) updateServicePositionState()
        invoke.resolve(JSObject().apply {
            put("value", true)
        })
    }

    fun setActionHandler(actionName: String, call: PluginCall) {
        actionHandlers[actionName] = call
        if (service != null) service?.updatePossibleActions()
    }

    fun hasActionHandler(action: String): Boolean {
        return actionHandlers.containsKey(action)
    }

    fun actionCallback(action: String, params: String? = null) {
        val call = actionHandlers[action]
        if (call != null) {
            call(params)
        } else {
            Log.d(TAG, "No handler for action $action")
        }
    }
}