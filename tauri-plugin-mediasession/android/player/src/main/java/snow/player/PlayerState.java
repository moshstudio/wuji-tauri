package snow.player;

import android.content.Context;
import android.os.Parcel;
import android.os.Parcelable;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.common.base.Objects;
import com.google.common.base.Preconditions;

import snow.player.audio.MusicItem;
import snow.player.audio.ErrorCode;

/**
 * 用于保存基本的播放器状态。
 */
class PlayerState implements Parcelable {
    private int playProgress;
    @Nullable
    private MusicItem musicItem;
    private int playPosition;
    private PlayMode playMode;
    private float speed;
    private int duration;
    private boolean waitPlayComplete;

    // no persistent
    private long playProgressUpdateTime;
    private PlaybackState playbackState;
    private boolean preparing;
    private boolean prepared;
    private int audioSessionId;
    private int bufferedProgress;
    private boolean stalled;
    private int errorCode;
    private String errorMessage;
    private boolean sleepTimerStarted;
    private long sleepTimerTime;
    private long sleepTimerStartTime;
    private SleepTimer.TimeoutAction timeoutAction;
    private boolean sleepTimerEnd;
    private boolean sleepTimerTimeout;
    private float volume;

    public PlayerState() {
        playProgress = 0;
        playProgressUpdateTime = 0;
        playPosition = 0;
        playMode = PlayMode.PLAYLIST_LOOP;
        speed = 1.0F;

        playbackState = PlaybackState.NONE;
        preparing = false;
        prepared = false;
        audioSessionId = 0;
        bufferedProgress = 0;
        stalled = false;
        errorCode = ErrorCode.NO_ERROR;
        errorMessage = "";
        sleepTimerStarted = false;
        sleepTimerTime = 0;
        sleepTimerStartTime = 0;
        timeoutAction = SleepTimer.TimeoutAction.PAUSE;
        duration = 0;
        waitPlayComplete = false;
        sleepTimerEnd = true;
        sleepTimerTimeout = false;
        volume = 1.0F;
    }

    public PlayerState(PlayerState source) {
        playProgress = source.playProgress;
        playProgressUpdateTime = source.playProgressUpdateTime;
        if (source.musicItem != null) {
            musicItem = new MusicItem(source.musicItem);
        }
        playPosition = source.playPosition;
        playMode = source.playMode;
        speed = source.speed;

        playbackState = source.playbackState;
        preparing = source.preparing;
        prepared = source.prepared;
        audioSessionId = source.audioSessionId;
        bufferedProgress = source.bufferedProgress;
        stalled = source.stalled;
        errorCode = source.errorCode;
        errorMessage = source.errorMessage;
        sleepTimerStarted = source.sleepTimerStarted;
        sleepTimerTime = source.sleepTimerTime;
        sleepTimerStartTime = source.sleepTimerStartTime;
        timeoutAction = source.timeoutAction;
        duration = source.duration;
        waitPlayComplete = source.waitPlayComplete;
        sleepTimerEnd = source.sleepTimerEnd;
        sleepTimerTimeout = source.sleepTimerTimeout;
        volume = source.volume;
    }

    /**
     * 获取播放进度。
     *
     * @return 播放进度。
     */
    public int getPlayProgress() {
        return playProgress;
    }

    /**
     * 设置播放进度。
     *
     * @param playProgress 播放进度（小于 0 时，相当于设置为 0）。
     */
    public void setPlayProgress(int playProgress) {
        if (playProgress < 0) {
            this.playProgress = 0;
            return;
        }

        this.playProgress = playProgress;
    }


    /**
     * 获取上次播放进度的更新时间（单位：毫秒 ms）。<b>注意！这是基于 SystemClock.elapsedRealtime() 的时间。</b>
     *
     * @return 上次播放进度的更新时间。
     */
    public long getPlayProgressUpdateTime() {
        return playProgressUpdateTime;
    }

    /**
     * 设置上次播放进度的更新时间。<b>注意！这是基于 SystemClock.elapsedRealtime() 的时间。</b>
     *
     * @param updateTime 上次播放进度的更新时间。
     */
    public void setPlayProgressUpdateTime(long updateTime) {
        playProgressUpdateTime = updateTime;
    }

