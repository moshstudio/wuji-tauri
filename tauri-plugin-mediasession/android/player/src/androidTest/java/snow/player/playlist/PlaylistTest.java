package snow.player.playlist;

import android.os.Bundle;
import android.os.Parcel;

import org.junit.Before;
import org.junit.Test;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.runner.RunWith;

import java.util.ArrayList;
import java.util.List;

import snow.player.audio.MusicItem;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PlaylistTest {
    private List<MusicItem> mItems;
    private Playlist mPlaylist;
    private final int mSize = 100;

    @Before
    public void initPlaylist() {
        mItems = new ArrayList<>(mSize);
        for (int i = 0; i < mSize; i++) {
            mItems.add(generateMusicItem(i));
        }

        mPlaylist = new Playlist.Builder()
                .appendAll(mItems)
                .build();
    }

    private static MusicItem generateMusicItem(int id) {
        MusicItem musicItem = new MusicItem();

        musicItem.setMusicId("au" + id);
        musicItem.setTitle("test_" + id);
        musicItem.setArtist("artist_" + id);
        musicItem.setAlbum("album_" + id);
        musicItem.setUri("https://www.test.com/test_" + id + ".mp3");
        musicItem.setUri("https://www.test.com/icon_test" + id + ".png");
        musicItem.setDuration(1000 * id);

        return musicItem;
    }

    @Test
    public void constructorTest() {
        List<MusicItem> items = new ArrayList<>();

        MusicItem item0 = generateMusicItem(0);
        MusicItem item1 = generateMusicItem(1);
        MusicItem item2 = generateMusicItem(2);
        MusicItem item3 = generateMusicItem(3);

        items.add(item0);
        items.add(item0);
        items.add(item1);
        items.add(item2);
        items.add(item2);
        items.add(item3);
        items.add(item3);
        items.add(item0);
        items.add(item0);

        Playlist playlist = new Playlist.Builder()
                .appendAll(items)
                .build();

        assertEquals(4, playlist.size());
    }

    @Test
    public void getName() {
        final String name = "test_name";

        Playlist playlist = new Playlist.Builder()
                .setName(name)
                .build();

        assertEquals(name, playlist.getName());
    }

    @Test
    public void isEditable() {
        final boolean editable = false;

        Playlist playlist = new Playlist.Builder()
                .setEditable(editable)
                .build();

        assertEquals(editable, playlist.isEditable());
    }

    @Test
    public void contains() {
        MusicItem musicItem1 = generateMusicItem(1);
        MusicItem musicItem2 = generateMusicItem(mSize);

        assertTrue(mPlaylist.contains(musicItem1));
        assertFalse(mPlaylist.contains(musicItem2));
    }

    @Test
    public void get() {
        final int index = 1;
        MusicItem musicItem = generateMusicItem(index);
        assertEquals(musicItem, mPlaylist.get(index));
    }

    @Test
    public void indexOf() {
        final int index = 1;

        MusicItem musicItem1 = generateMusicItem(index);
        MusicItem musicItem2 = generateMusicItem(mSize);

        assertEquals(index, mPlaylist.indexOf(musicItem1));
        assertEquals(-1, mPlaylist.indexOf(musicItem2));
    }

    @Test
    public void isEmpty() {
        assertFalse(mPlaylist.isEmpty());

        Playlist playlist = new Playlist.Builder()
                .build();

        assertTrue(playlist.isEmpty());
    }

    @Test
    public void iterator() {
        assertNotNull(mPlaylist.iterator());
    }

    @Test
    public void size() {
        assertEquals(mSize, mPlaylist.size());
    }

    @Test
    public void getAllMusicItem() {
        List<MusicItem> items = mPlaylist.getAllMusicItem();
        assertEquals(mPlaylist.size(), items.size());

        items.remove(0);
        assertEquals(mSize, mPlaylist.size());

        items.add(generateMusicItem(mSize));
        assertEquals(mSize, mPlaylist.size());
    }

    @Test
    public void equalsTest() {
        final String name = "test_name";
        final boolean editable = false;

        Playlist playlist1 = new Playlist.Builder()
                .setName(name)
                .appendAll(mItems)
                .setEditable(editable)
                .build();

        Playlist playlist2 = new Playlist.Builder()
                .setName(name)
                .appendAll(mItems)
                .setEditable(editable)
                .build();

        Playlist playlist3 = new Playlist.Builder()
                .setName("test_other_name")
                .appendAll(mItems)
                .setEditable(editable)
                .build();

        assertEquals(playlist1, playlist2);
        assertNotEquals(playlist1, playlist3);
    }

    @Test
    public void hashCodeTest() {
        final String name = "test_name";
        final boolean editable = false;

        Playlist playlist1 = new Playlist.Builder()
                .setName(name)
                .appendAll(mItems)
                .setEditable(editable)
                .build();

        Playlist playlist2 = new Playlist.Builder()
                .setName(name)
                .appendAll(mItems)
                .setEditable(editable)
                .build();

        Playlist playlist3 = new Playlist.Builder()
                .setName("test_other_name")
                .appendAll(mItems)
                .setEditable(editable)
                .build();

        assertEquals(playlist1.hashCode(), playlist2.hashCode());
        assertNotEquals(playlist1.hashCode(), playlist3.hashCode());
    }

    @Test
    public void parcelableTest() {
        Parcel parcel = Parcel.obtain();

        final String name = "test_name";
        final boolean editable = false;

        List<MusicItem> items = new ArrayList<>();
        items.add(generateMusicItem(1));
        items.add(generateMusicItem(2));
        items.add(generateMusicItem(3));

        Bundle extra = new Bundle();

        final String key = "name";
        final String value = "tom";
        extra.putString(key, value);

        Playlist playlist = new Playlist(name, items, editable, extra);

        playlist.writeToParcel(parcel, 0);

        parcel.setDataPosition(0);

        Playlist other = new Playlist(parcel);

        assertEquals(playlist, other);
        assertNotNull(other.getExtra());
        assertEquals(value, other.getExtra().getString(key));
        parcel.recycle();
    }
}
