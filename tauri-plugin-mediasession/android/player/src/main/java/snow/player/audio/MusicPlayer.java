package snow.player.audio;

import androidx.annotation.Nullable;

/**
 * 该接口定义了音乐播放器的基本功能，开发者可以通过实现该接口来创建一个自定义的音乐播放器。
 * <p>
 * 关于如何实现自定义的音乐播放器，请参考 {@link MusicPlayer} 各方法的文档。文档对如何实现各方法的要求与限制进行了详细介绍。
 *
 * @see MediaMusicPlayer
 */
public interface MusicPlayer {

    /**
     * 准备音乐播放器。
     * <p>
     * 该方法会在主线程上执行，如果准备操作是个耗时操作，你应该在异步线程中执行它。
     * <p>
     * 在实现该方法时，建议先检查 {@link #isInvalid()} 状态，如果返回 {@code true}，说明当前
     * {@link MusicPlayer} 已失效，此时因立即从该方法中返回，不应该再调用任何方法。
     */
    void prepare() throws Exception;

    /**
     * 设置是否循环播放。
     * <p>
     * 如果播放器处于循环播放状态，则应返回 true，否则返回 false。对于新创建的 {@link MusicPlayer} 对象来说，
     * 该方法默认返回 false。
     *
     * @param looping 是否循环播放（默认返回 false）。
     */
    void setLooping(boolean looping);

    /**
     * 判断是否循环播放（默认为 false）。
     *
     * @return 是否循环播放（默认为 false）。
     */
    boolean isLooping();

    /**
     * 判断当前播放器是否处于 stalled 状态。
     * <p>
     * stalled 状态用于表示当前缓冲区是否有足够的数据继续播放，如果缓冲区没有足够的数据支撑继续播放，
     * 则该方法会返回 true，如果缓冲区有足够的数据可以继续播放，则返回 false。
     *
     * @return 当前播放器是否处于 stalled 状态
     */
    boolean isStalled();

    /**
     * 判断播放器是否正在播放。
     * <p>
     * 该方法的返回值只受 {@link #start()}、{@link #pause()}、{@link #stop()}、发生错误或者 {@link #release()} 的影响。
     * 调用 {@link #start()} 方法后，该方法应该返回 true，并且只在调用 {@link #pause()}、
     * {@link #stop()}、播放器发生错误或者调用了 {@link #release()} 方法时才返回 false。
     * 调用了 {@link #start()} 方法后，即使缓冲区没有足够的数据支持继续播放，只要没有没有调用
     * {@link #pause()}、{@link #stop()}、发生错误或者调用 {@link #release()} 方法，
     * 该方法就应该返回 true，即使当前缓冲区没有足够的数据，播放器正在缓冲。
     *
     * @return 播放器是否正在播放音乐
     */
    boolean isPlaying();

    /**
     * 获取当前音频文件的持续时间（单位：毫秒）。
     *
     * @return 当前音频文件的持续时间（单位：毫秒），如果持续时间未知，则返回 -1。
     */
    int getDuration();

    /**
     * 获取当前的播放进度（单位：毫秒）。
     *
     * @return 返回当前的播放进度（单位：毫秒）
     */
    int getProgress();

    /**
     * 开始播放。
     */
    void start();

    /**
     * 暂停播放。
     */
    void pause();

    /**
     * 停止播放。
     */
    void stop();

    /**
     * 调整播放器的播放进度。
     *
     * @param pos 要调整到的播放位置（单位：毫秒）
     */
    void seekTo(int pos);

    /**
     * 设置音量为当前音量的百分比，范围为 [0.0 ~ 1.0] 的闭区间。
     *
     * @param volume 音量百分比（范围为 [0.0 ~ 1.0] 的闭区间）
     */
    void setVolume(float volume);

    /**
     * 获取当前音量。
     *
     * @return 返回当前音量的百分比，范围为 [0.0 ~ 1.0] 的闭区间。
     */
    float getVolume();

    /**
     * 设置音乐播放器的播放速度。
     *
     * @param speed 播放速度，最小值为 0.1。
     */
    void setSpeed(float speed);

    /**
     * 临时降低音量。
     * <p>
     * 音量应该降低到不足以影响到其他应用的音频清晰度，通常为当前音量的 0.2。
     *
     * @see #dismissQuiet()
     */
    void quiet();

    /**
     * 从临时降低的音量中恢复原来的音量。
     *
     * @see #quiet()
     */
    void dismissQuiet();

    /**
     * 释放音乐播放器。
     * <p>
     * 注意！一旦调用该方法，就不能再调用 {@link MusicPlayer} 对象的任何方法，否则会发生不可预见的错误。
     * <p>
     * 调用该方法后应该立即释放你的音乐播放器（释放占用的内存，断开网络连接）。此时 {@link #isInvalid()}
     * 方法应该返回 true，{@link #isPlaying()} 方法与 {@link #isStalled()} 方法应该返回 false。
     */
    void release();

