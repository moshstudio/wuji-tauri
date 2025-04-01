package snow.player;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.session.MediaControllerCompat;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleObserver;
import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.OnLifecycleEvent;

import com.google.common.base.Preconditions;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import channel.helper.ChannelHelper;
import channel.helper.DispatcherUtil;
import channel.helper.pipe.CustomActionPipe;
import channel.helper.pipe.SessionEventPipe;
import snow.player.audio.MusicItem;
import snow.player.playlist.Playlist;
import snow.player.playlist.PlaylistEditor;
import snow.player.playlist.PlaylistManager;
import snow.player.audio.ErrorCode;

/**
 * 播放器客户端，用于向 {@link PlayerService} 发送各种控制命令，已经监听 {@link PlayerService} 的状态改变。
 *
 * @see PlayerService
 */
public class PlayerClient implements Player, PlayerManager, PlaylistManager, PlaylistEditor, SleepTimer {
    private final Context mApplicationContext;
    public final Class<? extends PlayerService> mPlayerService;
    private final String mClientToken;
    private final String mPersistentId;

    private MediaBrowserCompat mMediaBrowser;
    private MediaControllerCompat mMediaController;
    private MediaControllerCompat.Callback mMediaControllerCallback;
    private SessionEventPipe mSessionEventDispatcher;

    private final PlayerConfig mPlayerConfig;
    private PlayerManager mPlayerManager;
    private PlayerStateSynchronizer mPlayerStateSynchronizer;
    private PlayerStateSynchronizer.OnSyncPlayerStateListener mSyncPlayerStateListener;
    private SleepTimer mSleepTimer;

    private OnConnectCallback mConnectCallback;

    private PlayerState mPlayerState;
    private PlayerStateHelper mPlayerStateHelper;

    private Player mPlayer;
    private PlaylistEditor mPlaylistEditor;
    private PlaylistManagerImp mPlaylistManager;
    private PlayerStateListenerImpl mPlayerStateListener;

    private boolean mConnecting;
    private boolean mAutoConnect;
    private Runnable mConnectedAction;

    private final List<Player.OnPlaybackStateChangeListener> mAllPlaybackStateChangeListener;
    private final List<Player.OnPrepareListener> mAllPrepareListener;
    private final List<Player.OnStalledChangeListener> mAllStalledChangeListener;
    private final List<Player.OnBufferedProgressChangeListener> mAllBufferedProgressChangeListener;
    private final List<Player.OnPlayingMusicItemChangeListener> mAllPlayingMusicItemChangeListener;
    private final List<Player.OnSeekCompleteListener> mAllSeekListener;
    private final List<Player.OnPlaylistChangeListener> mAllPlaylistChangeListener;
    private final List<Player.OnPlayModeChangeListener> mAllPlayModeChangeListener;

    private final List<PlayerClient.OnPlaybackStateChangeListener> mClientAllPlaybackStateChangeListener;
    private final List<PlayerClient.OnAudioSessionChangeListener> mAllAudioSessionChangeListener;
    private final List<SleepTimer.OnStateChangeListener> mAllSleepTimerStateChangeListener;
    private final List<SleepTimer.OnWaitPlayCompleteChangeListener> mAllWaitPlayCompleteChangeListener;
    private final List<Player.OnRepeatListener> mAllRepeatListener;
    private final List<Player.OnSpeedChangeListener> mAllSpeedChangeListener;

    private final List<OnConnectStateChangeListener> mAllConnectStateChangeListener;

    private final List<OnVolumeChaneListener> mAllVolumeChangeListener;

    private PlayerClient(Context context, Class<? extends PlayerService> playerService) {
        mApplicationContext = context.getApplicationContext();
        mPlayerService = playerService;
        mClientToken = UUID.randomUUID().toString();
        mPersistentId = PlayerService.getPersistenceId(playerService);

        mPlayerConfig = new PlayerConfig(context, mPersistentId);

        mAllPlaybackStateChangeListener = new ArrayList<>();
        mAllPrepareListener = new ArrayList<>();
        mAllStalledChangeListener = new ArrayList<>();
        mAllBufferedProgressChangeListener = new ArrayList<>();
        mAllPlayingMusicItemChangeListener = new ArrayList<>();
        mAllSeekListener = new ArrayList<>();
        mAllPlaylistChangeListener = new ArrayList<>();
        mAllPlayModeChangeListener = new ArrayList<>();
        mClientAllPlaybackStateChangeListener = new ArrayList<>();
        mAllAudioSessionChangeListener = new ArrayList<>();
        mAllSleepTimerStateChangeListener = new ArrayList<>();
        mAllWaitPlayCompleteChangeListener = new ArrayList<>();
        mAllRepeatListener = new ArrayList<>();
        mAllSpeedChangeListener = new ArrayList<>();
        mAllConnectStateChangeListener = new ArrayList<>();
        mAllVolumeChangeListener = new ArrayList<>();

        initMediaBrowser();
        initPlaylistManager();
        initPlayerStateHolder();
        initCommandCallback();
        initSessionEventDispatcher();
        initMediaControllerCallback();
        initPlayerState(new PlayerState());
    }