    /**
     * 获取当前播放歌曲的 MusicItem 对象。
     */
    @Nullable
    public MusicItem getMusicItem() {
        return musicItem;
    }

    /**
     * 设置当前播放歌曲的 MusicItem 对象。
     */
    public void setMusicItem(@Nullable MusicItem musicItem) {
        this.musicItem = musicItem;
    }

    /**
     * 获取播放队列的播放位置。
     *
     * @return 播放队列的播放位置。
     */
    public int getPlayPosition() {
        return playPosition;
    }

    /**
     * 设置播放队列的播放位置。
     *
     * @param playPosition 播放队列的播放位置（小于 0 时相当于设置为 0）。
     */
    public void setPlayPosition(int playPosition) {
        if (playPosition < 0) {
            this.playPosition = 0;
            return;
        }

        this.playPosition = playPosition;
    }

    /**
     * 获取播放队列的播放模式。
     *
     * @return 播放队列的播放模式。
     * @see PlayMode
     */
    public PlayMode getPlayMode() {
        return playMode;
    }

    /**
     * 设置播放队列的播放模式。
     *
     * @param playMode 播放队列的播放模式。只能是这些值之一：{@link PlayMode#PLAYLIST_LOOP},
     *                 {@link PlayMode#LOOP},
     *                 {@link PlayMode#SHUFFLE}
     * @see PlayMode
     */
    public void setPlayMode(@NonNull PlayMode playMode) {
        this.playMode = playMode;
    }

    /**
     * 获取当前播放速度。
     *
     * @return 当前播放速度。
     */
    public float getSpeed() {
        return speed;
    }

    /**
     * 设置播放速度。
     *
     * @param speed 播放速度。
     */
    public void setSpeed(float speed) {
        this.speed = speed;
    }

    /**
     * 获取播放状态。
     *
     * @return 返回当前播放状态。
     * @see PlaybackState
     */
    public PlaybackState getPlaybackState() {
        return playbackState;
    }

    /**
     * 设置播放状态。
     *
     * @param playbackState 要设置的播放状态。如果该参数的值不是 {@link PlaybackState#ERROR} 则会
     *                      清除错误码（重置为 {@link ErrorCode#NO_ERROR}）与错误信息。
     * @see PlaybackState
     */
    public void setPlaybackState(@NonNull PlaybackState playbackState) {
        Preconditions.checkNotNull(playbackState);
        this.playbackState = playbackState;

        if (playbackState != PlaybackState.ERROR) {
            errorCode = ErrorCode.NO_ERROR;
            errorMessage = "";
        }
    }

    /**
     * 播放器是否正在准备中。
     *
     * @return 如果播放器正在准备中，则返回 true，否则返回 false
     */
    public boolean isPreparing() {
        return preparing;
    }

    /**
     * 设置播放器是否正在准备中。
     *
     * @param preparing 播放器是否正在准备中
     */
    public void setPreparing(boolean preparing) {
        this.preparing = preparing;
    }

    /**
     * 播放器是否准备完毕。
     *
     * @return 如果播放器已准备完毕，则返回 true，否则返回 false
     */
    public boolean isPrepared() {
        return prepared;
    }

    /**
     * 设置播放器是否准备完毕。
     *
     * @param prepared 播放器是否准备完毕
     */
    public void setPrepared(boolean prepared) {
        this.prepared = prepared;
    }

    /**
     * 获取当前正在播放的音乐的 audio session id。
     * <p>
     * 注意！可能会返回 0 （API 21: {@link android.media.AudioManager#AUDIO_SESSION_ID_GENERATE}），表示当前音乐的
     * audio session id 不可用。
     */
    public int getAudioSessionId() {
        return audioSessionId;
    }

    /**
     * 设置当前音乐的 audio session id。
     *
     * @param audioSessionId 当前音乐的 audio session id。如果当前音乐的 audio session id 不可用，则可以
     *                       设为 0 （API 21: {@link android.media.AudioManager#AUDIO_SESSION_ID_GENERATE}）。
     */
    public void setAudioSessionId(int audioSessionId) {
        this.audioSessionId = audioSessionId;
    }

    /**
     * 获取当前音乐的缓存进度。百分比值，范围为 [0 ~ 100]。
     */
    public int getBufferedProgress() {
        return bufferedProgress;
    }

