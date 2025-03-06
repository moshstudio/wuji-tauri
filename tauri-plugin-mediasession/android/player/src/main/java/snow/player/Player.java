package snow.player;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import channel.helper.Channel;
import channel.helper.UseOrdinal;
import snow.player.audio.MusicItem;
import snow.player.playlist.PlaylistManager;

/**
 * 该接口定义了音乐播放器的基本功能。
 */
@Channel
public interface Player {
    /**
     * 开始播放。
     */
    void play();

    /**
     * 暂停播放。
     */
    void pause();

    /**
     * 停止播放。
     */
    void stop();

    /**
     * 播放/暂停。
     * <p>
     * 如果当前没有播放音乐，则开始播放音乐；如果当前正在播放音乐，则暂停播放。
     */
    void playPause();

    /**
     * 调整音乐播放进度。
     *
     * @param progress 要调整到的播放进度
     */
    void seekTo(int progress);

    /**
     * 快进。
     */
    void fastForward();

    /**
     * 快退。
     */
    void rewind();

    /**
     * 下一曲。
     */
    void skipToNext();

    /**
     * 上一曲。
     */
    void skipToPrevious();

    /**
     * 播放 position 处的音乐，如果播放列表中 position 处的音乐是当前正在播放的音乐，则忽略本次调用。
     * <p>
     * 该方法与 {@link #playPause(int)} 方法的区别是，如果 position 参数等于当前正在播放的音乐的位置，
     * {@link #playPause(int)} 方法会暂停播放，而当前方法则是忽略本次调用。
     *
     * @param position 要播放的音乐的 position 值（从 0 开始计算）。
     */
    void skipToPosition(int position);

    /**
     * 播放/暂停队列中 position 位置处的音乐。
     * <p>
     * 如果 position 不等于当前正在播放的音乐的位置，则播放 position 处的音乐；否则暂停播放。
     * <p>
     * 该方法与 {@link #skipToPosition(int)} 方法的区别是，如果 position 参数等于当前正在播放的音乐的位置，
     * {@link #skipToPosition(int)} 方法则会忽略调用，而当前方法则是会暂停播放。
     */
    void playPause(int position);

    /**
     * 设置播放器的播放模式。
     *
     * @param playMode 播放模式
     * @see PlayMode
     */
    void setPlayMode(@UseOrdinal PlayMode playMode);

    /**
     * 设置播放器播放速度。
     *
     * @param speed 播放速度，最小值为 0.1，最大值为 10。
     */
    void setSpeed(float speed);

    /**
     * 设置音量为当前音量的百分比，范围为 [0.0 ~ 1.0] 的闭区间。
     *
     * @param volume 音量百分比（范围为 [0.0 ~ 1.0] 的闭区间）
     */
    void setVolume(float volume);

    /**
     * 播放器状态改变监听器。
     */
    interface OnPlaybackStateChangeListener {
        /**
         * 当播放器的状态变为 “播放中” 时会回调该方法。
         *
         * @param stalled                当前播放器是否处于 stalled 状态。当缓冲区没有足够的数据继续播放时，
         *                               该参数为 true，否则为 false
         * @param playProgress           当前的播放进度
         * @param playProgressUpdateTime 播放进度的更新时间
         */
        void onPlay(boolean stalled, int playProgress, long playProgressUpdateTime);

        /**
         * 当播放器的状态变为 “暂停” 时会回调该方法。
         *
         * @param playProgress 当前的播放进度
         * @param updateTime   播放进度的更新时间
         */
        void onPause(int playProgress, long updateTime);

        /**
         * 当播放器的状态变为 “停止” 时会回调该方法。
         */
        void onStop();

        /**
         * 当播放器发生错误时会回调该方法。
         *
         * @param errorCode    错误码
         * @param errorMessage 错误信息
         */
        void onError(int errorCode, String errorMessage);
    }

    /**
     * 用于监听播放器的准备状态。
     */
    interface OnPrepareListener {
        /**
         * 当播放器的状态变为 “准备中” 时会回调该方法。
         */
        void onPreparing();

        /**
         * 当播放器的状态变为 “准备完毕” 时会回调该方法。
         *
         * @param audioSessionId 当前音乐的 audio session id
         */
        void onPrepared(int audioSessionId);
    }

