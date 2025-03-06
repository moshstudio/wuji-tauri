package snow.player;

import android.content.Context;
import org.junit.Test;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.runner.RunWith;

import snow.player.audio.MusicItem;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PersistentPlayerStateTest {

    private Context getContext() {
        return InstrumentationRegistry.getInstrumentation().getContext();
    }

    @Test
    public void persistentTest() {
        final int playProgress = 1024;
        final MusicItem musicItem = new MusicItem();
        musicItem.setTitle("PersistentPlayerStateTest");
        musicItem.setArtist("PersistentPlayerStateTest");
        musicItem.setUri("https://www.persistent_test.com/test.mp3");
        final int position = 100;
        final PlayMode playMode = PlayMode.SHUFFLE;

        final String id = "PersistentPlayerStateTest";
        PersistentPlayerState persistentPlayerState = new PersistentPlayerState(getContext(), id);
        persistentPlayerState.setMusicItem(musicItem);
        persistentPlayerState.setPlayProgress(playProgress);    // 应该在调用该方法前调用 setMusicItem 方法
        persistentPlayerState.setPlayPosition(position);
        persistentPlayerState.setPlayMode(playMode);

        PersistentPlayerState other = new PersistentPlayerState(getContext(), id);
        assertEquals(playProgress, other.getPlayProgress());
        assertEquals(musicItem, other.getMusicItem());
        assertEquals(position, other.getPlayPosition());
        assertEquals(playMode, other.getPlayMode());
    }

    @Test
    public void forbidSeekTest() {
        final int playProgress = 1024;
        final MusicItem musicItem = new MusicItem();
        musicItem.setTitle("PersistentPlayerStateTest");
        musicItem.setArtist("PersistentPlayerStateTest");
        musicItem.setUri("https://www.persistent_test.com/test.mp3");
        musicItem.setForbidSeek(true);

        final int position = 100;
        final PlayMode playMode = PlayMode.SHUFFLE;

        final String id = "PersistentPlayerStateTest";
        PersistentPlayerState persistentPlayerState = new PersistentPlayerState(getContext(), id);
        persistentPlayerState.setMusicItem(musicItem);
        persistentPlayerState.setPlayProgress(playProgress);    // 应该在调用该方法前调用 setMusicItem 方法
        persistentPlayerState.setPlayPosition(position);
        persistentPlayerState.setPlayMode(playMode);

        PersistentPlayerState other = new PersistentPlayerState(getContext(), id);
        assertEquals(0, other.getPlayProgress());
        assertEquals(musicItem, other.getMusicItem());
        assertEquals(position, other.getPlayPosition());
        assertEquals(playMode, other.getPlayMode());
    }
}
