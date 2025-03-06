package tauri.plugin.mediasession

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.core.content.FileProvider
import app.tauri.plugin.JSObject
import kotlinx.coroutines.CompletableDeferred
import snow.player.audio.MusicItem
import java.io.File
import java.util.concurrent.LinkedBlockingQueue

val localBroadcastMyPlayerService = "snow.player.action.MyPlayerService"
val localBroadcastPlugin = "snow.player.action.Plugin"


public fun musicItemToBundle(musicItem: MusicItem): Bundle {
    val bundle = Bundle().apply {
        putString("musicId", musicItem.musicId)
        putString("title", musicItem.title)
        putString("artist", musicItem.artist)
        putString("album", musicItem.album)
        putString("uri", musicItem.uri)
        putString("iconUri", musicItem.iconUri)
        putInt("duration", musicItem.duration)
        putBoolean("forbidSeek", musicItem.isForbidSeek)
        putBundle("extra", musicItem.extra)
    }
    return bundle
}

public fun bundleToMusicItem(bundle: Bundle): MusicItem? {
    val id = bundle.getString("musicId")
    val title = bundle.getString("title")
    val artist = bundle.getString("artist")
    val album = bundle.getString("album")
    val uri = bundle.getString("uri")
    val iconUrl = bundle.getString("iconUri")
    val duration = bundle.getInt("duration")
    val forbidSeek = bundle.getBoolean("forbidSeek")
    val extra = bundle.getBundle("extra")
    if (id == null || title == null || uri == null) {
        return null
    }
    val musicItem =
        MusicItem.Builder().setMusicId(id).setTitle(title).setUri(uri).autoDuration().build()
    if (artist != null) {
        musicItem.setArtist(artist)
    }
    if (album != null) {
        musicItem.setAlbum(album)
    }
    if (duration != 0) {
        musicItem.setDuration(duration)
    }
    if (iconUrl != null) {
        musicItem.setIconUri(iconUrl)
    }
    musicItem.isForbidSeek = forbidSeek
    if (extra != null) {
        musicItem.extra = extra
    }
    return musicItem
}

public fun MusicItemToJSON(musicItem: MusicItem): JSObject {
    val ret = JSObject().apply {
        put("id", musicItem.musicId)
        put("title", musicItem.title)
        put("artist", musicItem.artist)
        put("album", musicItem.album)
        put("uri", musicItem.uri)
        put("iconUri", musicItem.iconUri)
        put("duration", musicItem.duration)
        put("forbidSeek", musicItem.isForbidSeek)
    }
    if (musicItem.extra != null) {
        ret.put("extra", musicItem.extra!!.getString("extra"))
    }

    return ret
}

fun getFileUriFromAppCache(context: Context, relativePath: String): Uri? {
    // 获取缓存目录下的文件
    val cacheDir = context.cacheDir
    var relativePath = relativePath
    if (relativePath.startsWith("file://")) {
        relativePath = relativePath.substring("file://".length)
    }
    val file = File(cacheDir, relativePath)
    Log.w("getFileUriFromAppCache", "file: ${Uri.fromFile(file)}")


    // 检查文件是否存在
    return if (file.exists()) {
        return Uri.fromFile(file)
    } else {
        null
    }
}