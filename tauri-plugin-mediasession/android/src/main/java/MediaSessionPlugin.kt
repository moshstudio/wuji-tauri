package tauri.plugin.mediasession

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import androidx.annotation.RequiresApi
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import snow.player.PlayMode
import snow.player.Player
import snow.player.PlayerClient
import snow.player.audio.MusicItem
import snow.player.playlist.Playlist
import snow.player.util.LiveProgress
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

@InvokeArg
class PlayMusicItem {
    lateinit var id: String
    lateinit var title: String
    var artist: String? = null
    var album: String? = null
    var duration: Int? = null
    lateinit var uri: String
    var forbidSeek: Boolean? = null
    var iconUri: String? = null
    var extra: String? = null
}

@InvokeArg
class PlaylistArgs {
    lateinit var name: String
    lateinit var musics: List<PlayMusicItem>
    var position: Int? = null
    var extra: String? = null
    var playImmediately: Boolean? = null
}

@InvokeArg
class UpdateMusicItemArgs {
    lateinit var oldItem: PlayMusicItem;
    lateinit var newItem: PlayMusicItem;
}

@InvokeArg
class VolumeArgs {
    var volume: Number? = null
}

@InvokeArg
class SeekToArgs {
    var milliseconds: Number? = null
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
    private var inited = false
    private lateinit var wv: WebView
    private lateinit var playerClient: PlayerClient
    private lateinit var liveProgress: LiveProgress

