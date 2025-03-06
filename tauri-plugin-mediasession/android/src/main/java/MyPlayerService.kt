package tauri.plugin.mediasession

import MyMediaNotificationView
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import app.tauri.plugin.JSObject
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import snow.player.PlayerService
import snow.player.SoundQuality
import snow.player.annotation.PersistenceId
import snow.player.audio.MusicItem
import snow.player.util.AsyncResult
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException


@PersistenceId("MyPlayerService")
class MyPlayerService : PlayerService() {
    private val deferredResults = mutableMapOf<String, CompletableDeferred<MusicItem>>()

    private val receiver: BroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val command = intent.getStringExtra("action_name")
            if ("receiveUrl" == command) {
                val data = intent.getBundleExtra("musicItem")
                if (data != null) {
                    val item = bundleToMusicItem(data)
                    if (item != null) {
                        deferredResults[item.musicId]?.complete(item)
                    }
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        LocalBroadcastManager.getInstance(this).registerReceiver(
            receiver, IntentFilter(localBroadcastMyPlayerService)
        )
    }

    override fun onCreateNotificationView(): NotificationView {
        return MyMediaNotificationView()
    }

    override fun onPrepareMusicItem(
        musicItem: MusicItem,
        soundQuality: SoundQuality,
        result: AsyncResult<MusicItem>
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val deferred = CompletableDeferred<MusicItem>()
                deferredResults[musicItem.musicId] = deferred

                val intent = Intent(localBroadcastPlugin).apply {
                    putExtra("action_name", "getUrl")
                    putExtra("musicItem", musicItemToBundle(musicItem))
                }
                LocalBroadcastManager.getInstance(this@MyPlayerService).sendBroadcast(intent)

                // 等待结果
                val newMusicItem = withTimeoutOrNull(22000) {
                    deferred.await()
                }
                if (newMusicItem == null) {
                    Log.e("MyPlayerService", "onPrepareMusicItem: return null")
                } else {
                    Log.e("MyPlayerService", "onPrepareMusicItem: ${MusicItemToJSON(newMusicItem)}")
                }


                if (result.isCancelled) {
                    return@launch
                }

                if (newMusicItem == null) {
                    if (!result.isCancelled) {
                        result.onSuccess(musicItem)
                    }
                    return@launch
                }

                val finalUri = if (newMusicItem.uri.startsWith("file://")) {
                    getFileUriFromAppCache(this@MyPlayerService, newMusicItem.uri)
                } else if (newMusicItem.uri.startsWith("http")) {
                    Uri.parse(newMusicItem.uri)
                } else {
                    Uri.parse(musicItem.uri)
                }
                newMusicItem.uri = finalUri.toString()
                val coverUri = if (newMusicItem.iconUri.startsWith("file://")) {
                    getFileUriFromAppCache(this@MyPlayerService, newMusicItem.iconUri)
                } else {
                    Uri.parse(newMusicItem.iconUri)
                }
                newMusicItem.iconUri = coverUri.toString()

                if (!result.isCancelled) {
                    result.onSuccess(newMusicItem)
                }
            } catch (e: Exception) {
                if (!result.isCancelled) {
                    result.onError(e)
                }
            } finally {
                deferredResults.remove(musicItem.musicId)
            }
        }
    }

}