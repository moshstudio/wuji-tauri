package snow.player;

/**
 * 播放器的播放模式。
 *
 * @see PlayerClient#setPlayMode(PlayMode)
 */
public enum PlayMode {
    /**
     * 播放列表循环。
     */
    PLAYLIST_LOOP(0),
    /**
     * 单曲循环。
     */
    LOOP(1),
    /**
     * 随机播放。
     */
    SHUFFLE(2),
    /**
     * 单曲一次。
     * <p>
     * 单首歌曲播放完成后，自动暂停播放。
     */
    SINGLE_ONCE(3);

    final int serialId;

    PlayMode(int serialId) {
        this.serialId = serialId;
    }

    public static PlayMode getBySerialId(int serialId) {
        PlayMode playMode = PLAYLIST_LOOP;

        if (serialId == LOOP.serialId) {
            playMode = LOOP;
        } else if (serialId == SHUFFLE.serialId) {
            playMode = SHUFFLE;
        } else if (serialId == SINGLE_ONCE.serialId) {
            playMode = SINGLE_ONCE;
        }

        return playMode;
    }
}
