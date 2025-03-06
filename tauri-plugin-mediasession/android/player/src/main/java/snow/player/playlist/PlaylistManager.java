package snow.player.playlist;

import androidx.annotation.NonNull;

/**
 * 用于获取播放器的播放队列。
 */
public interface PlaylistManager {
    /**
     * 获取播放列表的名称。
     *
     * @return 播放列表的名称，如果没有设置，则返回一个空字符串。
     */
    @NonNull
    String getPlaylistName();

    /**
     * 获取当前播放队列的大小。
     * <p>
     * 这是个轻量级操作，可在 UI 线程上直接运行。
     *
     * @return 当前播放队列的大小。
     */
    int getPlaylistSize();

    /**
     * 获取播放列表的 Token
     *
     * @return 播放列表的 Token，如果没有设置，则返回一个空字符串。
     */
    @NonNull
    String getPlaylistToken();

    /**
     * 播放列表是否是可编辑的。
     *
     * @return 播放列表是否是可编辑的，如果是可编辑的，则返回 true，否则返回 false（默认为 true）。
     */
    boolean isPlaylistEditable();

    /**
     * 以异步的方式获取播放队列。
     */
    void getPlaylist(@NonNull Callback callback);

    /**
     * 获取最后一次修改播放列表的时间。
     * <p>
     * 这个时间是 {@code System.currentTimeMillis()}
     *
     * @return 最后一次修改播放列表的时间。
     */
    long getLastModified();

    /**
     * {@link #getPlaylist(Callback)} 方法的回调接口。
     */
    interface Callback {
        /**
         * 当获取播放列表成功时会调用该方法。
         *
         * @param playlist 当前播放列表
         */
        void onFinished(@NonNull Playlist playlist);
    }
}