    private val receiver: BroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val command = intent.getStringExtra("action_name")
            Log.e("MediaSessionPlugin", "Received broadcast: $command")
            if ("getUrl" == command) {
                val data = intent.getBundleExtra("musicItem")
                val ret = JSObject()
                if (data != null) {
                    val item = bundleToMusicItem(data)
                    if (item != null) {
                        Log.e("MediaSessionPlugin", "send  ${MusicItemToJSON(item).toString()}")
                        ret.put("value", MusicItemToJSON(item).toString())
                        trigger("getUrl", ret)
                    }
                }
            }
        }
    }

    override fun load(webView: WebView) {
        super.load(webView)
        wv = webView
        init()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        init()
    }

    private fun init() {
        if (inited) {
            return
        }
        inited = true
        this.activity.apply {
            // 1.创建PlayerClient
            try {
                // 创建一个 PlayerClient 对象
                playerClient = PlayerClient.newInstance(this, MyPlayerService::class.java)
                playerClient.playMode = PlayMode.LOOP
                addCallbacks()
            } catch (e: Exception) {
                Log.e("MediaSessionPlugin", "Failed to create PlayerClient", e)
            }
            //2. 接收广播
            try {
                LocalBroadcastManager.getInstance(this).registerReceiver(
                    receiver, IntentFilter(localBroadcastPlugin)
                )
            } catch (e: Exception) {
                Log.e("MediaSessionPlugin", "Failed to receive broadcast", e)
            }

        }
    }

    private fun addCallbacks() {
        liveProgress = LiveProgress(
            playerClient
        ) { progressSec, durationSec, textProgress, textDuration ->
            // 该方法会在实时播放进度更新时调用。实时播放进度每秒更新一次。
            // 参数说明：
            // progressSec ：当前播放进度，单位：秒
            // durationSec ：歌曲的持续时长，单位：秒
            // textProgress：字符串格式的播放进度，格式为：00:00
            // textDuration：字符串格式的歌曲的持续时长，格式为：00:00
            val ret = JSObject()
            ret.put("progress", progressSec)
            ret.put("duration", durationSec)
            ret.put("textProgress", textProgress)
            ret.put("textDuration", textDuration)
            trigger("progress", ret)
        };
        playerClient.playMode = PlayMode.LOOP
        val playbackStateChangeListener: Player.OnPlaybackStateChangeListener =
            object : Player.OnPlaybackStateChangeListener {
                override fun onPlay(
                    stalled: Boolean, playProgress: Int, playProgressUpdateTime: Long
                ) {
                    trigger("play", JSObject())
                    liveProgress.subscribe()
                    activity.apply {
                        val serviceIntent = Intent(this, MyPlayerService::class.java)
                        startService(serviceIntent);
                        // 如果你使用的是 Android 8.0 (API 26) 及以上版本，建议使用 startForegroundService
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(serviceIntent);
                        } else {
                            startService(serviceIntent);
                        }
                    }
                }

                override fun onPause(playProgress: Int, updateTime: Long) {
                    trigger("pause", JSObject())
                    liveProgress.unsubscribe()
                }

                override fun onStop() {
                    trigger("stop", JSObject())
                    liveProgress.unsubscribe()
                    activity.apply {
                        val serviceIntent = Intent(this, MyPlayerService::class.java)
                        startService(serviceIntent);
                        // 如果你使用的是 Android 8.0 (API 26) 及以上版本，建议使用 startForegroundService
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            stopService(serviceIntent);
                        } else {
                            stopService(serviceIntent);
                        }
                    }
                }

                override fun onError(errorCode: Int, errorMessage: String?) {
                    Log.i("MediaSessionPlugin", "play onError: $errorCode, $errorMessage")
                    liveProgress.unsubscribe()
                }
            }
        // 添加监听器：播放状态的变化
        playerClient.addOnPlaybackStateChangeListener(playbackStateChangeListener)

        val playingMusicItemChangeListener: Player.OnPlayingMusicItemChangeListener =
            Player.OnPlayingMusicItemChangeListener { musicItem, _, _ ->
                if (musicItem != null) {
                    val ret = JSObject()
                    ret.put("musicItem", MusicItemToJSON(musicItem).toString())
                    trigger("playingMusicItemChanged", ret)
                } else {
                    trigger("playingMusicItemChanged", JSObject())
                }
            }
        // 添加监听器 播放歌曲的变化
        playerClient.addOnPlayingMusicItemChangeListener(playingMusicItemChangeListener)

        playerClient.addOnVolumeChangeListener { volume ->
            val ret = JSObject()
            ret.put("volume", volume)
            trigger("volumeChanged", ret)
        }
        playerClient.addOnSeekCompleteListener { progress, updateTime, stalled ->
            val ret = JSObject()
            ret.put("progress", progress)
            ret.put("updateTime", updateTime)
            trigger("seekComplete", ret)
        }

    }

    private suspend fun checkConnected(): Boolean = suspendCancellableCoroutine { continuation ->
        try {
            if (!playerClient.isConnected) {
                // 连接到 PlayerService
                playerClient.connect { success ->
                    if (success) {
                        Log.d("App", "connect: $success")
                        continuation.resume(true) // 连接成功，恢复协程并返回 true
                    } else {
                        continuation.resume(false) // 连接失败，恢复协程并返回 false
                    }
                }
            } else {
                continuation.resume(true) // 已经连接，恢复协程并返回 true
            }
        } catch (e: Exception) {
            Log.e("MediaSessionPlugin", "Failed to connect to PlayerService", e)
            continuation.resumeWithException(e) // 发生异常，恢复协程并抛出异常
        }
    }

    @Command
    public fun setPlaylist(invoke: Invoke) {
        // 创建一个 Playlist 对象，并开始播放
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            try {
                val args = invoke.parseArgs(PlaylistArgs::class.java)
                Log.e(
                    "MediaSessionPlugin",
                    "setPlaylist ${args.position} ${args.extra} ${args.playImmediately}"
                )
                var builder = Playlist.Builder()
                builder = builder.setName(args.name)
                val bundle = Bundle()
                bundle.putString("extra", args.extra)
                builder = builder.setExtra(bundle)
                builder = builder.setEditable(true)
                Log.e("MediaSessionPlugin", "musics ${args.musics}")
                for (item in args.musics) {
                    Log.e("MediaSessionPlugin", MusicItemToJSON(generateMusicItem(item)).toString())
                    builder = builder.append(generateMusicItem(item))
                }
                val playlist = builder.build()
                if (args.position != null && args.position!! < 0) {
                    args.position = 0
                }
                playerClient.setPlaylist(playlist, args.position ?: 0, args.playImmediately ?: true)

                val ret = JSObject()
                ret.put("value", true)
                invoke.resolve(ret)
            } catch (e: Exception) {
                Log.e("MediaSessionPlugin", "setPlaylist failed", e)
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
            }
        }

    }

    @Command
    fun updatePlaylistOrder(invoke: Invoke) {
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            val args = invoke.parseArgs(PlaylistArgs::class.java)
            val orderMap: MutableMap<String, Int> = HashMap()
            for (i in 0 until args.musics.size) {
                orderMap[args.musics[i].id] = i
            }
            playerClient.getPlaylist { playlist ->
                val items = playlist.allMusicItem
                //在此处将items按照args.musics的顺序进行排序
                items.sortBy { item ->
                    orderMap[item.musicId] ?: Int.MAX_VALUE
                }
                playerClient.save()
            }
            val ret = JSObject()
            ret.put("value", true)
            invoke.resolve(ret)
        }


    }

    @Command
    fun playTargetMusic(invoke: Invoke) {
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            val musicItem = invoke.parseArgs(PlayMusicItem::class.java)
            playerClient.getPlaylist { playlist ->
                val position = playlist.allMusicItem.indexOfFirst { it.musicId == musicItem.id }
                if (position >= 0) {
                    playerClient.skipToPosition(position)
                } else {
                    // 播放失败
                }
            }
        }

    }

    @Command
    fun updateMusicItem(invoke: Invoke) {
        // 更新item的播放信息
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            val args = invoke.parseArgs(UpdateMusicItemArgs::class.java)
            val oldItem = generateMusicItem(args.oldItem)
            val newItem = generateMusicItem(args.newItem)
//        playerClient.updateMusicItem(oldItem, newItem)
            activity.apply {
                val intent = Intent(localBroadcastMyPlayerService).apply {
                    putExtra("action_name", "receiveUrl")
                    putExtra("musicItem", musicItemToBundle(newItem))
                }
                LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
            }

            val ret = JSObject()
            ret.put("value", true)
            invoke.resolve(ret)
        }

    }


    @Command
    fun play(invoke: Invoke) {
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            playerClient.play()
            val ret = JSObject()
            ret.put("value", true)
            invoke.resolve(ret)
        }

    }

    @Command
    fun pause(invoke: Invoke) {
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            playerClient.pause()
            val ret = JSObject()
            ret.put("value", true)
            invoke.resolve(ret)
        }

    }

    @Command
    fun stop(invoke: Invoke) {
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            playerClient.stop()
        }

    }

    @Command
    fun setVolume(invoke: Invoke) {
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            val args = invoke.parseArgs(VolumeArgs::class.java)
            playerClient.setVolume(args.volume?.toFloat() ?: 1f)
            val ret = JSObject()
            ret.put("value", true)
            invoke.resolve(ret)
        }

    }

    @Command
    fun seekTo(invoke: Invoke) {
        CoroutineScope(Dispatchers.IO).launch {
            if (!checkConnected()) {
                val ret = JSObject()
                ret.put("value", false)
                invoke.resolve(ret)
                return@launch
            }
            val args = invoke.parseArgs(SeekToArgs::class.java)
            playerClient.seekTo(args.milliseconds?.toInt() ?: 0)
            val ret = JSObject()
            ret.put("value", true)
            invoke.resolve(ret)
        }

    }

    private fun generateMusicItem(item: PlayMusicItem): MusicItem {
        val musicItem =
            MusicItem.Builder().setMusicId(item.id).setTitle(item.title).setUri(item.uri)
                .autoDuration().build()
        if (item.artist != null) {
            musicItem.setArtist(item.artist!!)
        }
        if (item.album != null) {
            musicItem.setAlbum(item.album!!)
        }
        if (item.duration != null) {
            musicItem.setDuration(item.duration!!)
        }
        if (item.iconUri != null) {
            musicItem.setIconUri(item.iconUri!!)
        }
        if (item.forbidSeek != null) {
            musicItem.isForbidSeek = item.forbidSeek!!
        }
        if (item.extra != null) {
            val bundle = Bundle()
            bundle.putString("extra", item.extra!!)
            musicItem.extra = bundle
        }
        return musicItem;
    }
}