    /**
     * 创建一个 PlayerClient 对象。
     *
     * @param context       Context 对象，不能为 null。
     * @param playerService PlayerService 或者其子类的 Class 对象，不能为 null。
     * @return PlayerClient 对象。
     */
    public static PlayerClient newInstance(@NonNull Context context,
                                           @NonNull Class<? extends PlayerService> playerService) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerService);

        if (serviceNotFound(context, playerService)) {
            throw new IllegalArgumentException("PlayerService not found, Please check your 'AndroidManifest.xml'");
        }

        return new PlayerClient(context, playerService);
    }

    private static boolean serviceNotFound(Context context, Class<? extends PlayerService> playerService) {
        PackageManager pm = context.getPackageManager();
        Intent intent = new Intent(context, playerService);
        return pm.resolveService(intent, 0) == null;
    }

    private void initMediaBrowser() {
        mMediaBrowser = new MediaBrowserCompat(mApplicationContext,
                new ComponentName(mApplicationContext, mPlayerService),
                new MediaBrowserCompat.ConnectionCallback() {
                    @Override
                    public void onConnected() {
                        try {
                            mMediaController = new MediaControllerCompat(mApplicationContext, mMediaBrowser.getSessionToken());

                            mMediaController.registerCallback(mMediaControllerCallback, new Handler(Looper.getMainLooper()));
                            initCustomActionEmitter(mMediaController);
                            mPlayerStateSynchronizer.syncPlayerState(mClientToken);
                        } catch (Exception e) {
                            mMediaBrowser.disconnect();
                            onConnectionFailed();
                        }
                    }

                    @Override
                    public void onConnectionFailed() {
                        onDisconnected();

                        if (mConnectCallback != null) {
                            mConnectCallback.onConnected(false);
                            mConnectCallback = null;
                        }
                    }
                }, null);
    }

    private void initPlaylistManager() {
        mPlaylistManager = new PlaylistManagerImp(mApplicationContext, mPersistentId);
    }

    private void initPlayerStateHolder() {
        mPlayerStateListener = new PlayerStateListenerImpl();
    }

    private void initCommandCallback() {
        mSyncPlayerStateListener = new PlayerStateSynchronizer.OnSyncPlayerStateListener() {
            @Override
            public void onSyncPlayerState(@NonNull String clientToken, @NonNull PlayerState playerState) {
                if (!clientToken.equals(mClientToken)) {
                    return;
                }

                initPlayerState(playerState);

                if (mConnectCallback != null) {
                    mConnectCallback.onConnected(true);
                    mConnectCallback = null;
                }

                notifyConnectStateChanged(true);
                notifySticky();
            }
        };
    }

    private void initCustomActionEmitter(MediaControllerCompat mediaController) {
        CustomActionPipe customActionEmitter = new CustomActionPipe(mediaController.getTransportControls());

        mPlayer = ChannelHelper.newEmitter(Player.class, customActionEmitter);
        mPlaylistEditor = ChannelHelper.newEmitter(PlaylistEditor.class, customActionEmitter);

        mPlayerManager = ChannelHelper.newEmitter(PlayerManager.class, customActionEmitter);
        mPlayerStateSynchronizer = ChannelHelper.newEmitter(PlayerStateSynchronizer.class, customActionEmitter);

        mSleepTimer = ChannelHelper.newEmitter(SleepTimer.class, customActionEmitter);
    }

    private void initSessionEventDispatcher() {
        mSessionEventDispatcher = new SessionEventPipe(DispatcherUtil.merge(
                ChannelHelper.newDispatcher(PlayerStateSynchronizer.OnSyncPlayerStateListener.class, mSyncPlayerStateListener),
                ChannelHelper.newDispatcher(PlayerStateListener.class, mPlayerStateListener),
                ChannelHelper.newDispatcher(SleepTimer.OnStateChangeListener2.class, mPlayerStateListener)
        ));
    }

    private void initMediaControllerCallback() {
        mMediaControllerCallback = new MediaControllerCompat.Callback() {
            @Override
            public void onSessionEvent(String event, Bundle extras) {
                mSessionEventDispatcher.dispatch(event, extras);
            }
        };
    }

    private void onDisconnected() {
        notifyConnectStateChanged(false);
    }

    private void notifyConnectStateChanged(boolean connected) {
        mConnecting = false;
        for (OnConnectStateChangeListener listener : mAllConnectStateChangeListener) {
            listener.onConnectStateChanged(connected);
        }

        if (connected && mConnectedAction != null) {
            mConnectedAction.run();
        }
    }

    /**
     * 连接播放器。
     */
    public void connect() {
        if (mConnecting || isConnected()) {
            return;
        }

        mConnecting = true;
        mMediaBrowser.connect();
    }

    /**
     * 连接播放器。
     *
     * @param callback 回调接口，用于接收连接结果。
     */
    public void connect(OnConnectCallback callback) {
        if (isConnected()) {
            callback.onConnected(true);
            return;
        }

        mConnectCallback = callback;
        connect();
    }

    /**
     * 断开与播放器的连接。
     * <p>
     * 断开连接后，可以调用 {@link #connect()} 或者 {@link #connect(OnConnectCallback)} 方法再次进行连接。
     */
    public void disconnect() {
        if (!isConnected()) {
            return;
        }

        onDisconnected();
        mMediaController.unregisterCallback(mMediaControllerCallback);
        mMediaBrowser.disconnect();
    }

    /**
     * 判断播放器是否已连接。
     *
     * @return 如果播放器已连接则返回 true，否则返回 false。
     */
    public boolean isConnected() {
        return mMediaBrowser.isConnected();
    }

    /**
     * 设置是否启用自动连接功能。
     * <p>
     * {@link PlayerClient} 类实现了 {@link Player} 接口与 {@link PlaylistEditor} 接口。
     * 如果启用了 {@link PlayerClient} 的自动连接功能，那么在调用定义在 {@link Player} 接口与
     * {@link PlaylistEditor} 接口中的方法时，如果 {@link PlayerClient} 还没有连接到 {@link PlayerService}，
     * 或者连接已断开，则 {@link PlayerClient} 会尝试自动建立连接，并且会在连接成功后再去执行对应的方法。
     *
     * @param autoConnect 是否启用自动连接功能，为 true 时启用自动连接，为 false 时不启用。
     * @see Player
     * @see PlaylistEditor
     */
    public void setAutoConnect(boolean autoConnect) {
        mAutoConnect = autoConnect;
    }

    /**
     * 是否已经启用自动连接。
     *
     * @return 是否已经启用自动连接。
     */
    public boolean isAutoConnect() {
        return mAutoConnect;
    }

    /**
     * 添加一个监听器用来监听 PlayerClient 连接断开事件。
     *
     * @param listener 要添加的事件监听器，如果已添加，则会忽略本次调用。
     */
    public void addOnConnectStateChangeListener(@NonNull OnConnectStateChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllConnectStateChangeListener.contains(listener)) {
            return;
        }

        mAllConnectStateChangeListener.add(listener);
        listener.onConnectStateChanged(isConnected());
    }

    /**
     * 添加一个 {@link OnConnectStateChangeListener} 监听器用来监听 {@link PlayerClient} 的连接成功与断开连接事件。
     *
     * @param owner    LifecycleOwner 对象。监听器会在该 LifecycleOwner 对象销毁时自动注销，避免内存泄露。
     * @param listener 要添加的事件监听器，如果已添加，则会忽略本次调用。
     */
    public void addOnConnectStateChangeListener(@NonNull LifecycleOwner owner,
                                                @NonNull final OnConnectStateChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnConnectStateChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnConnectStateChangeListener(listener);
            }
        }));
    }

    /**
     * 移除已添加的 {@link OnConnectStateChangeListener} 监听器对象。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnConnectStateChangeListener(OnConnectStateChangeListener listener) {
        mAllConnectStateChangeListener.remove(listener);
    }

    /**
     * 添加一个音量改变监听器。
     *
     * @param listener 要添加的监听器，如果已添加则忽略。
     */
    public void addOnVolumeChangeListener(@NonNull OnVolumeChaneListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllVolumeChangeListener.contains(listener)) {
            return;
        }

        mAllVolumeChangeListener.add(listener);

        if (notConnected()) {
            return;
        }

        listener.onVolumeChanged(mPlayerState.getVolume());
    }

    /**
     * 添加一个音量改变监听器。
     *
     * @param owner    LifecycleOwner 对象。监听器会在该 LifecycleOwner 对象销毁时自动注销，避免内存泄露。
     * @param listener 要添加的监听器，如果已添加则忽略。
     */
    public void addOnVolumeChangeListener(@NonNull LifecycleOwner owner,
                                          @NonNull OnVolumeChaneListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnVolumeChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(() -> removeOnVolumeChangeListener(listener)));
    }

    public void removeOnVolumeChangeListener(OnVolumeChaneListener listener) {
        mAllVolumeChangeListener.remove(listener);
    }

    /**
     * 获取 {@link MediaControllerCompat} 对象。
     *
     * @return {@link MediaControllerCompat} 对象，如果还没有建立连接（{@link #isConnected()} 返回
     * {@code false}），那么该方法可能会返回 null。
     */
    @Nullable
    public MediaControllerCompat getMediaController() {
        return mMediaController;
    }

    /**
     * 发送自定义动作。
     * <p>
     * 你可以通过覆盖 {@link PlayerService#onCustomAction(String, Bundle)} 方法来响应自定义动作。
     *
     * @param action 自定义动作的名称，不能为 null。
     * @param args   要携带的额外参数，可为 null。
     */
    public void sendCustomAction(@NonNull String action, @Nullable Bundle args) {
        Preconditions.checkNotNull(action);

        if (notConnected() || getMediaController() == null) {
            return;
        }

        getMediaController().getTransportControls().sendCustomAction(action, args);
    }

    /**
     * 设置播放器的首选音质（默认为 {@link SoundQuality#STANDARD}）。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     *
     * @param soundQuality 要设置的音质，不能为 null。
     * @see SoundQuality#STANDARD
     * @see SoundQuality#LOW
     * @see SoundQuality#HIGH
     * @see SoundQuality#SUPER
     * @see #getSoundQuality()
     */
    @Override
    public void setSoundQuality(@NonNull SoundQuality soundQuality) {
        Preconditions.checkNotNull(soundQuality);
        if (!isConnected()) {
            return;
        }

        mPlayerManager.setSoundQuality(soundQuality);
    }

    /**
     * 修改音频特效的配置。
     *
     * @param config 要设置的音频特效配置，不能为 null。
     */
    @Override
    public void setAudioEffectConfig(@NonNull Bundle config) {
        Preconditions.checkNotNull(config);
        if (!isConnected()) {
            return;
        }

        mPlayerManager.setAudioEffectConfig(config);
    }

    /**
     * 设置是否启用音频特效（如：均衡器）（默认为 false）。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     *
     * @param enabled 是否启用音频特效。
     * @see #isAudioEffectEnabled()
     */
    @Override
    public void setAudioEffectEnabled(boolean enabled) {
        if (!isConnected()) {
            return;
        }

        mPlayerManager.setAudioEffectEnabled(enabled);
    }

    /**
     * 设置是否只允许在 WiFi 网络下播放音乐（默认为 false）。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     *
     * @param onlyWifiNetwork 是否只允许在 WiFi 网络下播放音乐。
     * @see #isOnlyWifiNetwork()
     */
    @Override
    public void setOnlyWifiNetwork(boolean onlyWifiNetwork) {
        if (!isConnected()) {
            return;
        }

        mPlayerManager.setOnlyWifiNetwork(onlyWifiNetwork);
    }

    /**
     * 设置是否忽略音频焦点。
     *
     * @param ignoreAudioFocus 是否忽略音频焦点。如果为 true，则播放器会忽略音频焦点的获取与丢失。
     */
    @Override
    public void setIgnoreAudioFocus(boolean ignoreAudioFocus) {
        if (!isConnected()) {
            return;
        }

        mPlayerManager.setIgnoreAudioFocus(ignoreAudioFocus);
    }

    /**
     * 获取当前播放器的首选音质。
     *
     * @see #setSoundQuality(SoundQuality)
     */
    public SoundQuality getSoundQuality() {
        return mPlayerConfig.getSoundQuality();
    }

    /**
     * 获取音频特效的配置。
     * <p>
     * 为了确保返回正确的值，请在连接成功后再调用该方法。
     *
     * @return 音频特效的配置。
     */
    @NonNull
    public Bundle getAudioEffectConfig() {
        return mPlayerConfig.getAudioEffectConfig();
    }

    /**
     * 是否已启用音频特效。
     *
     * @see #setAudioEffectEnabled(boolean)
     */
    public boolean isAudioEffectEnabled() {
        return mPlayerConfig.isAudioEffectEnabled();
    }

    /**
     * 是否只允许使用 Wifi 网络（默认为 false）。
     *
     * @see #setOnlyWifiNetwork(boolean)
     */
    public boolean isOnlyWifiNetwork() {
        return mPlayerConfig.isOnlyWifiNetwork();
    }

    /**
     * 是否忽略音频焦点。
     *
     * @return 是否忽略音频焦点。
     */
    public boolean isIgnoreAudioFocus() {
        return mPlayerConfig.isIgnoreAudioFocus();
    }

    /**
     * 关闭播放器。
     * <p>
     * 调用该方法后，后台的播放器会自动关闭，并断开所有客户端的连接。如果客户端仅仅只需要断开与播放器的连接，
     * 使用 {@link #disconnect()} 方法即可。
     *
     * @see #disconnect()
     */
    @Override
    public void shutdown() {
        if (isConnected()) {
            mPlayerManager.shutdown();
        }
    }

    private boolean notConnected() {
        return !mMediaBrowser.isConnected();
    }

    /**
     * 获取当前 PlayerController 的 PlaylistManager 对象。
     * <p>
     * 注意！只允许在播放器已连接（{@link #isConnected()} 返回 true）时，才允许使用 PlaylistManager
     * 修改播放队列。当然，即使未连接，使用 PlaylistManager 访问播放队列还是允许的。
     *
     * @return 当前 PlayerController 的 PlaylistManager 对象。
     */
    public PlaylistManager getPlaylistManager() {
        return mPlaylistManager;
    }

    /**
     * 设置一个新的播放列表。
     *
     * @param playlist 播放列表（不能为 null）。
     */
    public void setPlaylist(@NonNull Playlist playlist) {
        setPlaylist(playlist, 0, false);
    }

    /**
     * 设置一个新的播放列表。
     *
     * @param playlist 播放列表（不能为 null）。
     * @param play     是否立即播放列表中的音乐。
     */
    public void setPlaylist(@NonNull Playlist playlist, boolean play) {
        setPlaylist(playlist, 0, play);
    }

    /**
     * 设置一个新的播放列表。
     *
     * @param playlist 播放列表（不能为 null）。
     * @param position 播放列表中要播放的歌曲的位置。
     * @param play     是否立即播放 {@code position} 参数指定处的音乐。
     * @throws IllegalArgumentException 如果 position 的值小于 0，则抛出该异常。
     */
    @Override
    public void setPlaylist(@NonNull final Playlist playlist, final int position, final boolean play) throws IllegalArgumentException {
        Preconditions.checkNotNull(playlist);
        if (position < 0) {
            throw new IllegalArgumentException("position must >= 0.");
        }

        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    setPlaylist(playlist, position, play);
                }
            });
            return;
        }

        mPlaylistEditor.setPlaylist(playlist, position, play);
    }

    @Override
    public void save() {
        mPlaylistEditor.save();
    }

    public void updateCurrentPlaylist(Playlist playlist) {
        mPlaylistEditor.updateCurrentPlaylist(playlist);
    }


    @Override
    public void getPlaylist(@NonNull PlaylistManager.Callback callback) {
        Preconditions.checkNotNull(callback);
        mPlaylistManager.getPlaylist(callback);
    }

    @Override
    public long getLastModified() {
        return mPlaylistManager.getLastModified();
    }

    @NonNull
    @Override
    public String getPlaylistName() {
        return mPlaylistManager.getPlaylistName();
    }

    @Override
    public int getPlaylistSize() {
        return mPlaylistManager.getPlaylistSize();
    }

    @NonNull
    @Override
    public String getPlaylistToken() {
        return mPlaylistManager.getPlaylistToken();
    }

    @Override
    public boolean isPlaylistEditable() {
        return mPlaylistManager.isPlaylistEditable();
    }

    /**
     * 获取播放进度（单位：毫秒）。
     * <p>
     * 注意！该方法获取到的不是实时播放进度。
     *
     * @return 播放进度。
     */
    public int getPlayProgress() {
        return mPlayerState.getPlayProgress();
    }

    /**
     * 获取播放进度的更新时间。<b>注意！这是基于 SystemClock.elapsedRealtime() 的时间。</b>
     *
     * @return 播放进度的更新时间。
     */
    public long getPlayProgressUpdateTime() {
        return mPlayerState.getPlayProgressUpdateTime();
    }

    /**
     * 是否单曲循环播放。
     *
     * @return 当播放模式为 {@link PlayMode#LOOP} 时返回 true，否则返回 false。
     */
    public boolean isLooping() {
        return getPlayMode() == PlayMode.LOOP;
    }

    /**
     * 获取当前正在播放的音乐。
     *
     * @return 当前正在播放的音乐。如果当前没有任何播放的音乐（播放列表为空，或者还没有建立连接），则返回 null。
     */
    @Nullable
    public MusicItem getPlayingMusicItem() {
        return mPlayerState.getMusicItem();
    }

    /**
     * 获取当前正在播放的音乐的持续时间。
     *
     * @return 当前正在播放的音乐的持续时间。如果当前没有任何播放的音乐（播放列表为空，或者还没有建立连接），则返回 0。
     */
    public int getPlayingMusicItemDuration() {
        return mPlayerState.getDuration();
    }

    /**
     * 获取当前播放状态。
     *
     * @return 当前播放状态。
     * @see PlaybackState
     */
    public PlaybackState getPlaybackState() {
        return mPlayerState.getPlaybackState();
    }

    /**
     * 获取 audio session id。
     *
     * @return 如果 audio session id 不可用，则返回 0。
     */
    public int getAudioSessionId() {
        return mPlayerState.getAudioSessionId();
    }

    /**
     * 获取当前的缓存进度。
     *
     * @return 当前缓存进度，使用整数表示的百分比值，范围为 [0, 100]。
     */
    public int getBufferedProgress() {
        return mPlayerState.getBufferedProgress();
    }

    /**
     * 播放器当前是否处于 {@link PlaybackState#PLAYING} 状态。
     *
     * @return 如果播放器当前处于 {@link PlaybackState#PLAYING} 状态则返回 true，否则返回 false。
     */
    public boolean isPlaying() {
        return mPlayerState.getPlaybackState() == PlaybackState.PLAYING;
    }

    /**
     * 当前播放器是否处于 stalled 状态。
     * <p>
     * stalled 状态用于表示当前缓冲区是否有足够的数据继续播放，如果缓冲区没有足够的数据支撑继续播放，则该
     * 方法会返回 true，如果缓冲区有足够的数据可以继续播放，则返回 false。
     */
    public boolean isStalled() {
        return mPlayerState.isStalled();
    }

    /**
     * 播放器是否正在准备中。
     *
     * @return 如果播放器正在准备中，则返回 true，否则返回 false。
     */
    public boolean isPreparing() {
        return mPlayerState.isPreparing();
    }

    /**
     * 播放器是否准备完毕。
     *
     * @return 如果播放器已准备完毕，则返回 true，否则返回 false。
     */
    public boolean isPrepared() {
        return mPlayerState.isPrepared();
    }

    /**
     * 播放器是否发生了错误。
     */
    public boolean isError() {
        return getErrorCode() != ErrorCode.NO_ERROR;
    }

    /**
     * 获取错误码。
     *
     * @return 错误码。如果播放器没有发生错误，则返回 {@link ErrorCode#NO_ERROR}。
     * @see ErrorCode
     */
    public int getErrorCode() {
        return mPlayerState.getErrorCode();
    }

    /**
     * 获取错误信息。
     *
     * @return 错误信息。该方法的返回值只在错误发生时才有意义。
     * @see #isError()
     * @see #getErrorCode()
     */
    public String getErrorMessage() {
        return mPlayerState.getErrorMessage();
    }

    /**
     * 获取当前播放模式。
     *
     * @return 当前播放模式。
     */
    public PlayMode getPlayMode() {
        return mPlayerState.getPlayMode();
    }

    /**
     * 获取播放速度。
     *
     * @return 播放速度。
     */
    public float getSpeed() {
        return mPlayerState.getSpeed();
    }

    /**
     * 获取当前播放列表的播放位置。
     *
     * @return 当前播放列表的播放位置。
     */
    public int getPlayPosition() {
        return mPlayerState.getPlayPosition();
    }

    /**
     * 查询睡眠定时器是否已启动。
     *
     * @return 睡眠定时器是否已启动，如果已启动则返回 true，否则返回 false。
     */
    public boolean isSleepTimerStarted() {
        return mPlayerState.isSleepTimerStarted();
    }

    /**
     * 获取睡眠定时器的定时时间。
     * <p>
     * 该方法的返回值只在睡眠定时器启动（{@link #isSleepTimerStarted()} 返回 true）时才有意义。
     *
     * @return 睡眠定时器的定时时间。该方法的返回值只在睡眠定时器启动（{@link #isSleepTimerStarted()} 返回 true）时才有意义。
     */
    public long getSleepTimerTime() {
        return mPlayerState.getSleepTimerTime();
    }

    /**
     * 获取睡眠定时器的启动时间。
     * <p>
     * 这个时间是基于 {@code SystemClock.elapsedRealtime()} 的，且该方法的返回值只在睡眠定时器启动
     * （{@link #isSleepTimerStarted()} 返回 true）时才有意义。
     * <p>
     * 使用当前的 {@code SystemClock.elapsedRealtime()} 减去这个时间，即可知道睡眠定时器已经走过的时间。
     *
     * @return 睡眠定时器的启动时间。该方法的返回值只在睡眠定时器启动（{@link #isSleepTimerStarted()} 返回 true）时才有意义。
     * @see #getSleepTimerElapsedTime()
     */
    public long getSleepTimerStartedTime() {
        return mPlayerState.getSleepTimerStartTime();
    }

    /**
     * 获取睡眠定时器已经走过的时间。
     * <p>
     * 该方法的返回值只在睡眠定时器启动（{@link #isSleepTimerStarted()} 返回 true）时才有意义。
     *
     * @return 睡眠定时器已经走过的时间。
     */
    public long getSleepTimerElapsedTime() {
        if (isSleepTimerStarted()) {
            return SystemClock.elapsedRealtime() - getSleepTimerStartedTime();
        }

        return 0;
    }

    /**
     * 获取睡眠定时器的时间到时要执行的操作。
     * <p>
     * 该方法的返回值只在睡眠定时器启动（{@link #isSleepTimerStarted()} 返回 true）时才有意义。
     *
     * @return 睡眠定时器的时间到时要执行的操作（默认为 {@link snow.player.SleepTimer.TimeoutAction#PAUSE}）
     */
    @NonNull
    public SleepTimer.TimeoutAction getTimeoutAction() {
        return mPlayerState.getTimeoutAction();
    }

    /**
     * 下一曲。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void skipToNext() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    skipToNext();
                }
            });
            return;
        }

        mPlayer.skipToNext();
    }

    /**
     * 上一曲。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void skipToPrevious() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    skipToPrevious();
                }
            });
            return;
        }

        mPlayer.skipToPrevious();
    }

    /**
     * 播放 position 处的音乐，如果播放列表中 position 处的音乐是当前正在播放的音乐，则忽略本次调用。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     *
     * @param position 要播放的音乐的 position 值（从 0 开始计算）。
     * @throws IllegalArgumentException 如果 position 值小于 0，则会抛出该异常。
     */
    @Override
    public void skipToPosition(final int position) throws IllegalArgumentException {
        if (position < 0) {
            throw new IllegalArgumentException("position music >= 0");
        }

        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    skipToPosition(position);
                }
            });
            return;
        }

        mPlayer.skipToPosition(position);
    }

    /**
     * 播放或暂停播放列表中指定索引处的音乐。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     *
     * @param position 目标位置。如果 position 的值超出播放列表的范围，则会忽略本次调用，并在会输出一条错误日志 。
     * @throws IllegalArgumentException 如果 position 的值小于 0，则会抛出该异常。
     */
    @Override
    public void playPause(final int position) throws IllegalArgumentException {
        if (position < 0) {
            throw new IllegalArgumentException("position music >= 0");
        }

        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    playPause(position);
                }
            });
            return;
        }

        mPlayer.playPause(position);
    }

    /**
     * 设置播放模式。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     *
     * @param playMode 播放模式。
     */
    @Override
    public void setPlayMode(@NonNull final PlayMode playMode) {
        Preconditions.checkNotNull(playMode);
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    setPlayMode(playMode);
                }
            });
            return;
        }

        mPlayer.setPlayMode(playMode);
    }

    /**
     * 设置播放速度。
     *
     * @param speed 播放速度，最小值为 0.1，最大值为 10。
     */
    @Override
    public void setSpeed(final float speed) {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    setSpeed(speed);
                }
            });
            return;
        }

        mPlayer.setSpeed(speed);
    }

    @Override
    public void setVolume(float volume) {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    setVolume(volume);
                }
            });
            return;
        }

        mPlayer.setVolume(volume);
    }

    private void tryAutoConnect(@Nullable Runnable connectedAction) {
        if (!mAutoConnect) {
            return;
        }

        if (isConnected() && connectedAction != null) {
            connectedAction.run();
            return;
        }

        mConnectedAction = connectedAction;
        connect();
    }

    /**
     * 开始播放。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void play() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    play();
                }
            });
            return;
        }

        mPlayer.play();
    }

    /**
     * 暂停播放。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void pause() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    pause();
                }
            });
            return;
        }

        mPlayer.pause();
    }

    /**
     * 停止播放。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void stop() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    stop();
                }
            });
            return;
        }

        mPlayer.stop();
    }

    /**
     * 播放/暂停。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void playPause() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    playPause();
                }
            });
            return;
        }

        mPlayer.playPause();
    }

    /**
     * 调整音乐播放进度（单位：毫秒）。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     *
     * @param progress 要调整到的播放进度（单位：毫秒）。
     */
    @Override
    public void seekTo(final int progress) {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    seekTo(progress);
                }
            });
            return;
        }

        mPlayer.seekTo(progress);
    }

    /**
     * 当前正在播放的歌曲是否禁用了所有 seek 操作。
     * <p>
     * 如果该方法返回 true，则会表示当前正在播放的歌曲同时禁用 seekTo、fastForward、rewind 操作。
     *
     * @return 是否禁用了所有的 seek 操作。
     * @see MusicItem#setForbidSeek(boolean)
     * @see MusicItem#isForbidSeek()
     */
    public boolean isForbidSeek() {
        if (notConnected()) {
            return false;
        }

        return mPlayerState.isForbidSeek();
    }

    /**
     * 当前正在播放的歌曲的时长是否由播放器自动获取。
     *
     * @return 如果当前正在播放的歌曲的时长由播放器自动获取，则返回 true，否则返回 false。
     */
    public boolean isAutoDuration() {
        if (notConnected()) {
            return false;
        }

        MusicItem musicItem = mPlayerState.getMusicItem();
        if (musicItem == null) {
            return false;
        }

        return musicItem.isAutoDuration();
    }

    /**
     * 快进。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void fastForward() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    fastForward();
                }
            });
            return;
        }

        mPlayer.fastForward();
    }

    /**
     * 快退。
     * <p>
     * 该方法只在连接到播放器后（{@link #isConnected()} 返回 true）才有效。
     */
    @Override
    public void rewind() {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    rewind();
                }
            });
            return;
        }

        mPlayer.rewind();
    }

    /**
     * 启动睡眠定时器。
     *
     * @param time 睡眠时间（单位：毫秒）。播放器会在经过 time 时间后暂停播放。
     * @throws IllegalArgumentException 如果定时时间小于 0，则抛出该异常。
     */
    public void startSleepTimer(long time) throws IllegalArgumentException {
        startSleepTimer(time, SleepTimer.TimeoutAction.PAUSE);
    }

    /**
     * 启动睡眠定时器。
     *
     * @param time   睡眠时间（单位：毫秒）。播放器会在经过 time 时间后暂停播放。
     * @param action 定时器的的时间到时要执行的操作。
     * @throws IllegalArgumentException 如果定时时间小于 0，则抛出该异常。
     */
    @Override
    public void startSleepTimer(long time, @NonNull SleepTimer.TimeoutAction action) throws IllegalArgumentException {
        if (time < 0) {
            throw new IllegalArgumentException("time music >= 0");
        }
        Preconditions.checkNotNull(action);

        if (notConnected()) {
            return;
        }

        mSleepTimer.startSleepTimer(time, action);
    }

    /**
     * 取消睡眠定时器。
     */
    @Override
    public void cancelSleepTimer() {
        if (notConnected()) {
            return;
        }

        mSleepTimer.cancelSleepTimer();
    }

    @Override
    public void setWaitPlayComplete(boolean waitPlayComplete) {
        if (notConnected()) {
            return;
        }

        mSleepTimer.setWaitPlayComplete(waitPlayComplete);
    }

    /**
     * 睡眠定时器是否等到当前正在播放的歌曲播放完成后，再执行指定的动作。
     *
     * @return 睡眠定时器是否等到当前正在播放的歌曲播放完成后，再执行指定的动作。
     */
    public boolean isWaitPlayComplete() {
        if (notConnected()) {
            return false;
        }

        return mPlayerState.isWaitPlayComplete();
    }

    /**
     * 睡眠定时器的定时任务是否已完成或者被取消。
     * <p>
     * <b>注意！该方法的返回值仅在睡眠定时器启动（{@link #isSleepTimerStarted()} 方法返回 true）时才有意义。</b>
     *
     * @return 如果睡眠定时器的定时任务已完成或者被取消，则返回 true，否则返回 false。
     */
    public boolean isSleepTimerEnd() {
        if (notConnected()) {
            return true;
        }

        return mPlayerState.isSleepTimerEnd();
    }

    /**
     * 睡眠定时器的定时时间是否已到。
     * <p>
     * <b>注意！该方法的返回值仅在睡眠定时器启动（{@link #isSleepTimerStarted()} 方法返回 true）时才有意义。</b>
     *
     * @return 如果睡眠定时器的定时时间已到，则返回 true，否则返回 false。
     */
    public boolean isSleepTimerTimeout() {
        if (notConnected()) {
            return false;
        }

        return mPlayerState.isSleepTimerTimeout();
    }

    /**
     * 获取播放器的当前音量。
     *
     * @return 返回播放器的当前音量。
     */
    public float getVolume() {
        if (notConnected()) {
            return 1.0F;
        }

        return mPlayerState.getVolume();
    }

    /**
     * 添加一个播放器播放状态监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 播放器播放状态监听器。
     * @see Player.OnPlaybackStateChangeListener
     */
    public void addOnPlaybackStateChangeListener(@NonNull Player.OnPlaybackStateChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllPlaybackStateChangeListener.contains(listener)) {
            return;
        }

        mAllPlaybackStateChangeListener.add(listener);
        notifyPlaybackStateChanged(listener);
    }

    /**
     * 添加一个播放器播放状态监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param owner    LifecycleOwner 对象。
     * @param listener 播放器播放状态监听器。
     * @see Player.OnPlaybackStateChangeListener
     */
    public void addOnPlaybackStateChangeListener(@NonNull LifecycleOwner owner,
                                                 @NonNull final Player.OnPlaybackStateChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnPlaybackStateChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnPlaybackStateChangeListener(listener);
            }
        }));
    }

    /**
     * 移除播放器播放状态监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnPlaybackStateChangeListener(Player.OnPlaybackStateChangeListener listener) {
        mAllPlaybackStateChangeListener.remove(listener);
    }

    /**
     * 添加一个播放器准备（prepare）状态监听器。
     *
     * @param listener 如果监听器已存在，则忽略本次添加。
     */
    public void addOnPrepareListener(@NonNull Player.OnPrepareListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllPrepareListener.contains(listener)) {
            return;
        }

        mAllPrepareListener.add(listener);
        notifyPrepareStateChanged(listener);
    }

    /**
     * 添加一个播放器准备（prepare）状态监听器。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param owner    LifecycleOwner 对象。
     * @param listener 如果监听器已存在，则忽略本次添加。
     */
    public void addOnPrepareListener(@NonNull LifecycleOwner owner, @NonNull final Player.OnPrepareListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnPrepareListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnPrepareListener(listener);
            }
        }));
    }

    /**
     * 移除一个播放器准备（prepare）状态监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnPrepareListener(Player.OnPrepareListener listener) {
        mAllPrepareListener.remove(listener);
    }

    /**
     * 添加一个 stalled 状态监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnStalledChangeListener
     */
    public void addOnStalledChangeListener(@NonNull Player.OnStalledChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllStalledChangeListener.contains(listener)) {
            return;
        }

        mAllStalledChangeListener.add(listener);
        notifyStalledChanged(listener);
    }

    /**
     * 添加一个 stalled 状态监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnStalledChangeListener
     */
    public void addOnStalledChangeListener(@NonNull LifecycleOwner owner,
                                           @NonNull final Player.OnStalledChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnStalledChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnStalledChangeListener(listener);
            }
        }));
    }

    /**
     * 移除 stalled 状态监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnStalledChangeListener(Player.OnStalledChangeListener listener) {
        mAllStalledChangeListener.remove(listener);
    }

    /**
     * 添加一个缓存进度监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnBufferedProgressChangeListener
     */
    public void addOnBufferedProgressChangeListener(@NonNull OnBufferedProgressChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllBufferedProgressChangeListener.contains(listener)) {
            return;
        }

        mAllBufferedProgressChangeListener.add(listener);
        notifyOnBufferedProgressChanged(listener);
    }

    /**
     * 添加一个缓存进度监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param owner    LifecycleOwner 对象。
     * @param listener 要添加的监听器。
     */
    public void addOnBufferedProgressChangeListener(@NonNull LifecycleOwner owner,
                                                    @NonNull final OnBufferedProgressChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnBufferedProgressChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnBufferedProgressChangeListener(listener);
            }
        }));
    }

    /**
     * 移除缓存进度监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnBufferedProgressChangeListener(OnBufferedProgressChangeListener listener) {
        mAllBufferedProgressChangeListener.remove(listener);
    }

    /**
     * 添加一个监听当前播放的 MusicItem 改变事件的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnPlayingMusicItemChangeListener
     */
    public void addOnPlayingMusicItemChangeListener(@NonNull Player.OnPlayingMusicItemChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllPlayingMusicItemChangeListener.contains(listener)) {
            return;
        }

        mAllPlayingMusicItemChangeListener.add(listener);
        notifyPlayingMusicItemChanged(listener);
    }

    /**
     * 添加一个监听当前播放的 MusicItem 改变事件的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnPlayingMusicItemChangeListener
     */
    public void addOnPlayingMusicItemChangeListener(@NonNull LifecycleOwner owner,
                                                    @NonNull final Player.OnPlayingMusicItemChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnPlayingMusicItemChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnPlayingMusicItemChangeListener(listener);
            }
        }));
    }

    /**
     * 移除当前播放的 MusicItem 改变事件监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnPlayingMusicItemChangeListener(Player.OnPlayingMusicItemChangeListener listener) {
        mAllPlayingMusicItemChangeListener.remove(listener);
    }

    /**
     * 添加一个用于监听播放器播放进度调整完毕事件的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnSeekCompleteListener
     */
    public void addOnSeekCompleteListener(@NonNull OnSeekCompleteListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllSeekListener.contains(listener)) {
            return;
        }

        mAllSeekListener.add(listener);
        notifySeekComplete(listener);
    }

    /**
     * 添加一个用于监听播放器播放进度调整完毕事件的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnSeekCompleteListener
     */
    public void addOnSeekCompleteListener(@NonNull LifecycleOwner owner,
                                          @NonNull final OnSeekCompleteListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnSeekCompleteListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnSeekCompleteListener(listener);
            }
        }));
    }

    /**
     * 移除用于监听播放器播放进度调整完毕的监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnSeekCompleteListener(OnSeekCompleteListener listener) {
        mAllSeekListener.remove(listener);
    }

    /**
     * 添加一个用于监听播放列表改变事件的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnPlaylistChangeListener
     */
    public void addOnPlaylistChangeListener(@NonNull Player.OnPlaylistChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllPlaylistChangeListener.contains(listener)) {
            return;
        }

        mAllPlaylistChangeListener.add(listener);
        notifyPlaylistChanged(listener);
    }

    /**
     * 添加一个用于监听播放列表改变事件的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnPlaylistChangeListener
     */
    public void addOnPlaylistChangeListener(@NonNull LifecycleOwner owner,
                                            @NonNull final Player.OnPlaylistChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnPlaylistChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnPlaylistChangeListener(listener);
            }
        }));
    }

    /**
     * 移除用于监听播放列表改变事件的监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnPlaylistChangeListener(Player.OnPlaylistChangeListener listener) {
        mAllPlaylistChangeListener.remove(listener);
    }

    /**
     * 添加一个用于监听播放模式改变的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnPlayModeChangeListener
     */
    public void addOnPlayModeChangeListener(@NonNull Player.OnPlayModeChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllPlayModeChangeListener.contains(listener)) {
            return;
        }

        mAllPlayModeChangeListener.add(listener);
        notifyPlayModeChanged(listener);
    }

    /**
     * 添加一个用于监听播放模式改变的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     * @see Player.OnPlayModeChangeListener
     */
    public void addOnPlayModeChangeListener(@NonNull LifecycleOwner owner,
                                            @NonNull final Player.OnPlayModeChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnPlayModeChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnPlayModeChangeListener(listener);
            }
        }));
    }

    /**
     * 移除一个用于监听播放模式改变的监听器。
     *
     * @param listener 要移除的事件监听器。
     */
    public void removeOnPlayModeChangeListener(Player.OnPlayModeChangeListener listener) {
        mAllPlayModeChangeListener.remove(listener);
    }

    /**
     * 添加一个用于监听播放速度改变的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器，不能为 null。
     */
    public void addOnSpeedChangeListener(@NonNull Player.OnSpeedChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllSpeedChangeListener.contains(listener)) {
            return;
        }

        mAllSpeedChangeListener.add(listener);
        notifySpeedChanged(listener);
    }

    /**
     * 添加一个用于监听播放速度改变的监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器，不能为 null。
     */
    public void addOnSpeedChangeListener(@NonNull LifecycleOwner owner,
                                         @NonNull final Player.OnSpeedChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnSpeedChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnSpeedChangeListener(listener);
            }
        }));
    }

    /**
     * 移除一个用于监听播放模式改变的监听器。
     *
     * @param listener 要移除的事件监听器。
     */
    public void removeOnSpeedChangeListener(Player.OnSpeedChangeListener listener) {
        mAllSpeedChangeListener.remove(listener);
    }

    /**
     * 监听播放器状态。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnPlaybackStateChangeListener(@NonNull OnPlaybackStateChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mClientAllPlaybackStateChangeListener.contains(listener)) {
            return;
        }

        mClientAllPlaybackStateChangeListener.add(listener);
        notifyClientPlaybackStateChanged(listener);
    }

    /**
     * 监听播放器状态。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnPlaybackStateChangeListener(@NonNull LifecycleOwner owner,
                                                 @NonNull final OnPlaybackStateChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnPlaybackStateChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnPlaybackStateChangeListener(listener);
            }
        }));
    }

    /**
     * 移除播放器状态监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnPlaybackStateChangeListener(OnPlaybackStateChangeListener listener) {
        mClientAllPlaybackStateChangeListener.remove(listener);
    }

    /**
     * 添加一个 audio session id 监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnAudioSessionChangeListener(@NonNull OnAudioSessionChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllAudioSessionChangeListener.contains(listener)) {
            return;
        }

        mAllAudioSessionChangeListener.add(listener);
        notifyAudioSessionChanged(listener);
    }

    /**
     * 监听播放器的 audio session id
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnAudioSessionChangeListener(@NonNull LifecycleOwner owner,
                                                @NonNull final OnAudioSessionChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnAudioSessionChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnAudioSessionChangeListener(listener);
            }
        }));
    }

    /**
     * 移除 audio session id 监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnAudioSessionChangeListener(OnAudioSessionChangeListener listener) {
        mAllAudioSessionChangeListener.remove(listener);
    }

    /**
     * 监听睡眠定时器的状态。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnSleepTimerStateChangeListener(@NonNull SleepTimer.OnStateChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllSleepTimerStateChangeListener.contains(listener)) {
            return;
        }

        mAllSleepTimerStateChangeListener.add(listener);

        if (mPlayerState.isSleepTimerStarted()) {
            notifySleepTimerStarted();

            if (mPlayerState.isSleepTimerTimeout()) {
                notifySleepTimerTimeout(listener);
            }
        }

        if (mPlayerState.isSleepTimerEnd()) {
            notifySleepTimerEnd(listener);
        }
    }

    /**
     * 监听睡眠定时器的状态。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnSleepTimerStateChangeListener(@NonNull LifecycleOwner owner,
                                                   @NonNull final SleepTimer.OnStateChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnSleepTimerStateChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnSleepTimerStateChangeListener(listener);
            }
        }));
    }

    /**
     * 移除已注册的睡眠定时器状态监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnSleepTimerStateChangeListener(SleepTimer.OnStateChangeListener listener) {
        mAllSleepTimerStateChangeListener.remove(listener);
    }

    /**
     * 添加一个监听器用于监听睡眠定时器的 waitPlayComplete 状态的改变。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnWaitPlayCompleteChangeListener(@NonNull SleepTimer.OnWaitPlayCompleteChangeListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllWaitPlayCompleteChangeListener.contains(listener)) {
            return;
        }

        mAllWaitPlayCompleteChangeListener.add(listener);
        notifyWaitPlayCompleteChanged(listener);
    }

    /**
     * 添加一个监听器用于监听睡眠定时器的 waitPlayComplete 状态的改变。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器。
     */
    public void addOnWaitPlayCompleteChangeListener(@NonNull LifecycleOwner owner,
                                                    @NonNull final SleepTimer.OnWaitPlayCompleteChangeListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnWaitPlayCompleteChangeListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnWaitPlayCompleteChangeListener(listener);
            }
        }));
    }

    /**
     * 移除已注册的睡眠定时器的 waitPlayComplete 状态监听器。
     *
     * @param listener 要移除的监听器。
     */
    public void removeOnWaitPlayCompleteChangeListener(SleepTimer.OnWaitPlayCompleteChangeListener listener) {
        mAllWaitPlayCompleteChangeListener.remove(listener);
    }

    /**
     * 添加一个 {@link snow.player.Player.OnRepeatListener} 监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     *
     * @param listener 要添加的监听器，不能为 null。
     */
    public void addOnRepeatListener(@NonNull Player.OnRepeatListener listener) {
        Preconditions.checkNotNull(listener);

        if (mAllRepeatListener.contains(listener)) {
            return;
        }

        mAllRepeatListener.add(listener);
    }

    /**
     * 添加一个 {@link snow.player.Player.OnRepeatListener} 监听器。
     * <p>
     * 如果监听器已添加，则忽略本次调用。
     * <p>
     * 事件监听器会在 LifecycleOwner 销毁时自动注销，以避免发生内容泄露。
     *
     * @param listener 要添加的监听器，不能为 null。
     */
    public void addOnRepeatListener(@NonNull LifecycleOwner owner,
                                    @NonNull final Player.OnRepeatListener listener) {
        Preconditions.checkNotNull(owner);
        Preconditions.checkNotNull(listener);

        if (isDestroyed(owner)) {
            return;
        }

        addOnRepeatListener(listener);
        owner.getLifecycle().addObserver(new DestroyObserver(new Runnable() {
            @Override
            public void run() {
                removeOnRepeatListener(listener);
            }
        }));
    }

    /**
     * 异常已注册的 {@link snow.player.Player.OnRepeatListener} 监听器。
     */
    public void removeOnRepeatListener(Player.OnRepeatListener listener) {
        mAllRepeatListener.remove(listener);
    }

    private boolean isDestroyed(LifecycleOwner owner) {
        return owner.getLifecycle().getCurrentState() == Lifecycle.State.DESTROYED;
    }

    @Override
    public void updateMusicItem(@NonNull MusicItem oldItem, @NonNull MusicItem newItem) {
        mPlaylistEditor.updateMusicItem(oldItem, newItem);
    }

    /**
     * 往列表中插入了一首新的歌曲。
     * <p>
     * 如果播放列表中已包含指定歌曲，则会将它移动到 position 位置，如果不存在，则会将歌曲插入到 position 位置。
     *
     * @param position  歌曲插入的位置。
     * @param musicItem 要插入的歌曲，不能为 null。
     * @throws IllegalArgumentException 如果 position 的值小于 0，则抛出该异常。
     */
    @Override
    public void insertMusicItem(final int position, @NonNull final MusicItem musicItem) throws IllegalArgumentException {
        if (position < 0) {
            throw new IllegalArgumentException("position must >= 0.");
        }
        Preconditions.checkNotNull(musicItem);

        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    insertMusicItem(position, musicItem);
                }
            });
            return;
        }

        mPlaylistEditor.insertMusicItem(position, musicItem);
    }

    @Override
    public void appendMusicItem(@NonNull final MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    appendMusicItem(musicItem);
                }
            });
            return;
        }

        mPlaylistEditor.appendMusicItem(musicItem);
    }

    /**
     * 移动播放列表中某首歌曲的位置。
     *
     * @param fromPosition 歌曲在列表中的位置。
     * @param toPosition   歌曲要移动到的位置。如果 {@code toPosition == fromPosition}，则会忽略本次调用。
     * @throws IndexOutOfBoundsException 如果 fromPosition 或者 toPosition 超出播放列表索引的范围，则抛出该异常。
     */
    @Override
    public void moveMusicItem(final int fromPosition, final int toPosition) throws IndexOutOfBoundsException {
        int size = getPlaylistSize();
        if (fromPosition < 0 || fromPosition >= size) {
            throw new IndexOutOfBoundsException("fromPosition: " + fromPosition + ", size: " + size);
        }

        if (toPosition < 0 || toPosition >= size) {
            throw new IndexOutOfBoundsException("toPosition: " + toPosition + ", size: " + size);
        }

        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    moveMusicItem(fromPosition, toPosition);
                }
            });
            return;
        }

        mPlaylistEditor.moveMusicItem(fromPosition, toPosition);
    }

    @Override
    public void removeMusicItem(@NonNull final MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    removeMusicItem(musicItem);
                }
            });
            return;
        }

        mPlaylistEditor.removeMusicItem(musicItem);
    }

    @Override
    public void removeMusicItem(final int position) {
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    removeMusicItem(position);
                }
            });
            return;
        }

        mPlaylistEditor.removeMusicItem(position);
    }

    @Override
    public void setNextPlay(@NonNull final MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        if (notConnected()) {
            tryAutoConnect(new Runnable() {
                @Override
                public void run() {
                    setNextPlay(musicItem);
                }
            });
            return;
        }

        mPlaylistEditor.setNextPlay(musicItem);
    }

    /**
     * 用于监听播放器是否连接成功。
     */
    public interface OnConnectCallback {
        /**
         * 该方法会在连接成功或失败时调用。
         *
         * @param success 如果为 true，则表示连接成功，否则为 false。
         */
        void onConnected(boolean success);
    }

    /**
     * 用于监听 PlayerClient 的连接成功与断开连接事件。
     */
    public interface OnConnectStateChangeListener {
        /**
         * 当 PlayerClient 连接成功或者断开连接时会回调该方法。
         *
         * @param connected 是否已连接。
         */
        void onConnectStateChanged(boolean connected);
    }

    /**
     * 用于监听播放器播放状态的改变。
     */
    public interface OnPlaybackStateChangeListener {
        /**
         * 该方法会在播放器的播放状态发生改变时调用。
         *
         * @param playbackState 当前的播放器状态。
         * @param stalled       当前播放器是否处于 stalled 状态。当缓冲区没有足够的数据继续播放时，
         *                      该参数为 true，否则为 false。
         */
        void onPlaybackStateChanged(PlaybackState playbackState, boolean stalled);
    }

    /**
     * 用于监听播放器的 audio session id 改变事件。
     * <p>
     * 当切换播放的歌曲时，播放器的 audio session id 会发生改变。
     */
    public interface OnAudioSessionChangeListener {
        /**
         * 该方法会在播放器的 audio session id 发生改变时调用。
         *
         * @param audioSessionId 最新的 audio session id。
         */
        void onAudioSessionChanged(int audioSessionId);
    }

    private void notifySticky() {
        if (notConnected()) {
            return;
        }

        notifyPlaylistChanged();
        notifyPlayModeChanged();
        notifySpeedChanged();
        notifyVolumeChanged(mPlayerState.getVolume());
        notifyPlayingMusicItemChanged();
        notifyPrepareStateChanged();
        notifyAudioSessionChanged();
        notifyPlaybackStateChanged();
        notifyOnBufferedProgressChanged();

        if (mPlayerState.isStalled()) {
            notifyStalledChanged();
        }

        if (mPlayerState.isSleepTimerStarted()) {
            notifySleepTimerStarted();

            if (mPlayerState.isSleepTimerTimeout()) {
                notifySleepTimerTimeout();
            }
        }

        if (mPlayerState.isSleepTimerEnd()) {
            notifySleepTimerEnd();
        }

        notifyWaitPlayCompleteChanged();
    }

    void initPlayerState(PlayerState playerState) {
        mPlayerState = playerState;
        mPlayerStateHelper = new PlayerStateHelper(mPlayerState);
    }

    private void notifyPlaybackStateChanged(Player.OnPlaybackStateChangeListener listener) {
        if (notConnected()) {
            return;
        }

        switch (mPlayerState.getPlaybackState()) {
            case PLAYING:
                listener.onPlay(mPlayerState.isStalled(), mPlayerState.getPlayProgress(), mPlayerState.getPlayProgressUpdateTime());
                break;
            case PAUSED:
                listener.onPause(mPlayerState.getPlayProgress(), mPlayerState.getPlayProgressUpdateTime());
                break;
            case STOPPED:
                listener.onStop();
                break;
            case ERROR:
                listener.onError(mPlayerState.getErrorCode(), mPlayerState.getErrorMessage());
                break;
            default:
                break;
        }
    }

    private void notifyPlaybackStateChanged() {
        if (notConnected()) {
            return;
        }

        for (Player.OnPlaybackStateChangeListener listener : mAllPlaybackStateChangeListener) {
            notifyPlaybackStateChanged(listener);
        }

        notifyClientPlaybackStateChanged();
    }

    private void notifyPrepareStateChanged(Player.OnPrepareListener listener) {
        if (notConnected()) {
            return;
        }

        if (mPlayerState.isPreparing()) {
            listener.onPreparing();
            return;
        }

        if (mPlayerState.isPrepared()) {
            listener.onPrepared(mPlayerState.getAudioSessionId());
            if (listener instanceof Player.OnPrepareListener2) {
                ((Player.OnPrepareListener2) listener).onPrepared(mPlayerState.getAudioSessionId(), mPlayerState.getDuration());
            }
        }
    }

    private void notifyPrepareStateChanged() {
        if (notConnected()) {
            return;
        }

        for (Player.OnPrepareListener listener : mAllPrepareListener) {
            notifyPrepareStateChanged(listener);
        }
    }

    private void notifyStalledChanged(Player.OnStalledChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onStalledChanged(mPlayerState.isStalled(),
                mPlayerState.getPlayProgress(),
                mPlayerState.getPlayProgressUpdateTime());
    }

    private void notifyStalledChanged() {
        if (notConnected()) {
            return;
        }

        for (Player.OnStalledChangeListener listener : mAllStalledChangeListener) {
            notifyStalledChanged(listener);
        }
    }

    private void notifyOnBufferedProgressChanged(OnBufferedProgressChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onBufferedProgressChanged(mPlayerState.getBufferedProgress());
    }

    private void notifyOnBufferedProgressChanged() {
        if (notConnected()) {
            return;
        }

        for (OnBufferedProgressChangeListener listener : mAllBufferedProgressChangeListener) {
            notifyOnBufferedProgressChanged(listener);
        }
    }

    private void notifyPlayingMusicItemChanged(Player.OnPlayingMusicItemChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onPlayingMusicItemChanged(mPlayerState.getMusicItem(), mPlayerState.getPlayPosition(), mPlayerState.getPlayProgress());
    }

    private void notifyPlayingMusicItemChanged() {
        if (notConnected()) {
            return;
        }

        for (Player.OnPlayingMusicItemChangeListener listener : mAllPlayingMusicItemChangeListener) {
            notifyPlayingMusicItemChanged(listener);
        }
    }

    private void notifySeekComplete(OnSeekCompleteListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onSeekComplete(mPlayerState.getPlayProgress(), mPlayerState.getPlayProgressUpdateTime(), mPlayerState.isStalled());
    }

    private void notifySeekComplete() {
        if (notConnected()) {
            return;
        }

        for (OnSeekCompleteListener listener : mAllSeekListener) {
            notifySeekComplete(listener);
        }
    }

    private void notifyPlaylistChanged(Player.OnPlaylistChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onPlaylistChanged(mPlaylistManager, mPlayerState.getPlayPosition());
    }

    private void notifyPlaylistChanged() {
        if (notConnected()) {
            return;
        }

        for (Player.OnPlaylistChangeListener listener : mAllPlaylistChangeListener) {
            notifyPlaylistChanged(listener);
        }
    }

    private void notifyPlayModeChanged(Player.OnPlayModeChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onPlayModeChanged(mPlayerState.getPlayMode());
    }

    private void notifyPlayModeChanged() {
        if (notConnected()) {
            return;
        }

        for (Player.OnPlayModeChangeListener listener : mAllPlayModeChangeListener) {
            notifyPlayModeChanged(listener);
        }
    }

    private void notifySpeedChanged(Player.OnSpeedChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onSpeedChanged(mPlayerState.getSpeed(), mPlayerState.getPlayProgress(), mPlayerState.getPlayProgressUpdateTime());
    }

    private void notifySpeedChanged() {
        if (notConnected()) {
            return;
        }

        for (Player.OnSpeedChangeListener listener : mAllSpeedChangeListener) {
            notifySpeedChanged(listener);
        }
    }

    private void notifyClientPlaybackStateChanged() {
        if (notConnected()) {
            return;
        }

        for (OnPlaybackStateChangeListener listener : mClientAllPlaybackStateChangeListener) {
            notifyClientPlaybackStateChanged(listener);
        }
    }

    private void notifyClientPlaybackStateChanged(OnPlaybackStateChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onPlaybackStateChanged(mPlayerState.getPlaybackState(), mPlayerState.isStalled());
    }

    private void notifyAudioSessionChanged() {
        if (notConnected()) {
            return;
        }

        for (OnAudioSessionChangeListener listener : mAllAudioSessionChangeListener) {
            notifyAudioSessionChanged(listener);
        }
    }

    private void notifyAudioSessionChanged(OnAudioSessionChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onAudioSessionChanged(mPlayerState.getAudioSessionId());
    }

    private void notifySleepTimerStarted() {
        if (notConnected()) {
            return;
        }

        for (SleepTimer.OnStateChangeListener listener : mAllSleepTimerStateChangeListener) {
            notifySleepTimerStarted(listener);
        }
    }

    private void notifySleepTimerStarted(SleepTimer.OnStateChangeListener listener) {
        listener.onTimerStart(
                mPlayerState.getSleepTimerTime(),
                mPlayerState.getSleepTimerStartTime(),
                mPlayerState.getTimeoutAction()
        );

        if (listener instanceof SleepTimer.OnStateChangeListener2) {
            ((SleepTimer.OnStateChangeListener2) listener).onTimerStart(
                    mPlayerState.getSleepTimerTime(),
                    mPlayerState.getSleepTimerStartTime(),
                    mPlayerState.getTimeoutAction(),
                    mPlayerState.isWaitPlayComplete()
            );
        }
    }

    private void notifySleepTimerEnd() {
        if (notConnected()) {
            return;
        }

        for (SleepTimer.OnStateChangeListener listener : mAllSleepTimerStateChangeListener) {
            notifySleepTimerEnd(listener);
        }
    }

    private void notifySleepTimerEnd(SleepTimer.OnStateChangeListener listener) {
        listener.onTimerEnd();
    }

    private void notifySleepTimerTimeout() {
        if (notConnected()) {
            return;
        }

        for (SleepTimer.OnStateChangeListener listener : mAllSleepTimerStateChangeListener) {
            notifySleepTimerTimeout(listener);
        }
    }

    private void notifySleepTimerTimeout(SleepTimer.OnStateChangeListener listener) {
        if (listener instanceof SleepTimer.OnStateChangeListener2) {
            ((SleepTimer.OnStateChangeListener2) listener).onTimeout(mPlayerState.isSleepTimerEnd());
        }
    }

    private void notifyWaitPlayCompleteChanged() {
        if (notConnected()) {
            return;
        }

        for (SleepTimer.OnWaitPlayCompleteChangeListener listener : mAllWaitPlayCompleteChangeListener) {
            notifyWaitPlayCompleteChanged(listener);
        }
    }

    private void notifyWaitPlayCompleteChanged(SleepTimer.OnWaitPlayCompleteChangeListener listener) {
        if (notConnected()) {
            return;
        }

        listener.onWaitPlayCompleteChanged(mPlayerState.isWaitPlayComplete());
    }

    private void notifyRepeat(@NonNull MusicItem musicItem, long repeatTime) {
        for (OnRepeatListener listener : mAllRepeatListener) {
            listener.onRepeat(musicItem, repeatTime);
        }
    }

    private void notifyVolumeChanged(float volume) {
        if (notConnected()) {
            return;
        }

        for (OnVolumeChaneListener listener : mAllVolumeChangeListener) {
            listener.onVolumeChanged(volume);
        }
    }

    // 用于管理与同步播放器状态
    private class PlayerStateListenerImpl implements PlayerStateListener,
            SleepTimer.OnStateChangeListener2,
            SleepTimer.OnWaitPlayCompleteChangeListener {

        @Override
        public void onPreparing() {
            boolean error = mPlayerState.getPlaybackState() == PlaybackState.ERROR;
            mPlayerStateHelper.onPreparing();

            if (error) {
                notifyPlaybackStateChanged();
            }

            notifyPrepareStateChanged();
        }

        @Override
        public void onPrepared(int audioSessionId) {
            // ignore
        }

        @Override
        public void onPrepared(int audioSessionId, int duration) {
            mPlayerStateHelper.onPrepared(audioSessionId, duration);

            notifyPrepareStateChanged();
            notifyAudioSessionChanged();
        }

        @Override
        public void onPlay(boolean stalled, int playProgress, long playProgressUpdateTime) {
            mPlayerStateHelper.onPlay(stalled, playProgress, playProgressUpdateTime);

            notifyPlaybackStateChanged();
        }

        @Override
        public void onPause(int playProgress, long updateTime) {
            mPlayerStateHelper.onPaused(playProgress, updateTime);

            notifyPlaybackStateChanged();
        }

        @Override
        public void onStop() {
            mPlayerStateHelper.onStopped();

            notifyPlaybackStateChanged();
        }

        @Override
        public void onError(int errorCode, String errorMessage) {
            mPlayerStateHelper.onError(errorCode, errorMessage);

            notifyPlaybackStateChanged();
        }

        @Override
        public void onSeekComplete(int progress, long updateTime, boolean stalled) {
            mPlayerStateHelper.onSeekComplete(progress, updateTime, stalled);

            notifySeekComplete();
        }

        @Override
        public void onBufferedProgressChanged(int bufferedProgress) {
            mPlayerStateHelper.onBufferedChanged(bufferedProgress);

            notifyOnBufferedProgressChanged();
        }

        @Override
        public void onPlayingMusicItemChanged(@Nullable MusicItem musicItem, int position, int playProgress) {
            boolean error = mPlayerState.getPlaybackState() == PlaybackState.ERROR;
            mPlayerStateHelper.onPlayingMusicItemChanged(musicItem, position, playProgress);

            notifyPlayingMusicItemChanged();

            if (error) {
                notifyPlaybackStateChanged();
            }
        }

        @Override
        public void onStalledChanged(boolean stalled, int playProgress, long updateTime) {
            mPlayerStateHelper.onStalled(stalled, playProgress, updateTime);

            notifyStalledChanged();
        }

        @Override
        public void onPlaylistChanged(PlaylistManager playlistManager, int position) {
            mPlayerStateHelper.onPlaylistChanged(position);

            notifyPlaylistChanged();
        }

        @Override
        public void onPlayModeChanged(PlayMode playMode) {
            mPlayerStateHelper.onPlayModeChanged(playMode);

            notifyPlayModeChanged();
        }

        @Override
        public void onTimerStart(long time, long startTime, SleepTimer.TimeoutAction action) {
            // ignore
        }

        @Override
        public void onTimerEnd() {
            mPlayerStateHelper.onSleepTimerEnd();
            notifySleepTimerEnd();
        }

        @Override
        public void onShutdown() {
            disconnect();
        }

        @Override
        public void onRepeat(@NonNull MusicItem musicItem, long repeatTime) {
            mPlayerStateHelper.onRepeat(repeatTime);
            notifyRepeat(musicItem, repeatTime);
        }

        @Override
        public void onSpeedChanged(float speed, int playProgress, long playProgressUpdateTime) {
            mPlayerStateHelper.onSpeedChanged(speed, playProgress, playProgressUpdateTime);
            notifySpeedChanged();
        }

        @Override
        public void onTimerStart(long time, long startTime, TimeoutAction action, boolean waitPlayComplete) {
            mPlayerStateHelper.onSleepTimerStart(time, startTime, action);
            notifySleepTimerStarted();
        }

        @Override
        public void onWaitPlayCompleteChanged(boolean waitPlayComplete) {
            mPlayerStateHelper.onWaitPlayCompleteChanged(waitPlayComplete);
            notifyWaitPlayCompleteChanged();
        }

        @Override
        public void onTimeout(boolean actionComplete) {
            mPlayerStateHelper.onSleepTimerTimeout(actionComplete);
            notifySleepTimerTimeout();
        }

        @Override
        public void onVolumeChanged(float volume) {
            mPlayerStateHelper.onVolumeChanged(volume);
            notifyVolumeChanged(volume);
        }
    }

    private static class DestroyObserver implements LifecycleObserver {
        private final Runnable mOnDestroyAction;

        DestroyObserver(@NonNull Runnable action) {
            Preconditions.checkNotNull(action);
            mOnDestroyAction = action;
        }

        @OnLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        public void onDestroy() {
            mOnDestroyAction.run();
        }
    }
}