    /**
     * 设置当前音乐的缓存进度。百分比值，范围为 [0 ~ 100]。
     */
    public void setBufferedProgress(int bufferedProgress) {
        if (bufferedProgress < 0) {
            this.bufferedProgress = 0;
            return;
        }

        this.bufferedProgress = bufferedProgress;
    }

    /**
     * 获取 {@code stalled} 状态。
     *
     * <b>{@code stalled} 状态</b>：播放器的缓冲区中没有足够的数据支持播放器继续播放时的状态。
     *
     * @return {@code stalled} 状态。当播放器的缓冲区没有足够的数据支持继续播放时，则返回 true。
     */
    public boolean isStalled() {
        return stalled;
    }

    /**
     * 设置 {@code stalled} 状态。
     *
     * <b>{@code stalled} 状态</b>：播放器的缓冲区中没有足够的数据支持播放器继续播放时的状态。
     *
     * @param stalled {@code stalled} 状态
     */
    public void setStalled(boolean stalled) {
        this.stalled = stalled;
    }

    /**
     * 获取错误码。如果没有发生任何错误，则返回 {@link ErrorCode#NO_ERROR}。
     *
     * @see ErrorCode
     */
    public int getErrorCode() {
        return errorCode;
    }

    /**
     * 设置错误码。
     *
     * @param errorCode 错误码。预定义错误码，请查看 {@link ErrorCode} 类。
     * @see ErrorCode
     */
    public void setErrorCode(int errorCode) {
        this.errorCode = errorCode;
    }

    /**
     * 获取错误信息。
     */
    public String getErrorMessage() {
        return errorMessage;
    }

    /**
     * 设置错误信息（不能为 null）。
     *
     * @param errorMessage 错误信息（不能为 null）。
     * @see ErrorCode#getErrorMessage(Context, int)
     */
    public void setErrorMessage(@NonNull String errorMessage) {
        Preconditions.checkNotNull(errorMessage);
        this.errorMessage = errorMessage;
    }

    /**
     * 是否禁用 seekTo 操作。
     * <p>
     * 如果该方法返回 true，则会同时禁用 seekTo、fastForward、rewind 操作。
     *
     * @return 是否禁用 seekTo 操作。
     */
    public boolean isForbidSeek() {
        if (musicItem == null) {
            return true;
        }

        return musicItem.isForbidSeek();
    }

    /**
     * 判断是否已经启动了睡眠定时器。
     *
     * @return 如果已经启动了睡眠定时器，则返回 true，否则返回 false
     */
    public boolean isSleepTimerStarted() {
        return sleepTimerStarted;
    }

    /**
     * 设置是否启动了睡眠定时器。
     */
    public void setSleepTimerStarted(boolean sleepTimerStarted) {
        this.sleepTimerStarted = sleepTimerStarted;
    }

    /**
     * 获取睡眠定时器的定时时间。
     */
    public long getSleepTimerTime() {
        return sleepTimerTime;
    }

    /**
     * 设置睡眠定时器的定时时间。
     */
    public void setSleepTimerTime(long time) {
        this.sleepTimerTime = time;
    }

    /**
     * 获取睡眠定时器的启动时间。
     */
    public long getSleepTimerStartTime() {
        return sleepTimerStartTime;
    }

    /**
     * 设置睡眠定时器的启动时间。
     */
    public void setSleepTimerStartTime(long sleepTimerStartTime) {
        this.sleepTimerStartTime = sleepTimerStartTime;
    }

    /**
     * 获取睡眠定时器的时间到时要执行的操作。
     *
     * @see snow.player.SleepTimer.TimeoutAction
     */
    @NonNull
    public SleepTimer.TimeoutAction getTimeoutAction() {
        return timeoutAction;
    }

    /**
     * 设置睡眠定时器的时间到时要执行的操作。
     *
     * @param action 睡眠定时器的时间到时要执行的操作，不能为 null
     * @see snow.player.SleepTimer.TimeoutAction
     */
    public void setTimeoutAction(@NonNull SleepTimer.TimeoutAction action) {
        Preconditions.checkNotNull(timeoutAction);
        this.timeoutAction = action;
    }