    /**
     * 用于监听播放器的准备状态。
     * <p>
     * {@link OnPrepareListener} 的升级版，增加了一个回调方法 {@link OnPrepareListener2#onPrepared(int, int)}
     */
    interface OnPrepareListener2 extends OnPrepareListener {
        /**
         * 当播放器的状态变为 “准备完毕” 时会回调该方法。
         * <p>
         * 在某些情况下，可能无法在创建 {@link snow.player.audio.MusicItem} 对象时提供歌曲的 duration。
         * 这种情况下，实时播放进度功能将无法正常使用，出于该情况考虑，增加了该方法，用于处理在无法在创建
         * {@link snow.player.audio.MusicItem} 对象时提供歌曲的 duration 的情况。
         *
         * @param audioSessionId 当前音乐的 audio session id
         * @param duration       当前音乐的持续时长
         */
        void onPrepared(int audioSessionId, int duration);
    }

    /**
     * 用于监听播放器的 stalled 状态。
     * <p>
     * 当没有足够的缓存数据支撑播放器继续播放时，播放器会进入 stalled 状态。
     */
    interface OnStalledChangeListener {
        /**
         * 当播放器的 stalled 状态发生改变时会回调该方法。
         *
         * @param stalled      没有足够的缓存数据支撑播放器继续播放时，该参数为 true；当播放器缓存了足够的数据可
         *                     以继续播放时，该参数为 false。
         * @param playProgress 当前播放进度
         * @param updateTime   当前播放进度的更新时间
         */
        void onStalledChanged(boolean stalled, int playProgress, long updateTime);
    }

    /**
     * 用于监听调整播放进度事件。
     */
    interface OnSeekCompleteListener {

        /**
         * 该方法会在 seek 操作执行完成时调用。
         *
         * @param progress   当前的播放进度
         * @param updateTime 当前播放进度的更新时间
         * @param stalled    当前播放器是否处于 stalled 状态。当缓冲区没有足够的数据继续播放时，
         *                   该参数为 true，否则为 false
         */
        void onSeekComplete(int progress, long updateTime, boolean stalled);
    }

    /**
     * 用于监听当前正在播放的音乐的缓冲进度。
     */
    interface OnBufferedProgressChangeListener {
        /**
         * 当缓冲进度发生改变时会回调该方法。
         *
         * @param bufferedProgress 缓冲进度，范围为 [0, duration]
         */
        void onBufferedProgressChanged(int bufferedProgress);
    }

    /**
     * 用于监听当前正在播放的音乐。
     */
    interface OnPlayingMusicItemChangeListener {
        /**
         * 当正在播放的音乐被改变时（例如：切换歌曲）会回调该方法。
         *
         * @param musicItem    当前正在播放的音乐
         * @param position     歌曲在播放列表中的位置
         * @param playProgress 歌曲的播放进度
         */
        void onPlayingMusicItemChanged(@Nullable MusicItem musicItem, int position, int playProgress);
    }

    /**
     * 用于监听播放队列被替换/修改事件。
     * <p>
     * 当设置新的播放队列或者修改已有的播放队列时，该监听器会被调用。
     */
    interface OnPlaylistChangeListener {
        /**
         * 播放队列被替换或修改时会调用该方法。
         *
         * @param playlistManager 用于管理播放队列的 PlaylistManager 对象。可以通过该对象获取到最新的播放队列。
         * @param position        播放队列的播放位置。
         */
        void onPlaylistChanged(PlaylistManager playlistManager, int position);
    }

    /**
     * 用于监听播放模式改变事件。
     */
    interface OnPlayModeChangeListener {
        /**
         * 当播放模式被改变时会调用该方法。
         *
         * @param playMode 当前的播放模式。
         * @see PlayMode#PLAYLIST_LOOP
         * @see PlayMode#LOOP
         * @see PlayMode#SHUFFLE
         */
        void onPlayModeChanged(@UseOrdinal PlayMode playMode);
    }

    /**
     * 用于监听播放器播放速度改变事件。
     */
    interface OnSpeedChangeListener {
        /**
         * 当播放器的播放速度改变时会调用该方法。
         */
        void onSpeedChanged(float speed, int playProgress, long playProgressUpdateTime);
    }

    /**
     * 用于监听歌曲循环播放事件。
     */
    interface OnRepeatListener {
        /**
         * 当播放器播放模式为 {@link PlayMode#LOOP} 单曲循环，且歌曲播放完毕，准备开始下次循环播放时会回调该方法。
         *
         * @param musicItem  循环播放的歌曲。
         * @param repeatTime 歌曲再次开始播放的时间（这个时间是 {@code SystemClock.elapsedRealtime()}）。
         */
        @SuppressWarnings("NullableProblems")
        void onRepeat(@NonNull MusicItem musicItem, long repeatTime);
    }

    /**
     * 用于监听播放器音量变化事件。
     */
    interface OnVolumeChaneListener {
        /**
         * 当播放器的音量被发生变化时，该方法会被调用。
         *
         * @param volume 播放器的当前音量（返回为 [0.0, 1.0] 之前的闭区间）。
         */
        void onVolumeChanged(float volume);
    }
}
