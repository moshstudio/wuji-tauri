package snow.player.audio;

import android.os.Bundle;
import android.os.Parcel;

import org.junit.Test;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.runner.RunWith;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class MusicItemTest {

    @Test
    public void defaultConstructorTest() {
        MusicItem musicItem = new MusicItem();

        assertNotNull(musicItem.getMusicId());
        assertNotNull(musicItem.getTitle());
        assertNotNull(musicItem.getArtist());
        assertNotNull(musicItem.getAlbum());
        assertNotNull(musicItem.getUri());
        assertNotNull(musicItem.getIconUri());
        assertEquals(0, musicItem.getDuration());
        assertFalse(musicItem.isForbidSeek());
    }

    @Test
    public void copyConstructorTest() {
        MusicItem source = new MusicItem();

        source.setMusicId("1024");
        source.setTitle("test");
        source.setArtist("test");
        source.setAlbum("test");
        source.setUri("https://www.test.com/test.mp3");
        source.setIconUri("https://www.test.com/icon_test.png");
        source.setDuration(1000);
        source.setForbidSeek(true);

        MusicItem copy = new MusicItem(source);

        // assert
        assertEquals(source, copy);

        Bundle extra = new Bundle();
        extra.putString("key_test", "value_test");

        source.setExtra(extra);

        // assert
        assertEquals(source, copy);
    }

    @Test
    public void equals_hashCodeTest() {
        final String musicId = "1234";
        final String title = "test_title";
        final String artist = "test_artist";
        final String album = "test_album";
        final String uri = "http://www.text.com/test.mp3";
        final String iconUri = "http://www.text.com/test.png";
        final int duration = 10000;
        final boolean forbidSeek = true;

        MusicItem musicItemA = new MusicItem();
        musicItemA.setMusicId(musicId);
        musicItemA.setTitle(title);
        musicItemA.setArtist(artist);
        musicItemA.setAlbum(album);
        musicItemA.setUri(uri);
        musicItemA.setIconUri(iconUri);
        musicItemA.setDuration(duration);
        musicItemA.setForbidSeek(forbidSeek);

        MusicItem musicItemB = new MusicItem();
        musicItemB.setMusicId(musicId);
        musicItemB.setTitle(title);
        musicItemB.setArtist(artist);
        musicItemB.setAlbum(album);
        musicItemB.setUri(uri);
        musicItemB.setIconUri(iconUri);
        musicItemB.setDuration(duration);
        musicItemB.setForbidSeek(forbidSeek);

        assertEquals(musicItemA, musicItemB);
        assertEquals(musicItemA.hashCode(), musicItemB.hashCode());
    }

    @Test
    public void parcelableTest() {
        MusicItem musicItem = new MusicItem();

        musicItem.setMusicId("1024");
        musicItem.setTitle("test");
        musicItem.setArtist("test");
        musicItem.setAlbum("test");
        musicItem.setUri("https://www.test.com/test.mp3");
        musicItem.setUri("https://www.test.com/icon_test.png");
        musicItem.setDuration(1000);
        musicItem.setForbidSeek(true);

        Parcel parcel = Parcel.obtain();
        musicItem.writeToParcel(parcel, 0);

        parcel.setDataPosition(0);
        MusicItem other = new MusicItem(parcel);

        // assert
        assertEquals(musicItem, other);

        Bundle extra = new Bundle();
        extra.putString("key_test", "value_test");

        musicItem.setExtra(extra);

        parcel.setDataPosition(0);
        musicItem.writeToParcel(parcel, 0);

        parcel.setDataPosition(0);
        other = new MusicItem(parcel);

        // assert
        assertEquals(musicItem, other);
    }
}