    /**
     * 睡眠定时器是否等到当前正在播放的歌曲播放完成后，再执行指定的动作。
     *
     * @return 睡眠定时器是否等到当前正在播放的歌曲播放完成后，再执行指定的动作。
     */
    public boolean isWaitPlayComplete() {
        return waitPlayComplete;
    }

    /**
     * 设置睡眠定时器是否等到当前正在播放的歌曲播放完成后，再执行指定的动作。
     *
     * @param waitPlayComplete 睡眠定时器是否等到当前正在播放的歌曲播放完成后，再执行指定的动作。
     */
    public void setWaitPlayComplete(boolean waitPlayComplete) {
        this.waitPlayComplete = waitPlayComplete;
    }

    /**
     * 睡眠定时器的定时任务是否已完成。
     *
     * @return 睡眠定时器的定时任务是否已完成。
     */
    public boolean isSleepTimerEnd() {
        return sleepTimerEnd;
    }

    /**
     * 设置睡眠定时器的定时任务是否已完成。
     *
     * @param sleepTimerEnd 睡眠定时器的定时任务是否已完成。
     */
    public void setSleepTimerEnd(boolean sleepTimerEnd) {
        this.sleepTimerEnd = sleepTimerEnd;
    }

    /**
     * 是否已到达睡眠定时器的定时时间。
     *
     * @return 是否已到达睡眠定时器的定时时间。
     */
    public boolean isSleepTimerTimeout() {
        return sleepTimerTimeout;
    }

    /**
     * 设置是否已到达睡眠定时器的定时时间。
     *
     * @param sleepTimerTimeout 是否已到达睡眠定时器的定时时间。
     */
    public void setSleepTimerTimeout(boolean sleepTimerTimeout) {
        this.sleepTimerTimeout = sleepTimerTimeout;
    }

    /**
     * 获取当前正在播放的歌曲的时长。
     *
     * @return 返回当前正在播放的歌曲的时长。如果当前没有播放任何歌曲，则返回 0。
     */
    public int getDuration() {
        if (musicItem == null) {
            return 0;
        }

        if (musicItem.isAutoDuration()) {
            return duration;
        }

        return musicItem.getDuration();
    }

    /**
     * 设置当前正在播放的歌曲的时长。
     *
     * @param duration 当前正在播放的歌曲的时长。
     */
    public void setDuration(int duration) {
        this.duration = duration;
    }

    /**
     * 设置当前音量。
     *
     * @param volume 要设置的音量（范围为 [0.0, 1.0] 之间的闭区间）。
     */
    public void setVolume(float volume) {
        this.volume = Math.min(volume, 1.0F);
    }

