package snow.player;

import android.annotation.SuppressLint;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.common.base.Preconditions;
import com.tencent.mmkv.MMKV;

import io.reactivex.Single;
import io.reactivex.SingleEmitter;
import io.reactivex.SingleOnSubscribe;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;
import snow.player.playlist.Playlist;
import snow.player.playlist.PlaylistManager;

/**
 * 用于获取和持久化保存播放器的播放列表。
 */
class PlaylistManagerImp implements PlaylistManager {
    private static final String KEY_PLAYLIST = "playlist";
    private static final String KEY_PLAYLIST_SIZE = "playlist_size";
    private static final String KEY_NAME = "name";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_EDITABLE = "editable";
    private static final String KEY_LAST_MODIFIED = "last_modified";

    private final MMKV mMMKV;
    private Disposable mSaveDisposable;

    /**
     * 创建一个 PlaylistManagerImp 对象。
     *
     * @param context    {@link Context} 对象，不能为 null
     * @param playlistId 播放列表的 ID，不能为 null。该 ID 会用于持久化保存播放列表，请保证该 ID 的唯一性。
     *                   默认使用 {@link snow.player.PlayerService} 的 {@link Class} 对象的
     *                   {@link Class#getName()} 作为 ID
     */
    PlaylistManagerImp(@NonNull Context context, @NonNull String playlistId) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playlistId);

        MMKV.initialize(context);
        mMMKV = MMKV.mmkvWithID("PlaylistManager:" + playlistId, MMKV.MULTI_PROCESS_MODE);
    }

    @NonNull
    @Override
    public String getPlaylistName() {
        return mMMKV.decodeString(KEY_NAME, "");
    }

    @Override
    public int getPlaylistSize() {
        return mMMKV.decodeInt(KEY_PLAYLIST_SIZE, 0);
    }

    @NonNull
    @Override
    public String getPlaylistToken() {
        return mMMKV.decodeString(KEY_TOKEN, "");
    }

    @Override
    public boolean isPlaylistEditable() {
        return mMMKV.decodeBool(KEY_EDITABLE, true);
    }

    @SuppressWarnings("ResultOfMethodCallIgnored")
    @SuppressLint("CheckResult")
    @Override
    public void getPlaylist(@NonNull final Callback callback) {
        Single.create(new SingleOnSubscribe<Playlist>() {
            @Override
            public void subscribe(SingleEmitter<Playlist> emitter) {
                Playlist playlist = mMMKV.decodeParcelable(KEY_PLAYLIST, Playlist.class);
                if (playlist == null) {
                    playlist = new Playlist.Builder().build();
                }
                emitter.onSuccess(playlist);
            }
        }).subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<Playlist>() {
                    @Override
                    public void accept(Playlist playlist) {
                        callback.onFinished(playlist);
                    }
                });
    }

    @Override
    public long getLastModified() {
        return mMMKV.decodeLong(KEY_LAST_MODIFIED, System.currentTimeMillis());
    }

    /**
     * 将 Playlist 持久化保存到本地存储器。该方法会异步执行。
     * <p>
     * 如果在播放列表保存完成前再次调用了该方法，则会取消上次的保存，然后执行本次的保存。
     *
     * @param playlist  要保存到本地存储器的播放列表
     * @param doOnSaved 保持完成后要执行的动作，会在主线程上执行
     */
    public void save(@NonNull final Playlist playlist, @Nullable final Runnable doOnSaved) {
        Preconditions.checkNotNull(playlist);

        disposeLastSave();
        mSaveDisposable = Single.create(new SingleOnSubscribe<Boolean>() {
            @Override
            public void subscribe(SingleEmitter<Boolean> emitter) {
                if (emitter.isDisposed()) {
                    return;
                }

                mMMKV.encode(KEY_PLAYLIST, playlist);
                mMMKV.encode(KEY_PLAYLIST_SIZE, playlist.size());
                mMMKV.encode(KEY_NAME, playlist.getName());
                mMMKV.encode(KEY_TOKEN, playlist.getToken());
                mMMKV.encode(KEY_EDITABLE, playlist.isEditable());
                mMMKV.encode(KEY_LAST_MODIFIED, System.currentTimeMillis());

                if (emitter.isDisposed()) {
                    return;
                }
                emitter.onSuccess(true);
            }
        }).subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<Boolean>() {
                    @Override
                    public void accept(Boolean aBoolean) {
                        if (doOnSaved != null) {
                            doOnSaved.run();
                        }
                    }
                });
    }

    private void disposeLastSave() {
        if (mSaveDisposable != null && !mSaveDisposable.isDisposed()) {
            mSaveDisposable.dispose();
        }
    }
}
