package snow.player;

/**
 * 播放器的首选音质。
 *
 * @see PlayerClient#setSoundQuality(SoundQuality)
 */
public enum SoundQuality {
    /**
     * 标准音质。
     */
    STANDARD,
    /**
     * 低音质。
     */
    LOW,
    /**
     * 高音质。
     */
    HIGH,
    /**
     * 超高音质（无损）。
     */
    SUPER
}