    /**
     * 获取当前音量。
     *
     * @return 返回播放器的当前音量（返回为 [0.0, 1.0] 之间的闭区间）。
     */
    public float getVolume() {
        return volume;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PlayerState)) return false;

        PlayerState other = (PlayerState) o;

        return Objects.equal(playProgress, other.playProgress)
                && Objects.equal(playProgressUpdateTime, other.playProgressUpdateTime)
                && Objects.equal(musicItem, other.musicItem)
                && Objects.equal(playPosition, other.playPosition)
                && Objects.equal(playMode, other.playMode)
                && Objects.equal(speed, other.speed)
                && Objects.equal(playbackState, other.playbackState)
                && Objects.equal(preparing, other.preparing)
                && Objects.equal(prepared, other.prepared)
                && Objects.equal(audioSessionId, other.audioSessionId)
                && Objects.equal(bufferedProgress, other.bufferedProgress)
                && Objects.equal(stalled, other.stalled)
                && Objects.equal(errorCode, other.errorCode)
                && Objects.equal(errorMessage, other.errorMessage)
                && Objects.equal(sleepTimerStarted, other.sleepTimerStarted)
                && Objects.equal(sleepTimerTime, other.sleepTimerTime)
                && Objects.equal(sleepTimerStartTime, other.sleepTimerStartTime)
                && Objects.equal(duration, other.duration)
                && Objects.equal(timeoutAction, other.timeoutAction)
                && Objects.equal(waitPlayComplete, other.waitPlayComplete)
                && Objects.equal(sleepTimerEnd, other.sleepTimerEnd)
                && Objects.equal(sleepTimerTimeout, other.sleepTimerTimeout)
                && Objects.equal(volume, other.volume);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(playProgress,
                playProgressUpdateTime,
                musicItem,
                playPosition,
                playMode,
                speed,
                playbackState,
                preparing,
                prepared,
                audioSessionId,
                bufferedProgress,
                stalled,
                errorCode,
                errorMessage,
                sleepTimerStarted,
                sleepTimerTime,
                sleepTimerStartTime,
                timeoutAction,
                duration,
                waitPlayComplete,
                sleepTimerEnd,
                sleepTimerTimeout,
                volume
        );
    }

    @NonNull
    @Override
    public String toString() {
        return "PlayerState{" +
                "playProgress=" + playProgress +
                ", playProgressUpdateTime=" + playProgressUpdateTime +
                ", musicItem=" + musicItem +
                ", playPosition=" + playPosition +
                ", playMode=" + playMode +
                ", speed=" + speed +
                ", playbackState=" + playbackState +
                ", preparing=" + preparing +
                ", prepared=" + prepared +
                ", audioSessionId=" + audioSessionId +
                ", bufferingPercent=" + bufferedProgress +
                ", stalled=" + stalled +
                ", errorCode=" + errorCode +
                ", errorMessage='" + errorMessage + '\'' +
                ", sleepTimerStarted=" + sleepTimerStarted +
                ", sleepTimerTime=" + sleepTimerTime +
                ", sleepTimerStartTime=" + sleepTimerStartTime +
                ", timeoutAction=" + timeoutAction +
                ", sleepTimerWaitPlayComplete=" + waitPlayComplete +
                ", timeoutActionComplete=" + sleepTimerEnd +
                ", sleepTimerTimeout=" + sleepTimerTimeout +
                ", duration=" + duration +
                ", volume=" + volume +
                '}';
    }

    protected PlayerState(Parcel in) {
        playProgress = in.readInt();
        playProgressUpdateTime = in.readLong();
        musicItem = in.readParcelable(Thread.currentThread().getContextClassLoader());
        playPosition = in.readInt();
        playMode = PlayMode.values()[in.readInt()];
        speed = in.readFloat();

        playbackState = PlaybackState.values()[in.readInt()];
        preparing = in.readByte() != 0;
        prepared = in.readByte() != 0;
        audioSessionId = in.readInt();
        bufferedProgress = in.readInt();
        stalled = in.readByte() != 0;
        errorCode = in.readInt();
        errorMessage = in.readString();
        sleepTimerStarted = in.readByte() != 0;
        sleepTimerTime = in.readLong();
        sleepTimerStartTime = in.readLong();
        timeoutAction = SleepTimer.TimeoutAction.values()[in.readInt()];
        duration = in.readInt();
        waitPlayComplete = in.readByte() != 0;
        sleepTimerEnd = in.readByte() != 0;
        sleepTimerTimeout = in.readByte() != 0;
        volume = in.readFloat();
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeInt(playProgress);
        dest.writeLong(playProgressUpdateTime);
        dest.writeParcelable(musicItem, flags);
        dest.writeInt(playPosition);
        dest.writeInt(playMode.ordinal());
        dest.writeFloat(speed);

        dest.writeInt(playbackState.ordinal());
        dest.writeByte((byte) (preparing ? 1 : 0));
        dest.writeByte((byte) (prepared ? 1 : 0));
        dest.writeInt(audioSessionId);
        dest.writeInt(bufferedProgress);
        dest.writeByte((byte) (stalled ? 1 : 0));
        dest.writeInt(errorCode);
        dest.writeString(errorMessage);
        dest.writeByte((byte) (sleepTimerStarted ? 1 : 0));
        dest.writeLong(sleepTimerTime);
        dest.writeLong(sleepTimerStartTime);
        dest.writeInt(timeoutAction.ordinal());
        dest.writeInt(duration);
        dest.writeByte((byte) (waitPlayComplete ? 1 : 0));
        dest.writeByte((byte) (sleepTimerEnd ? 1 : 0));
        dest.writeByte((byte) (sleepTimerTimeout ? 1 : 0));
        dest.writeFloat(volume);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<PlayerState> CREATOR = new Creator<PlayerState>() {
        @Override
        public PlayerState createFromParcel(Parcel in) {
            return new PlayerState(in);
        }

        @Override
        public PlayerState[] newArray(int size) {
            return new PlayerState[size];
        }
    };
}
