package snow.player.util;

import androidx.annotation.NonNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import snow.player.audio.MusicItem;
import snow.player.playlist.Playlist;

/**
 * 该类用于帮助实现可拖拽播放列表。
 * <p>
 * 当拖拽列表时，可以在 {@code ItemTouchHelper.Callback} 的 {@code onMove} 方法中调用
 * {@link #move(int, int)} 方法交换列表项位置。该方法会在移动列表项位置时修正当前正在播放的歌曲在播放队列中的位置，
 * 移动歌曲后，可以使用 {@link #getPlayPosition()} 获取到正确的当前正在播放歌曲的位置。
 */
public class MovablePlaylist {
    private final List<MusicItem> mMusicItems;
    private int mPlayPosition;

    public MovablePlaylist(@NonNull Playlist playlist, int playPosition) {
        Objects.requireNonNull(playlist);

        mMusicItems = new ArrayList<>(playlist.getAllMusicItem());
        mPlayPosition = playPosition;
    }

    /**
     * 移动歌曲。
     * <p>
     * 移动歌曲后，当前正在播放的歌曲在播放队列中的位置可能也会改变。
     *
     * @param fromPosition 要移动的歌曲的位置。
     * @param toPosition   歌曲要移动到的位置。
     */
    public void move(int fromPosition, int toPosition) {
        if (fromPosition == toPosition) {
            return;
        }

        mMusicItems.add(toPosition, mMusicItems.remove(fromPosition));
        updatePlayPosition(fromPosition, toPosition);
    }

    private void updatePlayPosition(int fromPosition, int toPosition) {
        int playPosition = mPlayPosition;

        if (notInRegion(playPosition, fromPosition, toPosition)) {
            return;
        }

        if (fromPosition < playPosition) {
            playPosition -= 1;
        } else if (fromPosition == playPosition) {
            playPosition = toPosition;
        } else {
            playPosition += 1;
        }

        mPlayPosition = playPosition;
    }

    private boolean notInRegion(int position, int fromPosition, int toPosition) {
        return position > Math.max(fromPosition, toPosition) || position < Math.min(fromPosition, toPosition);
    }

    public int getPlayPosition() {
        return mPlayPosition;
    }

    public MusicItem get(int index) {
        return mMusicItems.get(index);
    }

    public int size() {
        return mMusicItems.size();
    }

    public boolean isEmpty() {
        return mMusicItems.isEmpty();
    }
}
