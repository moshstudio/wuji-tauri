private fun getActionIntent(action: String): PendingIntent {
    val intent = Intent(Intent.ACTION_MEDIA_BUTTON, null, this, MediaButtonReceiver::class.java).apply {
        putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE))
        // Optional: You can also add a custom extra to distinguish actions if necessary
        // putExtra("custom_action", action)
    }
    return PendingIntent.getBroadcast(
        this,
        action.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
}