    /**
     * 当前音乐播放器是否已失效（对于新创建的对象，该方法默认返回 false）。
     * <p>
     * 当播放器发生错误，或者调用 {@link #release()} 方法后，该方法应该返回 true。如果该方法返回 true，则不
     * 应再调用除 {@link #release()} 方法以外的任何其他方法。
     *
     * @return 返回 true 表示当前音乐播放器已失效，此时不应再调用除 {@link #release()} 方法以外的任何其他方法
     */
    boolean isInvalid();

    /**
     * 获取音频会话 ID。如果失败，则返回 0。
     *
     * @return 音频会话 ID。如果失败，则返回 0。
     */
    int getAudioSessionId();

    /**
     * 设置一个 {@link OnPreparedListener} 监听器。
     *
     * @param listener 监听器对象，可为 null。为 null 时将清除上次设置的监听器。
     */
    void setOnPreparedListener(@Nullable OnPreparedListener listener);

    /**
     * 设置一个 {@link OnCompletionListener} 监听器。
     *
     * @param listener 监听器对象，可为 null。为 null 时将清除上次设置的监听器。
     */
    void setOnCompletionListener(@Nullable OnCompletionListener listener);

    /**
     * 设置一个 {@link OnRepeatListener} 监听器。
     *
     * @param listener 监听器对象，可为 null。为 null 时将清除上次设置的监听器。
     */
    void setOnRepeatListener(@Nullable OnRepeatListener listener);

    /**
     * 设置一个 {@link OnSeekCompleteListener} 监听器。
     *
     * @param listener 监听器对象，可为 null。为 null 时将清除上次设置的监听器。
     */
    void setOnSeekCompleteListener(@Nullable OnSeekCompleteListener listener);

    /**
     * 设置一个 {@link OnStalledListener} 监听器。
     *
     * @param listener 监听器对象，可为 null。为 null 时将清除上次设置的监听器。
     */
    void setOnStalledListener(@Nullable OnStalledListener listener);

    /**
     * 设置一个 {@link OnBufferingUpdateListener} 监听器。
     *
     * @param listener 监听器对象，可为 null。为 null 时将清除上次设置的监听器。
     */
    void setOnBufferingUpdateListener(@Nullable OnBufferingUpdateListener listener);

    /**
     * 设置一个 {@link OnErrorListener} 监听器。
     *
     * @param listener 监听器对象，可为 null。为 null 时将清除上次设置的监听器。
     */
    void setOnErrorListener(@Nullable OnErrorListener listener);

    /**
     * 用于监听音乐播放器是否准备完毕。
     */
    interface OnPreparedListener {
        /**
         * 该方法会在音乐播放器准备完毕时被调用。
         *
         * @param mp 当前音乐播放器。
         */
        void onPrepared(MusicPlayer mp);
    }

    /**
     * 用于监听音乐播放器是否播放完毕。
     */
    interface OnCompletionListener {
        /**
         * 该方法会在音乐播放完毕时被调用。
         *
         * @param mp 当前音乐播放器。
         */
        void onCompletion(MusicPlayer mp);
    }

    /**
     * 用于监听播放的循环播放事件。
     * <p>
     * 事件发生的条件：播放器为循环播放，歌曲播放完成，且开始进入下个循环进行播放。
     */
    interface OnRepeatListener {
        /**
         * 播放器为循环播放，当歌曲播放完并且进入下次循环时调用该方法。
         *
         * @param mp 当前音乐播放器。
         */
        void onRepeat(MusicPlayer mp);
    }

    /**
     * 用于监听音乐播放器的播放进度是否调整完毕。
     */
    interface OnSeekCompleteListener {
        /**
         * 该方法会在 seek 完成时被调用。
         *
         * @param mp 当前音乐播放器。
         */
        void onSeekComplete(MusicPlayer mp);
    }

    /**
     * 用于监听播放器的 stalled 状态。
     * <p>
     * 当进入缓冲区的数据变慢或停止并且缓冲区没有足够的数据支持继续播放时，stalled 状态为 true，否则为 false。
     */
    interface OnStalledListener {
        /**
         * 该方法会在播放器的 stalled 状态改变时调用。
         *
         * @param stalled 如果缓冲区没有足够的数据继续播放，则该参数为 true，当缓冲区缓存了足够的数据可以继续
         *                播放时，该参数为 false。
         */
        void onStalled(boolean stalled);
    }

    /**
     * 用于监听音乐播放器的缓存进度。
     */
    interface OnBufferingUpdateListener {
        /**
         * 该方法会在缓存进度更新时调用。
         *
         * @param mp        当前音乐播放器
         * @param buffered  已缓存的进度（毫秒或者是一个 [0 ~ 100] 的百分比值）
         * @param isPercent 已缓存的进度是否是百分比值，如果缓存进度是百分比值，该参数则应该为 true
         */
        void onBufferingUpdate(MusicPlayer mp, int buffered, boolean isPercent);
    }

    /**
     * 用于监听器音乐播放的错误状态。
     */
    interface OnErrorListener {
        /**
         * 该方法会在错误发生时被调用。
         * <p>
         * 发生错误后，当前 {@link MusicPlayer} 不会再被使用，你可以释放播放器占用的资源。
         *
         * @param mp        当前播放器
         * @param errorCode 错误码
         * @see ErrorCode 提供了部分预定义错误码
         */
        void onError(MusicPlayer mp, int errorCode);
    }
}
