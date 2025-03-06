package snow.player;

import androidx.annotation.NonNull;

import channel.helper.Channel;

/**
 * 播放器状态同步器，用于同步客户端与服务端的播放器状态。
 */
@Channel
public interface PlayerStateSynchronizer {
    /**
     * 同步客户端与服务端的状态信息。
     * <p>
     * 该方法会在客户端连接成功后调用，以同步客户端与服务端的状态信息。
     *
     * @param clientToken 客户端的 token。不能为 null，且应该保证该参数的唯一性。该 token 会在
     *                    {@link OnSyncPlayerStateListener#onSyncPlayerState(String, PlayerState)} 方法中返回，
     *                    用于鉴别是否是当前客户端客户端。
     */
    void syncPlayerState(String clientToken);

    @Channel
    interface OnSyncPlayerStateListener {
        void onSyncPlayerState(@NonNull String clientToken, @NonNull PlayerState playerState);
    }
}
