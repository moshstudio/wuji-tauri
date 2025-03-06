package snow.player.lifecycle;

import androidx.annotation.NonNull;
import androidx.lifecycle.LiveData;

import com.google.common.base.Preconditions;

import snow.player.Player;
import snow.player.PlayerClient;
import snow.player.playlist.Playlist;
import snow.player.playlist.PlaylistManager;

/**
 * 用于监听 {@link PlayerClient} 的播放列表。
 * <p>
 * 情况下，{@link PlaylistLiveData} 是惰性的，它只会在 onActive 时开始监听 {@link PlayerClient} 的播放列表，
 * 并且会在 onInactive 时自动取消对 {@link PlayerClient} 的播放列表的监听。
 */
public class PlaylistLiveData extends LiveData<Playlist>
        implements Player.OnPlaylistChangeListener {
    private static final String TAG = "PlaylistLiveData";
    private PlayerClient mPlayerClient;
    private boolean mLazy;

    /**
     * 创建一个 {@link PlaylistLiveData} 对象。
     * <p>
     * 使用该构造器创建的 {@link PlaylistLiveData} 对象默认是惰性的，只会在 onActive 时开始监听
     * {@link PlayerClient} 的播放列表，并且会在 onInactive 时自动取消对 {@link PlayerClient}
     * 的播放列表的监听。
     *
     * @param playerClient {@link PlayerClient} 对象，不能为 null
     * @param value        LiveData 的初始化值
     */
    public PlaylistLiveData(@NonNull PlayerClient playerClient, Playlist value) {
        this(playerClient, value, true);
    }

    /**
     * 创建一个 {@link PlaylistLiveData} 对象。
     *
     * @param playerClient {@link PlayerClient} 对象，不能为 null
     * @param value        LiveData 的初始化值
     * @param lazy         当前 LiveData 是否是惰性的。如果是，则只会在 onActive 时开始监听
     *                     {@link PlayerClient} 的播放列表，并且会在 onInactive 时自动取消对
     *                     {@link PlayerClient} 的播放列表的监听。
     */
    public PlaylistLiveData(@NonNull PlayerClient playerClient, Playlist value, boolean lazy) {
        super(value);
        Preconditions.checkNotNull(playerClient);

        mPlayerClient = playerClient;
        mLazy = lazy;

        if (mLazy) {
            return;
        }

        observePlaylist();
    }

    /**
     * 当前 LiveData 是否是惰性的。
     *
     * @return 如果当前 LiveData 是惰性的，则返回 true，否则返回 false
     */
    public boolean isLazy() {
        return mLazy;
    }

    @Override
    protected void onActive() {
        observePlaylist();
    }

    @Override
    protected void onInactive() {
        mPlayerClient.removeOnPlaylistChangeListener(this);
    }

    @Override
    public void onPlaylistChanged(PlaylistManager playlistManager, int position) {
        playlistManager.getPlaylist(new PlaylistManager.Callback() {
            @Override
            public void onFinished(@NonNull Playlist playlist) {
                setValue(playlist);
            }
        });
    }

    private void observePlaylist() {
        mPlayerClient.addOnPlaylistChangeListener(this);
    }
}
