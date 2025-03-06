package snow.player;

import android.os.SystemClock;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.common.base.Preconditions;

import snow.player.audio.ErrorCode;
import snow.player.audio.MusicItem;

class PlayerStateHelper {
    private final PlayerState mPlayerState;

    public PlayerStateHelper(@NonNull PlayerState playerState) {
        Preconditions.checkNotNull(playerState);

        mPlayerState = playerState;
    }

    protected PlayerState getPlayerState() {
        return mPlayerState;
    }

    void updatePlayProgress(int progress, long updateTime) {
        mPlayerState.setPlayProgress(progress);
        mPlayerState.setPlayProgressUpdateTime(updateTime);
    }

    public void onPreparing() {
        mPlayerState.setPreparing(true);
        mPlayerState.setPrepared(false);

        if (mPlayerState.getPlaybackState() == PlaybackState.ERROR) {
            mPlayerState.setPlaybackState(PlaybackState.NONE);
            mPlayerState.setErrorCode(ErrorCode.NO_ERROR);
            mPlayerState.setErrorMessage("");
        }
    }

    public void onPrepared(int audioSessionId, int duration) {
        mPlayerState.setPreparing(false);
        mPlayerState.setPrepared(true);
        mPlayerState.setAudioSessionId(audioSessionId);
        mPlayerState.setDuration(duration);
    }

    public void clearPrepareState() {
        mPlayerState.setPreparing(false);
        mPlayerState.setPrepared(false);
    }

    public void onPlay(boolean stalled, int progress, long updateTime) {
        mPlayerState.setStalled(stalled);
        mPlayerState.setPlaybackState(PlaybackState.PLAYING);
        updatePlayProgress(progress, updateTime);
    }

    public void onPaused(int playProgress, long updateTime) {
        mPlayerState.setPlaybackState(PlaybackState.PAUSED);
        mPlayerState.setPlayProgress(playProgress);
        mPlayerState.setPlayProgressUpdateTime(updateTime);
    }

    public void onStopped() {
        mPlayerState.setPlaybackState(PlaybackState.STOPPED);
        long updateTime = SystemClock.elapsedRealtime();
        updatePlayProgress(0, updateTime);
        clearPrepareState();
    }

    public void onStalled(boolean stalled, int playProgress, long updateTime) {
        mPlayerState.setStalled(stalled);
        updatePlayProgress(playProgress, updateTime);
    }

    public void onRepeat(long repeatTime) {
        updatePlayProgress(0, repeatTime);
    }

    public void onError(int errorCode, String errorMessage) {
        mPlayerState.setPlaybackState(PlaybackState.ERROR);
        mPlayerState.setErrorCode(errorCode);
        mPlayerState.setErrorMessage(errorMessage);
        clearPrepareState();
    }

    public void onBufferedChanged(int bufferedProgress) {
        mPlayerState.setBufferedProgress(bufferedProgress);
    }

    public void onPlayingMusicItemChanged(@Nullable MusicItem musicItem, int position, int playProgress) {
        mPlayerState.setMusicItem(musicItem);
        mPlayerState.setPlayPosition(position);
        mPlayerState.setBufferedProgress(0);

        long updateTime = SystemClock.elapsedRealtime();
        updatePlayProgress(playProgress, updateTime);

        if (mPlayerState.getPlaybackState() == PlaybackState.ERROR) {
            mPlayerState.setPlaybackState(PlaybackState.NONE);
            mPlayerState.setErrorCode(ErrorCode.NO_ERROR);
            mPlayerState.setErrorMessage("");
        }
    }

    public void onSeekComplete(int playProgress, long updateTime, boolean stalled) {
        updatePlayProgress(playProgress, updateTime);
        mPlayerState.setStalled(stalled);
    }

    public void onPlaylistChanged(int position) {
        mPlayerState.setPlayPosition(position);
    }

    public void onPlayModeChanged(PlayMode playMode) {
        mPlayerState.setPlayMode(playMode);
    }

    public void onSpeedChanged(float speed, int progress, long updateTime) {
        mPlayerState.setSpeed(speed);
        updatePlayProgress(progress, updateTime);
    }

    public void onSleepTimerStart(long time, long startTime, SleepTimer.TimeoutAction action) {
        mPlayerState.setSleepTimerStarted(true);
        mPlayerState.setSleepTimerTime(time);
        mPlayerState.setSleepTimerStartTime(startTime);
        mPlayerState.setTimeoutAction(action);
        mPlayerState.setSleepTimerEnd(false);
        mPlayerState.setSleepTimerTimeout(false);
    }

    public void onSleepTimerTimeout(boolean actionComplete) {
        mPlayerState.setSleepTimerTimeout(true);
        mPlayerState.setSleepTimerEnd(actionComplete);
    }

    public void onSleepTimerEnd() {
        mPlayerState.setSleepTimerStarted(false);
        mPlayerState.setSleepTimerTime(0);
        mPlayerState.setSleepTimerStartTime(0);
        mPlayerState.setSleepTimerEnd(true);
    }

    public void onWaitPlayCompleteChanged(boolean waitPlayComplete) {
        mPlayerState.setWaitPlayComplete(waitPlayComplete);
    }

    public void onVolumeChanged(float volume) {
        mPlayerState.setVolume(volume);
    }
}
