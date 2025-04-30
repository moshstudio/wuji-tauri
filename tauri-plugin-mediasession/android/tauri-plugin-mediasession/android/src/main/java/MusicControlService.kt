private fun getPlayPauseAction(): NotificationCompat.Action {
    val state = mediaSession.controller.playbackState?.state
        ?: PlaybackStateCompat.STATE_NONE

    val icon = if (state == PlaybackStateCompat.STATE_PLAYING) {
        android.R.drawable.ic_media_pause
    } else {
        android.R.drawable.ic_media_play
    }

    return NotificationCompat.Action(
        icon,
        if (state == PlaybackStateCompat.STATE_PLAYING) "Pause" else "Play",
        getActionIntent(ACTION_PLAY_PAUSE)
    )
}