package snow.player;

import android.os.Parcel;
import android.os.SystemClock;

import org.junit.Test;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.runner.RunWith;

import snow.player.audio.MusicItem;
import snow.player.audio.ErrorCode;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PlayerStateTest {

    @Test
    public void defaultConstructorTest() {
        PlayerState playerState = new PlayerState();

        assertEquals(0, playerState.getPlayProgress());
        assertEquals(0, playerState.getPlayProgressUpdateTime());
        assertEquals(0, playerState.getPlayPosition());
        assertEquals(PlayMode.PLAYLIST_LOOP, playerState.getPlayMode());

        assertEquals(PlaybackState.NONE, playerState.getPlaybackState());
        assertFalse(playerState.isPreparing());
        assertFalse(playerState.isPrepared());
        assertEquals(0, playerState.getAudioSessionId());
        assertEquals(0, playerState.getBufferedProgress());
        assertFalse(playerState.isStalled());
        assertEquals(ErrorCode.NO_ERROR, playerState.getErrorCode());
        assertNotNull(playerState.getErrorMessage());
        assertFalse(playerState.isSleepTimerStarted());
        assertEquals(0, playerState.getSleepTimerTime());
        assertEquals(0, playerState.getSleepTimerStartTime());
        assertEquals(SleepTimer.TimeoutAction.PAUSE, playerState.getTimeoutAction());
    }

    @Test
    public void copyConstructorTest() {
        PlayerState source = new PlayerState();
        source.setPlayProgress(1000);
        source.setPlayProgressUpdateTime(SystemClock.elapsedRealtime());
        source.setMusicItem(new MusicItem());
        source.setPlayPosition(15);
        source.setPlayMode(PlayMode.LOOP);
        source.setPlaybackState(PlaybackState.ERROR);
        source.setPreparing(false);
        source.setPrepared(true);
        source.setAudioSessionId(12);
        source.setBufferedProgress(100);
        source.setStalled(true);
        source.setErrorCode(ErrorCode.PLAYER_ERROR);
        source.setErrorMessage("player error");
        source.setSleepTimerStarted(true);
        source.setSleepTimerTime(60_000);
        source.setSleepTimerStartTime(System.currentTimeMillis());
        source.setTimeoutAction(SleepTimer.TimeoutAction.STOP);

        PlayerState copy = new PlayerState(source);

        assertEquals(source, copy);
    }

    @Test
    public void setPlaybackState() {
        PlayerState playerState = new PlayerState();

        final int errorCode = ErrorCode.PLAYER_ERROR;

        playerState.setErrorCode(errorCode);

        assertEquals(errorCode, playerState.getErrorCode());

        playerState.setPlaybackState(PlaybackState.PLAYING);
        assertEquals(ErrorCode.NO_ERROR, playerState.getErrorCode());
    }

    @Test
    public void equals_hashCode() {
        final int playProgress = 1000;
        final long playProgressUpdateTime = SystemClock.elapsedRealtime();
        final MusicItem musicItem = new MusicItem();
        musicItem.setTitle("Test Title");
        musicItem.setArtist("Test Artist");
        musicItem.setUri("https://www.test.com/test.mp3");
        final int position = 5;
        final PlayMode playMode = PlayMode.SHUFFLE;
        final PlaybackState playbackState = PlaybackState.PLAYING;
        final boolean preparing = false;
        final boolean prepared = true;
        final int audioSessionId = 12;
        final int bufferedProgress = 100;
        final boolean stalled = true;
        final int errorCode = ErrorCode.PLAYER_ERROR;
        final String errorMessage = "player error";
        final boolean sleepTimerStarted = true;
        final long sleepTimerTime = 60_000;
        final long sleepTimerStartTime = System.currentTimeMillis();
        final SleepTimer.TimeoutAction timeoutAction = SleepTimer.TimeoutAction.STOP;

        PlayerState playerState = new PlayerState();
        playerState.setPlayProgress(playProgress);
        playerState.setPlayProgressUpdateTime(playProgressUpdateTime);
        playerState.setMusicItem(musicItem);
        playerState.setPlayPosition(position);
        playerState.setPlayMode(playMode);
        playerState.setPlaybackState(playbackState);
        playerState.setPreparing(preparing);
        playerState.setPrepared(prepared);
        playerState.setAudioSessionId(audioSessionId);
        playerState.setBufferedProgress(bufferedProgress);
        playerState.setStalled(stalled);
        playerState.setErrorCode(errorCode);
        playerState.setErrorMessage(errorMessage);
        playerState.setSleepTimerStarted(sleepTimerStarted);
        playerState.setSleepTimerTime(sleepTimerTime);
        playerState.setSleepTimerStartTime(sleepTimerStartTime);
        playerState.setTimeoutAction(timeoutAction);

        PlayerState other1 = new PlayerState();
        other1.setPlayProgress(playProgress);
        other1.setPlayProgressUpdateTime(playProgressUpdateTime);
        other1.setMusicItem(musicItem);
        other1.setPlayPosition(position);
        other1.setPlayMode(playMode);
        other1.setPlaybackState(playbackState);
        other1.setPreparing(preparing);
        other1.setPrepared(prepared);
        other1.setAudioSessionId(audioSessionId);
        other1.setBufferedProgress(bufferedProgress);
        other1.setStalled(stalled);
        other1.setErrorCode(errorCode);
        other1.setErrorMessage(errorMessage);
        other1.setSleepTimerStarted(sleepTimerStarted);
        other1.setSleepTimerTime(sleepTimerTime);
        other1.setSleepTimerStartTime(sleepTimerStartTime);
        other1.setTimeoutAction(timeoutAction);

        assertEquals(playerState, other1);
        assertEquals(playerState.hashCode(), other1.hashCode());

        PlayerState other2 = new PlayerState(playerState);
        other2.setPlayProgress(other2.getPlayProgress() + 1000);

        assertNotEquals(playerState, other2);
        assertNotEquals(playerState.hashCode(), other2.hashCode());
    }

    @Test
    public void parcelableTest() {
        final int playProgress = 1000;
        final long playProgressUpdateTime = SystemClock.elapsedRealtime();
        final MusicItem musicItem = new MusicItem();
        musicItem.setTitle("Test Title");
        musicItem.setArtist("Test Artist");
        musicItem.setUri("https://www.test.com/test.mp3");
        final int position = 5;
        final PlayMode playMode = PlayMode.SHUFFLE;
        final PlaybackState playbackState = PlaybackState.PLAYING;
        final boolean preparing = false;
        final boolean prepared = true;
        final int audioSessionId = 12;
        final int bufferedProgress = 100;
        final boolean stalled = true;
        final int errorCode = ErrorCode.PLAYER_ERROR;
        final String errorMessage = "player error";
        final boolean sleepTimerStarted = true;
        final long sleepTimerTime = 60_000;
        final long sleepTimerStartTime = System.currentTimeMillis();
        final SleepTimer.TimeoutAction timeoutAction = SleepTimer.TimeoutAction.STOP;

        PlayerState playerState = new PlayerState();
        playerState.setPlayProgress(playProgress);
        playerState.setPlayProgressUpdateTime(playProgressUpdateTime);
        playerState.setMusicItem(musicItem);
        playerState.setPlayPosition(position);
        playerState.setPlayMode(playMode);
        playerState.setPlaybackState(playbackState);
        playerState.setPreparing(preparing);
        playerState.setPrepared(prepared);
        playerState.setAudioSessionId(audioSessionId);
        playerState.setBufferedProgress(bufferedProgress);
        playerState.setStalled(stalled);
        playerState.setErrorCode(errorCode);
        playerState.setErrorMessage(errorMessage);
        playerState.setSleepTimerStarted(sleepTimerStarted);
        playerState.setSleepTimerTime(sleepTimerTime);
        playerState.setSleepTimerStartTime(sleepTimerStartTime);
        playerState.setTimeoutAction(timeoutAction);

        Parcel parcel = Parcel.obtain();

        playerState.writeToParcel(parcel, 0);

        parcel.setDataPosition(0);

        PlayerState other = new PlayerState(parcel);

        assertEquals(playerState, other);
    }

    @Test
    public void isForbidSeek() {
        PlayerState playerState = new PlayerState();

        playerState.setMusicItem(null);

        // assert
        assertTrue(playerState.isForbidSeek());

        MusicItem musicItem = new MusicItem();
        playerState.setMusicItem(musicItem);

        musicItem.setForbidSeek(true);

        // assert
        assertEquals(playerState.isForbidSeek(), musicItem.isForbidSeek());

        musicItem.setForbidSeek(false);

        // assert
        assertEquals(playerState.isForbidSeek(), musicItem.isForbidSeek());
    }
}