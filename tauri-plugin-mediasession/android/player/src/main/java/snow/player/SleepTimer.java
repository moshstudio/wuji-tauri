package snow.player;

import channel.helper.Channel;
import channel.helper.UseOrdinal;

/**
 * 睡眠定时器。
 *
 * @see PlayerClient#startSleepTimer(long)
 * @see PlayerClient#cancelSleepTimer()
 * @see PlayerClient#addOnSleepTimerStateChangeListener(SleepTimer.OnStateChangeListener)
 * @see PlayerClient#removeOnSleepTimerStateChangeListener(SleepTimer.OnStateChangeListener)
 */
@Channel
public interface SleepTimer {
    /**
     * 启动睡眠定时器。
     *
     * @param time   定时器的定时时间（单位：毫秒）。播放器会在经过 time 时间后暂停播放。
     * @param action 定时器的的时间到时要执行的操作。
     */
    void startSleepTimer(long time, @UseOrdinal TimeoutAction action);

    /**
     * 取消睡眠定时器。
     */
    void cancelSleepTimer();

    /**
     * 是否等到当前正在播放的歌曲播放完成后，再执行指定动作。
     *
     * @param waitPlayComplete 是否等到当前正在播放的歌曲播放完成后，再执行指定动作。
     */
    void setWaitPlayComplete(boolean waitPlayComplete);

    /**
     * 用于监听睡眠定时器的状态改变。
     * <p>
     * 当启动或者取消睡眠定时器时，该监听器会被调用。
     */
    interface OnStateChangeListener {
        /**
         * 当启动睡眠定时器时会调用该方法。
         * <p>
         * 使用当前的 System.currentTimeMillis() 减去 startTime 即可知道睡眠定时器已经走过的时间。
         *
         * @param time      睡眠定时器的定时时间
         * @param startTime 睡眠定时器的启动时间。使用当前的 SystemClock.elapsedRealtime()
         *                  减去 startTime 即可知道睡眠定时器已经走过的时间。
         * @param action    定时器的的时间到时要执行的操作。
         * @see #startSleepTimer(long, TimeoutAction)
         */
        void onTimerStart(long time, long startTime, @UseOrdinal TimeoutAction action);

        /**
         * 睡眠定时器终止。
         * <p>
         * 该方法会在满足以下条件之一时调用：
         * <ol>
         *     <li>睡眠定时器的定时时间到，并且定时任务完成；</li>
         *     <li>睡眠定时器被取消。</li>
         * </ol>
         *
         * @see #cancelSleepTimer()
         */
        void onTimerEnd();
    }

    /**
     * 用于监听睡眠定时器的状态改变。
     * <p>
     * {@link OnStateChangeListener} 监听器的新版本。
     * <p>
     * 当启动或者取消睡眠定时器时，该监听器会被调用。
     */
    @Channel
    interface OnStateChangeListener2 extends OnStateChangeListener {
        /**
         * 当启动睡眠定时器时会调用该方法。
         * <p>
         * 使用当前的 System.currentTimeMillis() 减去 startTime 即可知道睡眠定时器已经走过的时间。
         *
         * @param time             睡眠定时器的定时时间
         * @param startTime        睡眠定时器的启动时间。使用当前的 SystemClock.elapsedRealtime()
         *                         减去 startTime 即可知道睡眠定时器已经走过的时间。
         * @param action           定时器的的时间到时要执行的操作。
         * @param waitPlayComplete 是否等到当前正在播放的歌曲播放完成后，再执行指定动作。
         * @see #startSleepTimer(long, TimeoutAction)
         */
        void onTimerStart(long time, long startTime, @UseOrdinal TimeoutAction action, boolean waitPlayComplete);

        /**
         * 当睡眠定时器的时间到时会调用该方法。
         *
         * @param actionComplete 任务是否已执行。如果调用 {@link #setWaitPlayComplete(boolean)} 方法设置了
         *                       “等待当前正在播放的歌曲播放完成后再执行指定动作”，当定时时间到时，
         *                       如果当前正在歌曲并未播放完成，则该参数为 false。
         * @see #setWaitPlayComplete(boolean)
         * @see #cancelSleepTimer()
         */
        void onTimeout(boolean actionComplete);
    }

    /**
     * 用于监听睡眠定时器的 waitPlayComplete 的状态改变事件。
     */
    @Channel
    interface OnWaitPlayCompleteChangeListener {
        /**
         * 当播放器的 waitPlayComplete 状态改变时，会调用该方法。
         *
         * @param waitPlayComplete 是否等到当前正在播放的歌曲播放完成后，再执行指定动作。
         */
        void onWaitPlayCompleteChanged(boolean waitPlayComplete);
    }

    /**
     * 睡眠定时器的时间到时要执行的操作。
     */
    enum TimeoutAction {
        /**
         * 当时间到时，暂停播放。
         */
        PAUSE,
        /**
         * 当时间到时，停止播放。
         */
        STOP,
        /**
         * 当时间到时，关闭 PlayerService。
         */
        SHUTDOWN
    }
}
