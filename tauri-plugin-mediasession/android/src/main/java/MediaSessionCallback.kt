package tauri.plugin.mediasession

import android.support.v4.media.session.MediaSessionCompat

class MediaSessionCallback(private val plugin: MediaSessionPlugin) : MediaSessionCompat.Callback() {
    companion object {
        private const val TAG = "MediaSessionCallback"
    }

    override fun onPlay() {
        plugin.actionCallback("play")
    }

    override fun onPause() {
        plugin.actionCallback("pause")
    }

    override fun onSeekTo(pos: Long) {
        plugin.actionCallback("seekto", pos.toString())
    }

    override fun onRewind() {
        plugin.actionCallback("seekbackward")
    }

    override fun onFastForward() {
        plugin.actionCallback("seekforward")
    }

    override fun onSkipToPrevious() {
        plugin.actionCallback("previoustrack")
    }

    override fun onSkipToNext() {
        plugin.actionCallback("nexttrack")
    }

    override fun onStop() {
        plugin.actionCallback("stop")
    }
}