package snow.player;

import channel.helper.Channel;

@Channel
public interface PlayerStateListener extends Player.OnPlaybackStateChangeListener,
        Player.OnPrepareListener2,
        Player.OnStalledChangeListener,
        Player.OnBufferedProgressChangeListener,
        Player.OnPlayingMusicItemChangeListener,
        Player.OnSeekCompleteListener,
        Player.OnPlaylistChangeListener,
        Player.OnPlayModeChangeListener,
        Player.OnRepeatListener,
        Player.OnSpeedChangeListener,
        Player.OnVolumeChaneListener {
    /**
     * 当服务端准备关闭时会回调该方法，此时客户端应主动断开与服务端的连接。
     */
    void onShutdown();
}
