package snow.player;

import android.app.ActivityManager;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetProvider;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.drawable.BitmapDrawable;
import android.media.AudioManager;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.Message;
import android.os.SystemClock;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.TextUtils;
import android.text.style.ForegroundColorSpan;

import androidx.annotation.DrawableRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;
import androidx.core.content.res.ResourcesCompat;
import androidx.media.MediaBrowserServiceCompat;
import androidx.media.session.MediaButtonReceiver;

import com.bumptech.glide.Glide;
import com.bumptech.glide.request.FutureTarget;
import com.google.common.base.Preconditions;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;

import app.tauri.plugin.Plugin;
import channel.helper.ChannelHelper;
import channel.helper.Dispatcher;
import channel.helper.DispatcherUtil;
import channel.helper.pipe.CustomActionPipe;

import channel.helper.pipe.SessionEventPipe;
import io.reactivex.Single;
import io.reactivex.SingleEmitter;
import io.reactivex.SingleOnSubscribe;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;
import io.reactivex.functions.Cancellable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;
import media.helper.HeadsetHookHelper;

import snow.player.annotation.PersistenceId;
import snow.player.effect.AudioEffectManager;
import snow.player.audio.MediaMusicPlayer;
import snow.player.audio.MusicItem;
import snow.player.audio.MusicPlayer;
import snow.player.playlist.Playlist;
import snow.player.playlist.PlaylistEditor;
import snow.player.audio.ErrorCode;
import snow.player.playlist.PlaylistManager;
import snow.player.util.MusicItemUtil;
import snow.player.util.AsyncResult;

/**
 * 提供了基本的 {@code player service} 实现，用于在后台播放音乐。
 * <p>
 * 可以使用 {@link PlayerClient} 类建立与 {@link PlayerService} 连接，并对播放器进行控制。
 * <p>
 * <b>MediaSession 框架：</b><br>
 * {@link PlayerService} 继承了 {@link MediaBrowserServiceCompat} 类，因此也可以使用
 * {@link MediaBrowserCompat} 类来建立与 {@link PlayerService} 连接，并对播放器进行控制。不过不推荐这么做，
 * 因为本项目大部的功能都依赖于 {@link PlayerClient} 类，如果不使用 {@link PlayerClient} 类，那么也无法使
 * 用这些功能。
 */
@SuppressWarnings("SameReturnValue")
public class PlayerService extends MediaBrowserServiceCompat
        implements PlayerManager, PlaylistManager, PlaylistEditor, SleepTimer {
    /**
     * 默认的 root id，值为 `"root"`。
     */
    public static final String DEFAULT_MEDIA_ROOT_ID = "root";

    /**
     * 如果你直接使用 {@link MediaBrowserCompat} 连接 PlayerService, 你的客户端可以发送该
     * {@code custom action} 来关闭 PlayerService。PlayerService 在接收到该 {@code custom action} 后
     * 会发出一个名为 {@link #SESSION_EVENT_ON_SHUTDOWN} 的 {@code session event}，客户端在接收到该
     * {@code session event} 后应该主动断开与 PlayerService 的连接。当所有客户端断开与 PlayerService 的
     * 连接后，PlayerService 会自动终止。
     */
    public static final String CUSTOM_ACTION_SHUTDOWN = "snow.player.custom_action.SHUTDOWN";

    /**
     * 如果你直接使用 {@link MediaBrowserCompat} 连接 PlayerService, 那么你的客户端应该在接收到该
     * {@code session event} 时主动断开与 PlayerService 的连接。
     */
    public static final String SESSION_EVENT_ON_SHUTDOWN = "snow.player.session_event.ON_SHUTDOWN";

    private static final String CUSTOM_ACTION_NAME = "snow.player.action.ACTION_NAME";

    private String mPersistentId;

    private PlayerConfig mPlayerConfig;
    private PlayerState mPlayerState;
    private ServicePlayerStateHelper mPlayerStateHelper;

    private PlaylistManagerImp mPlaylistManager;
    private SnowPlayer mPlayer;
    private CustomActionPipe mCustomActionDispatcher;

    private PlayerStateListener mPlayerStateListener;
    private PlayerStateSynchronizer.OnSyncPlayerStateListener mSyncPlayerStateListener;

    private boolean mForeground;

    private NotificationManager mNotificationManager;

    private Map<String, CustomAction> mAllCustomAction;

    private MediaSessionCompat mMediaSession;

    private HeadsetHookHelper mHeadsetHookHelper;

    @Nullable
    private NotificationView mNotificationView;

    @Nullable
    private AudioEffectManager mAudioEffectManager;

    @Nullable
    private HistoryRecorder mHistoryRecorder;

    private SleepTimerImp mSleepTimer;

    private int mMaxIDLEMinutes = -1;
    @Nullable
    private PendingIntent mIDLEPendingIntent;

    private Intent mKeepAliveIntent;
    private KeepAliveConnection mKeepAliveConnection;
    private boolean mKeepServiceAlive;

    private BroadcastReceiver mCustomActionReceiver;
    private PlayerStateSynchronizer mPlayerStateSynchronizer;

    private SnowPlayer.OnStateChangeListener mOnStateChangeListener;

    private HandlerThread mSyncPlayerStateHandlerThread;
    private Handler mSyncPlayerStateHandler;
    private CountDownLatch mPlayerPrepareLatch;

    private long mIDLEShutdownTime;
    private final List<PlaybackStateCompat.CustomAction> mMediaCustomActions = new ArrayList<>();

    @Override
    public void onCreate() {
        super.onCreate();

        mPersistentId = getPersistenceId(this.getClass());
        mAllCustomAction = new HashMap<>();
        mKeepAliveIntent = new Intent(this, this.getClass());
        mKeepAliveConnection = new KeepAliveConnection();
        mPlayerPrepareLatch = new CountDownLatch(1);
        mPlayerStateSynchronizer = clientToken -> {
            Message message = mSyncPlayerStateHandler.obtainMessage();
            message.obj = clientToken;
            mSyncPlayerStateHandler.sendMessage(message);
        };

        initNotificationManager();
        initPlayerConfig();
        initPlayerState();
        initPlayerStateHelper();
        initPlaylistManager();
        initNotificationView();
        initOnStateChangeListener();
        initPlayer();
        initAudioEffectManager();
        initCustomActionDispatcher();
        initHeadsetHookHelper();
        initMediaSession();
        initSessionEventEmitter();
        initHistoryRecorder();
        initCustomActionReceiver();
        initSyncPlayerStateHandler();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            startForegroundAPI31();
        }
        preparePlayer();
        keepServiceAlive();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            MediaButtonReceiver.handleIntent(mMediaSession, intent);
        }

        return START_NOT_STICKY;
    }

    private void handleCustomAction(String action, Bundle extras) {
        CustomAction customAction = mAllCustomAction.get(action);
        if (customAction != null) {
            customAction.doAction(getPlayer(), extras);
        }
    }

    @Nullable
    @Override
    public BrowserRoot onGetRoot(@NonNull String clientPackageName, int clientUid, @Nullable Bundle rootHints) {
        return new BrowserRoot(DEFAULT_MEDIA_ROOT_ID, null);
    }

    @Override
    public void onLoadChildren(@NonNull String parentId, @NonNull Result<List<MediaBrowserCompat.MediaItem>> result) {
        result.sendResult(Collections.emptyList());
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);

        checkIDLEShutdownTime();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();

        mSyncPlayerStateHandlerThread.quit();

        if (!noNotificationView()) {
            stopForegroundEx(true);
            mNotificationView.release();
            mNotificationManager.cancel(mNotificationView.getNotificationId());
        }

        cancelIDLEAlarm();

        unregisterReceiver(mCustomActionReceiver);
        mMediaSession.release();
        mPlayer.release();

        mPlayer = null;

        if (mAudioEffectManager != null) {
            mAudioEffectManager.release();
        }
    }

    private void checkIDLEShutdownTime() {
        if (notIDLE() || mIDLEShutdownTime < 1) {
            return;
        }

        if (SystemClock.elapsedRealtime() >= mIDLEShutdownTime) {
            shutdown();
        }
    }

    boolean isPlaying() {
        return mPlayer.isMusicPlayerPlaying();
    }

    // 避免因所有客户端都断开连接而导致 Service 终止
    private void keepServiceAlive() {
        if (mKeepServiceAlive) {
            return;
        }

        mKeepServiceAlive = true;
        bindService(mKeepAliveIntent, mKeepAliveConnection, BIND_AUTO_CREATE);
    }

    private void preparePlayer() {
        mPlayer.initialize(() -> mPlayerPrepareLatch.countDown());
    }

    private void dismissKeepServiceAlive() {
        if (mKeepServiceAlive) {
            mKeepServiceAlive = false;
            unbindService(mKeepAliveConnection);
        }
    }

    private void initNotificationManager() {
        mNotificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NotificationView.CHANNEL_ID,
                    getString(R.string.snow_notification_channel_name),
                    NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            mNotificationManager.createNotificationChannel(channel);
        }
    }

    private void initPlayerConfig() {
        mPlayerConfig = new PlayerConfig(this, mPersistentId);
    }

    private void initPlayerState() {
        mPlayerState = new PersistentPlayerState(this, mPersistentId);
    }

    private void initPlayerStateHelper() {
        List<Class<? extends AppWidgetProvider>> appWidgets = getAppWidgets();

        if (appWidgets == null && getAppWidget() != null) {
            Class<? extends AppWidgetProvider> clazz = getAppWidget();
            appWidgets = new ArrayList<>();
            appWidgets.add(clazz);
        }

        mPlayerStateHelper = new ServicePlayerStateHelper(
                mPlayerState,
                getApplicationContext(),
                this.getClass(),
                appWidgets
        );
    }

    private void initPlaylistManager() {
        mPlaylistManager = new PlaylistManagerImp(this, mPersistentId);
    }

    private void initOnStateChangeListener() {
        mOnStateChangeListener = new SnowPlayer.OnStateChangeListener() {
            @Override
            public void onPreparing() {
                PlayerService.this.updateNotificationView();
                PlayerService.this.cancelIDLEAlarm();
            }

            @Override
            public void onPrepared(int audioSessionId) {
                PlayerService.this.updateNotificationView();
            }

            @Override
            public void onPlaying(int progress, long updateTime) {
                PlayerService.this.updateNotificationView();
                PlayerService.this.cancelIDLEAlarm();
            }

            @Override
            public void onPaused() {
                PlayerService.this.updateNotificationView();
                PlayerService.this.startIDLEAlarm();
            }

            @Override
            public void onStalledChanged(boolean stalled) {
                PlayerService.this.updateNotificationView();
            }

            @Override
            public void onStopped() {
                PlayerService.this.updateNotificationView();
                PlayerService.this.startIDLEAlarm();
            }

            @Override
            public void onError(int errorCode, String errorMessage) {
                PlayerService.this.updateNotificationView();
            }

            @Override
            public void onPlayingMusicItemChanged(@Nullable MusicItem musicItem) {
                PlayerService.this.onPlayingMusicItemChanged(musicItem);
            }

            @Override
            public void onPlayModeChanged(@NonNull PlayMode playMode) {
                PlayerService.this.notifyPlayModeChanged(playMode);
            }
        };
    }

    private void initPlayer() {
        SnowPlayer.Factory factory = new SnowPlayer.Factory() {
            @Override
            public MusicPlayer createMusicPlayer(@NonNull Context context, @NonNull MusicItem musicItem, @NonNull Uri uri) {
                return onCreateMusicPlayer(context, musicItem, uri);
            }

            @Override
            public AudioManager.OnAudioFocusChangeListener createAudioFocusChangeListener() {
                return PlayerService.this.onCreateAudioFocusChangeListener();
            }

            @Override
            public List<PlaybackStateCompat.CustomAction> createMediaCustomAction() {
                return mMediaCustomActions;
            }
        };

        SnowPlayer.Callback callback = new SnowPlayer.Callback() {
            @Override
            public void isCached(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality, @NonNull AsyncResult<Boolean> result) {
                PlayerService.this.isCached(musicItem, soundQuality, result);
            }

            @Override
            public void prepareMusicItem(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality, @NonNull AsyncResult<MusicItem> result) {
                onPrepareMusicItem(musicItem, soundQuality, result);
            }

            @Override
            public void retrieveMusicItemUri(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality, @NonNull AsyncResult<Uri> result) {
                onRetrieveMusicItemUri(musicItem, soundQuality, result);
            }
        };

        mPlayer = new SnowPlayer(this,
                mPlayerConfig,
                mPlayerState,
                mPlayerStateHelper,
                mPlaylistManager,
                this.getClass(),
                mOnStateChangeListener,
                factory,
                callback
        );
    }

    private void initCustomActionDispatcher() {
        final Dispatcher playerStateSynchronizerDispatcher =
                ChannelHelper.newDispatcher(PlayerStateSynchronizer.class, mPlayerStateSynchronizer);

        final Dispatcher playerManagerDispatcher =
                ChannelHelper.newDispatcher(PlayerManager.class, this);

        final Dispatcher playerDispatcher =
                ChannelHelper.newDispatcher(Player.class, mPlayer);

        final Dispatcher playlistEditorDispatcher =
                ChannelHelper.newDispatcher(PlaylistEditor.class, mPlayer);

        final Dispatcher sleepTimerDispatcher =
                ChannelHelper.newDispatcher(SleepTimer.class, this);

        mCustomActionDispatcher = new CustomActionPipe(
                DispatcherUtil.merge(
                        playerStateSynchronizerDispatcher,
                        playerManagerDispatcher,
                        playerDispatcher,
                        playlistEditorDispatcher,
                        sleepTimerDispatcher
                ));
    }

    private void initNotificationView() {
        NotificationView notificationView = onCreateNotificationView();

        if (notificationView == null) {
            return;
        }

        notificationView.init(this);
        MusicItem musicItem = getPlayingMusicItem();

        if (musicItem != null) {
            notificationView.setPlayingMusicItem(musicItem);
        }

        mNotificationView = notificationView;
    }

    private void initHeadsetHookHelper() {
        mHeadsetHookHelper = new HeadsetHookHelper(PlayerService.this::onHeadsetHookClicked);
    }

    private void initMediaSession() {
        mMediaSession = new MediaSessionCompat(this, this.getClass().getName());
        mPlayer.setMediaSession(mMediaSession);

        mMediaSession.setCallback(onCreateMediaSessionCallback(), new Handler(Looper.getMainLooper()));

        setSessionToken(mMediaSession.getSessionToken());
    }

    private void initSessionEventEmitter() {
        SessionEventPipe sessionEventEmitter = new SessionEventPipe(mMediaSession);
        mPlayerStateListener = ChannelHelper.newEmitter(PlayerStateListener.class, sessionEventEmitter);
        mSyncPlayerStateListener = ChannelHelper.newEmitter(PlayerStateSynchronizer.OnSyncPlayerStateListener.class, sessionEventEmitter);

        mSleepTimer = new SleepTimerImp(
                this,
                mPlayerState,
                mPlayerStateHelper,
                ChannelHelper.newEmitter(OnStateChangeListener2.class, sessionEventEmitter),
                ChannelHelper.newEmitter(OnWaitPlayCompleteChangeListener.class, sessionEventEmitter)
        );

        mPlayer.setPlayerStateListener(mPlayerStateListener);
        mPlayer.setSleepTimer(mSleepTimer);
    }

    private void initAudioEffectManager() {
        mAudioEffectManager = onCreateAudioEffectManager();

        if (mAudioEffectManager == null) {
            return;
        }

        Bundle config = mPlayerConfig.getAudioEffectConfig();
        mAudioEffectManager.init(config);
        mPlayer.setAudioEffectManager(mAudioEffectManager);
    }

    private void initHistoryRecorder() {
        mHistoryRecorder = onCreateHistoryRecorder();
    }

    private void initCustomActionReceiver() {
        mCustomActionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent != null) {
                    onCustomAction(intent.getStringExtra(CUSTOM_ACTION_NAME), intent.getExtras());
                }
            }
        };

        IntentFilter filter = new IntentFilter(this.getClass().getName());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            registerReceiver(mCustomActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(mCustomActionReceiver, filter);
        }
    }

    private void initSyncPlayerStateHandler() {
        mSyncPlayerStateHandlerThread = new HandlerThread("PlayerStateSyncThread");
        mSyncPlayerStateHandlerThread.start();

        mSyncPlayerStateHandler = new Handler(mSyncPlayerStateHandlerThread.getLooper()) {
            @Override
            public void handleMessage(@NonNull Message msg) {
                try {
                    mPlayerPrepareLatch.await();
                    mSyncPlayerStateListener.onSyncPlayerState((String) msg.obj, new PlayerState(mPlayerState));
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        };
    }


    /**
     * 设置 MediaSessionCompat 的 Flags。
     * <p>
     * 相当于调用 MediaSessionCompat 的 setFlags(int) 方法。
     */
    protected void setMediaSessionFlags(int flags) {
        mMediaSession.setFlags(flags);
    }

    /**
     * 创建一个 {@link MediaSessionCallback} 对象。
     * <p>
     * 如果你需要对 MediaSession 框架的 MediaSessionCompat.Callback 进行定制，则可以覆盖该方法并返回一个
     * {@link MediaSessionCallback} 对象。{@link MediaSessionCallback} 类继承了
     * MediaSessionCompat.Callback 类。
     *
     * @see MediaSessionCallback
     */
    @NonNull
    protected MediaSessionCallback onCreateMediaSessionCallback() {
        return new MediaSessionCallback(this);
    }

    /***
     * 创建一个通知栏控制器，你可以通过覆盖该方法来提供自定义的通知栏控制器。
     *
     * 该方法默认返回 {@link MediaNotificationView}，如果你不需要在通知栏中显示控制器，可以覆盖该方法并返回 null。
     *
     * @return {@link NotificationView} 对象，返回 null 时将隐藏通知栏控制器
     */
    @Nullable
    protected NotificationView onCreateNotificationView() {
        return new MediaNotificationView();
    }

    /**
     * 创建音频特效引擎。
     *
     * @return 如果返回 null，将会关闭音频特效引擎
     */
    @Nullable
    protected AudioEffectManager onCreateAudioEffectManager() {
        return null;
    }

    /**
     * 创建历史记录器，用于记录播放器的播放历史。
     *
     * @return 如果返回 null，则不会记录播放历史（默认返回 null）
     */
    @Nullable
    protected HistoryRecorder onCreateHistoryRecorder() {
        return null;
    }

    /**
     * 返回你的 AppWidget 的 Class 对象。
     * <p>
     * 在该方法中返回你的 AppWidget 的 Class 对象，以便在播放器状态改变时刷新 APpWidget。
     * <p>
     * 如果你的 App 有多个 AppWidget 需要刷新，请可以重载 {@link #getAppWidgets()} 方法。
     * 如果重载了 {@link #getAppWidgets()} 方法并且返回了一个非 null 值，则该方法将不再有效。
     *
     * @see #getAppWidgets()
     */
    @Nullable
    protected Class<? extends AppWidgetProvider> getAppWidget() {
        return null;
    }

    /**
     * 返回你的 AppWidget 的 Class 对象。
     * <p>
     * 在该方法中返回你的 AppWidget 的 Class 对象，以便在播放器状态改变时刷新 APpWidget。
     * <p>
     * 如果你的 App 仅有单个 AppWidget 需要刷新，建议优先重载 {@link #getAppWidget()}。
     *
     * @see #getAppWidget()
     */
    @Nullable
    protected List<Class<? extends AppWidgetProvider>> getAppWidgets() {
        return null;
    }

    @Override
    public void setSoundQuality(SoundQuality soundQuality) {
        if (soundQuality == mPlayerConfig.getSoundQuality()) {
            return;
        }

        mPlayerConfig.setSoundQuality(soundQuality);
        mPlayer.notifySoundQualityChanged();
    }

    @Override
    public void setAudioEffectEnabled(boolean enabled) {
        if (mPlayerConfig.isAudioEffectEnabled() == enabled) {
            return;
        }

        mPlayerConfig.setAudioEffectEnabled(enabled);
        notifyAudioEffectEnableChanged();
    }

    @Override
    public void setAudioEffectConfig(Bundle config) {
        if (noAudioEffectManager() || !mPlayerConfig.isAudioEffectEnabled()) {
            return;
        }

        mAudioEffectManager.updateConfig(config);
        mPlayerConfig.setAudioEffectConfig(config);
    }

    /**
     * 当耳机上的按钮被点击时会调用该方法。
     * <p>
     * 该方法的默认行为：<br>
     * <ul>
     * <li>连续点击 1 次：播放/暂停</li>
     * <li>连续点击 2 次：下一曲</li>
     * <li>连续点击 3 次：上一曲</li>
     * </ul>
     * <p>
     * 你可以覆盖该方法来自定义耳机按钮被点击时的行为。
     *
     * @param clickCount 按钮被连续点击的次数。
     */
    protected void onHeadsetHookClicked(int clickCount) {
        switch (clickCount) {
            case 1:
                getPlayer().playPause();
                break;
            case 2:
                getPlayer().skipToNext();
                break;
            case 3:
                getPlayer().skipToPrevious();
                break;
        }
    }

    private boolean noAudioEffectManager() {
        return mAudioEffectManager == null;
    }

    /**
     * 对象指定的 audio session id 应用音频特效。
     *
     * @param audioSessionId 当前正在播放的音乐的 audio session id。如果为 0，则可以忽略。
     */
    @Deprecated
    protected void attachAudioEffect(int audioSessionId) {
        if (noAudioEffectManager()) {
            return;
        }

        mAudioEffectManager.attachAudioEffect(audioSessionId);
    }

    /**
     * 取消当前的音频特效。
     */
    @Deprecated
    protected void detachAudioEffect() {
        if (noAudioEffectManager()) {
            return;
        }

        mAudioEffectManager.detachAudioEffect();
    }

    private void notifyAudioEffectEnableChanged() {
        mPlayer.notifyAudioEffectEnableChanged();
    }

    @Override
    public void setOnlyWifiNetwork(boolean onlyWifiNetwork) {
        if (mPlayerConfig.isOnlyWifiNetwork() == onlyWifiNetwork) {
            return;
        }

        mPlayerConfig.setOnlyWifiNetwork(onlyWifiNetwork);
        mPlayer.notifyOnlyWifiNetworkChanged();
    }

    @Override
    public void setIgnoreAudioFocus(boolean ignoreAudioFocus) {
        if (ignoreAudioFocus == mPlayerConfig.isIgnoreAudioFocus()) {
            return;
        }

        mPlayerConfig.setIgnoreAudioFocus(ignoreAudioFocus);
        mPlayer.notifyIgnoreAudioFocusChanged();
    }

    /**
     * 关闭播放器。
     * <p>
     * 调用该方法后 Service 会要求所有已绑定的客户端断开连接，然后终止自己。
     */
    @Override
    public final void shutdown() {
        if (mPlayer.getPlaybackState() == PlaybackState.PLAYING) {
            getPlayer().pause();
        }

        stopSelf();
        notifyOnShutdown();
        dismissKeepServiceAlive();
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
     * 设置 {@link PlayerService} 处于空闲状态（暂停或者停止后）的最大存活时间。
     * <p>
     * 当播放器处于空闲状态（暂停或者停止）的时间超出 minutes 分钟后将自动终止 {@link PlayerService}。
     * 将 minutes 设置为小于等于 0 时将关闭此功能（即使播放器处于空闲状态，也不会自动终止 {@link PlayerService}）。
     * <p>
     * 默认未启用该功能。
     *
     * @param minutes 最大的空闲时间，设置为小于等于 0 时将关闭此功能（即使播放器处于空闲状态，也不会自动终止 {@link PlayerService}）。
     */
    public final void setMaxIDLETime(int minutes) {
        mMaxIDLEMinutes = minutes;

        if (minutes <= 0 && notIDLE()) {
            cancelIDLEAlarm();
            return;
        }

        startIDLEAlarm();
    }

    private void startIDLEAlarm() {
        cancelIDLEAlarm();

        if (mMaxIDLEMinutes <= 0 || notIDLE()) {
            return;
        }

        AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        }

        Intent intent = buildCustomActionIntent(CUSTOM_ACTION_SHUTDOWN);
        mIDLEPendingIntent = PendingIntent.getBroadcast(this, 0, intent, flags);

        mIDLEShutdownTime = SystemClock.elapsedRealtime() + (mMaxIDLEMinutes * 60_000L);

        alarmManager.set(
                AlarmManager.ELAPSED_REALTIME,
                mIDLEShutdownTime,
                mIDLEPendingIntent
        );
    }

    private boolean notIDLE() {
        return (isPreparing() || isStalled()) || (getPlaybackState() == PlaybackState.PLAYING);
    }

    private void cancelIDLEAlarm() {
        if (mIDLEPendingIntent == null) {
            return;
        }

        AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        alarmManager.cancel(mIDLEPendingIntent);
        mIDLEPendingIntent = null;
        mIDLEShutdownTime = 0;
    }

    /**
     * 获取当前 Service 中的 {@link MediaSessionCompat} 对象。
     *
     * @return {@link MediaSessionCompat} 对象
     */
    protected final MediaSessionCompat getMediaSession() {
        return mMediaSession;
    }

    /**
     * 添加一个自定义动作。
     * <p>
     * 自定义动作可通过构造一个具有指定 action 的 Intent 对象并调用 startService 方法触发。
     * <p>
     * 例：
     * <pre>
     * Intent intent = new Intent(context, PlayerService.class);
     * intent.setAction(action);
     * ...
     * context.startService(intent);
     * </pre>
     *
     * @param action       自定义动作的名称
     * @param customAction 自定义动作要执行的任务，不能为 null
     */
    protected final void addCustomAction(@NonNull String action, @NonNull CustomAction customAction) {
        mAllCustomAction.put(action, customAction);
    }

    /**
     * 构建一个用于触发当前 PlayerService 的自定义动作的广播 Intent。
     * <p>
     * 如果需要携带额外的参数，则可以在构建好 Intent 对象后，将这些额外参数存入到 Intent 中即可。
     *
     * @param actionName 当前 PlayerService 的自定义动作的名称，不能为 null。
     * @return 广播 Intent。使用这个 Intent 对象发送广播即可触发对应的自定义动作。
     */
    public Intent buildCustomActionIntent(@NonNull String actionName) {
        Preconditions.checkNotNull(actionName);
        return buildCustomActionIntent(actionName, this.getClass());
    }

    /**
     * 构建一个用于触发自定义动作的广播 Intent。
     * <p>
     * 如果需要携带额外的参数，则可以在构建好 Intent 对象后，将这些额外参数存入到 Intent 中即可。
     *
     * @param actionName 自定义动作的名称，不能为 null。
     * @param service    自定义动作关联到的那个 PlayerService 的 Class 对象。
     * @return 广播 Intent。使用这个 Intent 对象发送广播即可触发对应的自定义动作。
     */
    public static Intent buildCustomActionIntent(@NonNull String actionName,
                                                 @NonNull Class<? extends PlayerService> service) {
        Preconditions.checkNotNull(actionName);
        Preconditions.checkNotNull(service);

        Intent intent = new Intent(service.getName());
        intent.putExtra(CUSTOM_ACTION_NAME, actionName);

        return intent;
    }

    /**
     * 获取指定 {@link PlayerService} 的持久化 ID。
     * <p>
     * 可以使用 {@link PersistenceId} 注解设置你的的 {@link PlayerService} 的持久化 ID。
     * 该 ID 值将用于状态持久化，请务必保证其唯一性。如果没有设置，则默认返回你的 {@link PlayerService}
     * 的完整类名（使用 {@code Class.getName()} 方法获取）。
     * <p>
     * 注意！空 ID 值是非法的，如果 ID 值为空，则会抛出 IllegalArgumentException 异常。
     *
     * @param service 你的 {@link PlayerService} 的 Class 对象，不能为 null
     * @return {@link PlayerService} 的持久化 ID，如果没有设置，则返回使用你的 {@link PlayerService}
     * 的完整类名
     * @throws IllegalArgumentException 如果 ID 值为空，则抛出 IllegalArgumentException 异常
     */
    @NonNull
    public static String getPersistenceId(@NonNull Class<? extends PlayerService> service)
            throws IllegalArgumentException {
        Preconditions.checkNotNull(service);

        PersistenceId annotation = service.getAnnotation(PersistenceId.class);
        if (annotation == null) {
            return service.getName();
        }

        String persistenceId = annotation.value();
        if (persistenceId.isEmpty()) {
            throw new IllegalArgumentException("Persistence ID is empty.");
        }

        return persistenceId;
    }

    /**
     * 移除一个自定义动作。
     *
     * @param action 自定义动作的名称
     */
    protected final void removeCustomAction(@NonNull String action) {
        mAllCustomAction.remove(action);
    }

    private void notifyOnShutdown() {
        if (mPlayerState.isSleepTimerStarted()) {
            cancelSleepTimer();
        }

        mPlayerStateListener.onShutdown();
        mMediaSession.sendSessionEvent(SESSION_EVENT_ON_SHUTDOWN, null);
    }

    /**
     * 获取播放队列的播放模式。
     *
     * @return 播放队列的播放模式。
     * @see PlayMode
     */
    public final PlayMode getPlayMode() {
        return mPlayerState.getPlayMode();
    }

    /**
     * 获取播放队列携带的额外参数（可为 null）。
     */
    @Nullable
    public final Bundle getPlaylistExtra() {
        return mPlayer.getPlaylistExtra();
    }

    /**
     * 获取播放器当前的播放状态。
     *
     * @return 播放器当前的播放状态。
     */
    @NonNull
    public final PlaybackState getPlaybackState() {
        return mPlayer.getPlaybackState();
    }

    /**
     * 当前播放器是否处于 {@code stalled} 状态。
     *
     * @return 当缓冲区没有足够的数据支持播放器继续播放时，该方法会返回 {@code true}，否则返回 false
     */
    public final boolean isStalled() {
        return mPlayer.isStalled();
    }

    /**
     * 获取当前正在播放的音乐的 MusicItem 对象。
     */
    public final MusicItem getPlayingMusicItem() {
        return mPlayerState.getMusicItem();
    }

    /**
     * 播放器是否发生了错误。
     */
    public final boolean isError() {
        return getErrorCode() != ErrorCode.NO_ERROR;
    }

    /**
     * 获取错误码。
     * <p>
     * 该方法的返回值仅在发生错误（{@link #isError()} 方法返回 true）时才有意义。
     */
    public final int getErrorCode() {
        return mPlayerState.getErrorCode();
    }

    /**
     * 获取错误信息。
     * <p>
     * 该方法的返回值仅在发生错误（{@link #isError()} 方法返回 true）时才有意义。
     */
    public final String getErrorMessage() {
        return ErrorCode.getErrorMessage(this, getErrorCode());
    }

    /**
     * 要求 Service 更新 NotificationView，如果没有设置 NotificationView，则忽略本次操作。
     */
    public final void updateNotificationView() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            updateNotificationViewAPI31();
            return;
        }

        if (noNotificationView()) {
            return;
        }

        if (mNotificationView.checkIconExpired()) {
            return;
        }

        MusicItem musicItem = getPlayingMusicItem();
        if (musicItem == null || shouldClearNotification()) {
            stopForegroundEx(true);
            return;
        }

        if (shouldBeForeground() && !isForeground()) {
            startForeground();
            return;
        }

        if (!shouldBeForeground() && isForeground()) {
            stopForegroundEx(false);
        }

        updateNotification();
    }

    private void updateNotificationViewAPI31() {
        if (noNotificationView()) {
            return;
        }

        if (mNotificationView.checkIconExpired()) {
            return;
        }

        updateNotification();
    }

    private boolean shouldClearNotification() {
        if (mNotificationView == null) {
            return true;
        }

        return mPlayerState.getPlaybackState() == PlaybackState.STOPPED;
    }

    private boolean noNotificationView() {
        return mNotificationView == null;
    }

    private boolean shouldBeForeground() {
        return mPlayer.getPlaybackState() == PlaybackState.PLAYING;
    }

    /**
     * 当前 Service 是否处于前台。
     */
    protected final boolean isForeground() {
        return mForeground;
    }

    /**
     * 启动前台 Service。
     */
    protected final void startForeground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            startForegroundAPI31();
            return;
        }

        if (noNotificationView()) {
            return;
        }

        if (getPlayingMusicItem() == null) {
            stopForegroundEx(true);
            return;
        }

        if (isBackgroundRestricted()) {
            mForeground = false;
            updateNotification();
            return;
        }

        mForeground = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    mNotificationView.getNotificationId(),
                    mNotificationView.createNotification(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(
                    mNotificationView.getNotificationId(),
                    mNotificationView.createNotification()
            );
        }
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private void startForegroundAPI31() {
        if (noNotificationView()) {
            return;
        }

        if (isBackgroundRestricted()) {
            mForeground = false;
            updateNotification();
            return;
        }

        mForeground = true;

        if (getPlayingMusicItem() == null) {
            startForeground(
                    mNotificationView.getNotificationId(),
                    mNotificationView.createPlaceHolderNotification(getString(R.string.snow_waiting_to_play)),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
            return;
        }

        if (mNotificationView.checkIconExpired()) {
            startForeground(
                    mNotificationView.getNotificationId(),
                    mNotificationView.createPlaceHolderNotification(getString(R.string.snow_preparing)),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
            return;
        }

        startForeground(
                mNotificationView.getNotificationId(),
                mNotificationView.createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        );
    }

    private boolean isBackgroundRestricted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ActivityManager activityManager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
            return activityManager.isBackgroundRestricted();
        }

        return false;
    }

    /**
     * 停止前台 Service。
     *
     * @param removeNotification 是否清除 NotificationView
     */
    protected final void stopForegroundEx(boolean removeNotification) {
        mForeground = false;
        stopForeground(removeNotification);
    }

    /**
     * 设置一个新的播放列表。
     *
     * @param playlist 播放列表（不能为 null）
     */
    public final void setPlaylist(@NonNull Playlist playlist) {
        setPlaylist(playlist, 0, false);
    }

    /**
     * 设置一个新的播放列表。
     *
     * @param playlist 播放列表（不能为 null）
     * @param play     是否立即播放列表中的第一首音乐
     */
    public final void setPlaylist(@NonNull Playlist playlist, boolean play) {
        setPlaylist(playlist, 0, play);
    }

    @Override
    public void updateMusicItem(@NonNull MusicItem oldItem, @NonNull MusicItem newItem) {
        mPlayer.updateMusicItem(oldItem, newItem);
    }

    /**
     * 往列表中插入了一首新的歌曲。
     * <p>
     * 如果播放列表中已包含指定歌曲，则会将它移动到 position 位置，如果不存在，则会将歌曲插入到 position 位置。
     *
     * @param position  歌曲插入的位置
     * @param musicItem 要插入的歌曲，不能为 null
     * @throws IllegalArgumentException 如果 position 的值小于 0，则抛出该异常
     */
    @Override
    public void insertMusicItem(int position, @NonNull MusicItem musicItem) throws IllegalArgumentException {
        if (position < 0) {
            throw new IllegalArgumentException("position must >= 0.");
        }
        Preconditions.checkNotNull(musicItem);
        mPlayer.insertMusicItem(position, musicItem);
    }

    @Override
    public void appendMusicItem(@NonNull MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        mPlayer.appendMusicItem(musicItem);
    }

    /**
     * 移动播放列表中某首歌曲的位置。
     *
     * @param fromPosition 歌曲在列表中的位置
     * @param toPosition   歌曲要移动到的位置。如果 {@code toPosition == fromPosition}，则会忽略本次调用
     * @throws IllegalArgumentException 如果 fromPosition 或者 toPosition 参数小于 0，则抛出该异常
     */
    @Override
    public void moveMusicItem(int fromPosition, int toPosition) throws IllegalArgumentException {
        if (fromPosition < 0) {
            throw new IllegalArgumentException("fromPosition must >= 0.");
        }

        if (toPosition < 0) {
            throw new IllegalArgumentException("toPosition must >= 0.");
        }

        mPlayer.moveMusicItem(fromPosition, toPosition);
    }

    @Override
    public void removeMusicItem(@NonNull MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        mPlayer.removeMusicItem(musicItem);
    }

    @Override
    public void removeMusicItem(int position) {
        mPlayer.removeMusicItem(position);
    }

    @Override
    public void setNextPlay(@NonNull MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        mPlayer.setNextPlay(musicItem);
    }

    /**
     * 设置一个新的播放列表。
     *
     * @param playlist 播放列表（不能为 null）
     * @param position 播放列表中要播放的歌曲的位置
     * @param play     是否立即播放 {@code position} 参数指定处的音乐
     * @throws IllegalArgumentException 如果 position 参数小于 0，则会抛出该异常
     */
    @Override
    public final void setPlaylist(@NonNull Playlist playlist, final int position, final boolean play)
            throws IllegalArgumentException {
        Preconditions.checkNotNull(playlist);
        if (position < 0) {
            throw new IllegalArgumentException("position must >= 0.");
        }

        mPlayer.setPlaylist(playlist, position, play);
    }

    @Override
    public void save() {
        mPlayer.save();
    }

    @Override
    public void updateCurrentPlaylist(Playlist playlist) {
        mPlayer.updateCurrentPlaylist(playlist);
    }

    private void updateNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            updateNotificationAPI31();
            return;
        }

        if (noNotificationView()) {
            return;
        }

        if (getPlayingMusicItem() == null) {
            stopForegroundEx(true);
            return;
        }

        mNotificationManager.notify(
                mNotificationView.getNotificationId(),
                mNotificationView.createNotification()
        );
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private void updateNotificationAPI31() {
        if (noNotificationView()) {
            return;
        }

        if (getPlayingMusicItem() == null) {
            mNotificationManager.notify(
                    mNotificationView.getNotificationId(),
                    mNotificationView.createPlaceHolderNotification(getString(R.string.snow_waiting_to_play))
            );
            return;
        }

        mNotificationManager.notify(
                mNotificationView.getNotificationId(),
                mNotificationView.createNotification()
        );
    }

    /**
     * 已弃用，请使用 {@link #isCached(MusicItem, SoundQuality, AsyncResult)} 方法代替。
     * <p>
     * 查询具有 soundQuality 音质的 MusicItem 表示的的音乐是否已被缓存。
     * <p>
     * 该方法会在异步线程中被调用。
     *
     * @param musicItem    要查询的 MusicItem 对象
     * @param soundQuality 音乐的音质
     * @return 如果已被缓存，则返回 true，否则返回 false
     */
    @Deprecated
    protected boolean isCached(MusicItem musicItem, SoundQuality soundQuality) {
        return false;
    }

    /**
     * 查询具有 soundQuality 音质的 MusicItem 表示的的音乐是否已被缓存。
     * <p>
     * 该方法会在异步线程中被调用。
     *
     * @param musicItem    要查询的 MusicItem 对象
     * @param soundQuality 音乐的音质
     * @param result       用于接收异步任务的结果值
     */
    protected void isCached(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality, @NonNull AsyncResult<Boolean> result) {
        result.onSuccess(isCached(musicItem, soundQuality));
    }

    /**
     * 该方法会在创建 MusicPlayer 对象时调用。
     * <p>
     * 你可以重写该方法来返回你自己的 MusicPlayer 实现。
     *
     * @param context Application Context
     * @return 音乐播放器（不能为 null）
     */
    @NonNull
    protected MusicPlayer onCreateMusicPlayer(@NonNull Context context, @NonNull MusicItem musicItem, @NonNull Uri uri) {
        return new MediaMusicPlayer(context, uri);
    }

    /**
     * 可以通过覆盖该方法来提供一个自定义的 AudioManager.OnAudioFocusChangeListener
     *
     * @return 如果返回 null，则会使用默认的音频焦点监听器（默认返回 null）。
     */
    @Nullable
    protected AudioManager.OnAudioFocusChangeListener onCreateAudioFocusChangeListener() {
        return null;
    }

    /**
     * 已弃用，使用 {@link #onRetrieveMusicItemUri(MusicItem, SoundQuality, AsyncResult)} 方法代替。
     * <p>
     * 获取音乐的播放链接。
     * <p>
     * 该方法会在异步线程中执行，因此可以执行各种耗时操作，例如访问网络。
     *
     * @param musicItem    要播放的音乐
     * @param soundQuality 要播放的音乐的音质
     * @return 音乐的播放链接
     * @throws Exception 获取音乐播放链接的过程中发生的任何异常
     */
    @Deprecated
    @SuppressWarnings("RedundantThrows")
    protected Uri onRetrieveMusicItemUri(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality) throws Exception {
        return Uri.parse(musicItem.getUri());
    }

    /**
     * 获取音乐的播放链接。
     * <p>
     * 该方法会在异步线程中执行，因此可以执行各种耗时操作，例如访问网络。
     *
     * @param musicItem    要播放的音乐
     * @param soundQuality 要播放的音乐的音质
     * @param result       用于接收异步任务的结果值
     */
    protected void onRetrieveMusicItemUri(@NonNull MusicItem musicItem,
                                          @NonNull SoundQuality soundQuality,
                                          @NonNull AsyncResult<Uri> result) {
        try {
            result.onSuccess(onRetrieveMusicItemUri(musicItem, soundQuality));
        } catch (Exception e) {
            if (!result.isCancelled()) {
                result.onError(e);
            }
        }
    }

    /**
     * 准备 {@link MusicItem} 对象。
     * <p>
     * 该方法会在歌曲即将播放前调用，你可以在该方法中对 {@link MusicItem} 对象进行修改。
     * 例如，从服务器获取歌曲的播放时长、播放链接，并使用这些数据更新 {@link MusicItem} 对象。
     * <p>
     * 对 {@link MusicItem} 对象的修改可能会被持久化保存到本地，请务必注意这一点。
     * <p>
     * 该方法会在异步线程中执行，因此可以执行各种耗时操作，例如访问网络。
     * <p>
     * 注意！如果你在该方法中获取并修改了 {@link MusicItem} 的播放链接，但你同时又重写了
     * {@link #onRetrieveMusicItemUri(MusicItem, SoundQuality, AsyncResult)} 方法来获取歌曲的最新播放链接，
     * 则在播放歌曲时，会优先使用 {@link #onRetrieveMusicItemUri(MusicItem, SoundQuality, AsyncResult)}
     * 方法获取到的播放链接。如果你仅仅只需要在播放时获取歌曲的最新播放链接，建议重写
     * {@link #onRetrieveMusicItemUri(MusicItem, SoundQuality, AsyncResult)} 方法即可。
     *
     * @param musicItem    即将播放的 {@link MusicItem} 对象，不为 null。
     * @param soundQuality 即将播放的音乐的音质
     * @param result       用于接收修正后的 {@link MusicItem} 对象，不为 null。
     */
    protected void onPrepareMusicItem(@NonNull MusicItem musicItem,
                                      @NonNull SoundQuality soundQuality,
                                      @NonNull AsyncResult<MusicItem> result) {
        result.onSuccess(musicItem);
    }

    /**
     * 获取播放器的 Player 对象。可用于对播放器进行控制。
     */
    @NonNull
    public final Player getPlayer() {
        return mPlayer;
    }

    private void onPlayingMusicItemChanged(@Nullable MusicItem musicItem) {
        if (mNotificationView != null && musicItem != null) {
            mNotificationView.setPlayingMusicItem(musicItem);
        }

        updateNotificationView();

        if (mHistoryRecorder != null && musicItem != null) {
            mHistoryRecorder.recordHistory(musicItem);
        }
    }

    /**
     * 该方法会在媒体按钮被触发时调用。
     *
     * @param mediaButtonEvent 被触发的媒体按钮
     * @return 是否已处理该媒体按钮事件，如果已处理，则应该返回 true，否则返回 false
     */
    protected boolean onMediaButtonEvent(Intent mediaButtonEvent) {
        return mHeadsetHookHelper.handleMediaButton(mediaButtonEvent);
    }

    /**
     * 该方法会在 MediaSession 接收到 custom action 时调用。
     * <p>
     * 如果你重写了此方法，请务必使用 {@code super.onCustomAction(action, extras)} 回调超类方法。
     *
     * @param action 自定义动作的名称
     * @param extras 自定义动作携带的额外数据
     */
    protected void onCustomAction(String action, Bundle extras) {
        if (CUSTOM_ACTION_SHUTDOWN.equals(action)) {
            shutdown();
            return;
        }

        if (mCustomActionDispatcher.dispatch(action, extras)) {
            return;
        }

        handleCustomAction(action, extras);
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

    @Override
    public void getPlaylist(@NonNull Callback callback) {
        Preconditions.checkNotNull(callback);
        mPlaylistManager.getPlaylist(callback);
    }

    @Override
    public long getLastModified() {
        return mPlaylistManager.getLastModified();
    }

    /**
     * 启动睡眠定时器。
     *
     * @param time   睡眠时间（单位：毫秒）。播放器会在经过 time 时间后暂停播放。
     * @param action 定时器的的时间到时要执行的操作。
     * @throws IllegalArgumentException 如果 time 小于 0，则抛出该异常。
     */
    @Override
    public void startSleepTimer(long time, @NonNull final TimeoutAction action) throws IllegalArgumentException {
        mSleepTimer.startSleepTimer(time, action);
    }

    /**
     * 取消睡眠定时器。
     */
    @Override
    public void cancelSleepTimer() {
        mSleepTimer.cancelSleepTimer();
    }

    @Override
    public void setWaitPlayComplete(boolean waitPlayComplete) {
        mSleepTimer.setWaitPlayComplete(waitPlayComplete);
    }

    private void notifyPlayModeChanged(@NonNull PlayMode playMode) {
        if (mNotificationView != null) {
            mNotificationView.onPlayModeChanged(playMode);
        }
    }

    /**
     * 该类继承了 MediaSessionCompat.Callback 类，如果你需要对 MediaSession 框架的
     * 的 MediaSessionCompat.Callback 进行定制，则可以覆盖 {@link #onCreateMediaSessionCallback()} 方法，
     * 并返回一个自定义的 {@link MediaSessionCallback} 实现。
     * <p>
     * 注意！在覆盖 {@link MediaSessionCallback} 的方法时，使用 {@code super.xxx} 回调超类被覆盖的方法，
     * 因为 {@link PlayerService} 的部分功能依赖这些方法。如果没有使用 {@code super.xxx}
     * 回调超类被覆盖的方法，则这部分功能将无法正常工作。
     *
     * @see #onCreateMediaSessionCallback()
     */
    public static class MediaSessionCallback extends MediaSessionCompat.Callback {
        private final PlayerService mPlayerService;
        private final Player mPlayer;

        public MediaSessionCallback(@NonNull PlayerService playerService) {
            Preconditions.checkNotNull(playerService);
            mPlayerService = playerService;
            mPlayer = mPlayerService.getPlayer();
        }

        /**
         * 获取当前 {@link MediaSessionCallback} 关联到的 {@link PlayerService} 对象。
         */
        @NonNull
        public PlayerService getPlayerService() {
            return mPlayerService;
        }

        /**
         * 获取播放器的 MediaSessionCompat 对象。
         */
        public MediaSessionCompat getMediaSession() {
            return mPlayerService.getMediaSession();
        }

        /**
         * 获取播放器的 {@link Player} 对象。用于对播放器进行控制。
         */
        public Player getPlayer() {
            return mPlayer;
        }

        @Override
        public boolean onMediaButtonEvent(Intent mediaButtonEvent) {
            if (mPlayerService.onMediaButtonEvent(mediaButtonEvent)) {
                return true;
            }

            return super.onMediaButtonEvent(mediaButtonEvent);
        }

        @Override
        public void onCustomAction(String action, Bundle extras) {
            mPlayerService.onCustomAction(action, extras);
        }

        @Override
        public void onPlay() {
            mPlayer.play();
        }

        @Override
        public void onSkipToQueueItem(long id) {
            mPlayer.skipToPosition((int) id);
        }

        @Override
        public void onPause() {
            mPlayer.pause();
        }

        @Override
        public void onSkipToNext() {
            mPlayer.skipToNext();
        }

        @Override
        public void onSkipToPrevious() {
            mPlayer.skipToPrevious();
        }

        @Override
        public void onFastForward() {
            mPlayer.fastForward();
        }

        @Override
        public void onRewind() {
            mPlayer.rewind();
        }

        @Override
        public void onStop() {
            mPlayer.stop();
        }

        @Override
        public void onSeekTo(long pos) {
            mPlayer.seekTo((int) pos);
        }

        @Override
        public void onSetRepeatMode(int repeatMode) {
            if (repeatMode == PlaybackStateCompat.REPEAT_MODE_ONE) {
                mPlayer.setPlayMode(PlayMode.LOOP);
                return;
            }

            mPlayer.setPlayMode(PlayMode.PLAYLIST_LOOP);
        }

        @Override
        public void onSetShuffleMode(int shuffleMode) {
            if (shuffleMode == PlaybackStateCompat.SHUFFLE_MODE_NONE ||
                    shuffleMode == PlaybackStateCompat.SHUFFLE_MODE_INVALID) {
                mPlayer.setPlayMode(PlayMode.PLAYLIST_LOOP);
                return;
            }

            mPlayer.setPlayMode(PlayMode.SHUFFLE);
        }
    }

    /**
     * 通知栏控制器的基类。
     */
    public static abstract class NotificationView {
        /**
         * 通知的 channelId 值，值为：{@code "player"}
         */
        public static final String CHANNEL_ID = "player";

        private PlayerService mPlayerService;

        private MusicItem mPlayingMusicItem;
        private boolean mExpire;
        private boolean mIconExpired;

        private Bitmap mDefaultIcon;
        private int mIconWidth;
        private int mIconHeight;

        private Bitmap mIcon;
        private BetterIconLoader mBetterIconLoader;
        private Disposable mIconLoaderDisposable;

        private boolean mReleased;

        private int mPendingIntentRequestCode;
        private boolean mInitialized = false;

        void init(PlayerService playerService) {
            mPlayerService = playerService;
            mPlayingMusicItem = new MusicItem();
            mDefaultIcon = loadDefaultIcon();
            mIcon = mDefaultIcon;
            mBetterIconLoader = onCreateBetterIconLoader(playerService);
            Preconditions.checkNotNull(mBetterIconLoader);

            setIconSize(playerService.getResources().getDimensionPixelSize(R.dimen.snow_notif_icon_size_big));
            onInit(mPlayerService);
            mInitialized = true;
        }

        @NonNull
        private Bitmap loadDefaultIcon() {
            Context context = getContext();
            BitmapDrawable drawable = (BitmapDrawable) ResourcesCompat.getDrawable(
                    context.getResources(),
                    R.mipmap.snow_notif_default_icon,
                    context.getTheme());

            if (drawable == null) {
                throw new NullPointerException();
            }

            return drawable.getBitmap();
        }

        protected boolean isIconExpire() {
            return mIconExpired;
        }

        protected void reloadIcon() {
            disposeLastLoading();
            mIconLoaderDisposable = Single.create(new SingleOnSubscribe<Bitmap>() {
                        @Override
                        public void subscribe(@NonNull final SingleEmitter<Bitmap> emitter) {
                            mBetterIconLoader.loadIcon(getPlayingMusicItem(), mIconWidth, mIconHeight, new AsyncResult<Bitmap>() {
                                @Override
                                public void onSuccess(@NonNull Bitmap bitmap) {
                                    emitter.onSuccess(bitmap);
                                }

                                @Override
                                public void onError(@NonNull Throwable throwable) {
                                    throwable.printStackTrace();
                                    emitter.onSuccess(getDefaultIcon());
                                }

                                @Override
                                public boolean isCancelled() {
                                    return emitter.isDisposed();
                                }

                                @Override
                                public synchronized void setOnCancelListener(@Nullable OnCancelListener listener) {
                                    super.setOnCancelListener(listener);

                                    emitter.setCancellable(new Cancellable() {
                                        @Override
                                        public void cancel() {
                                            notifyCancelled();
                                        }
                                    });
                                }
                            });
                        }
                    }).subscribeOn(Schedulers.io())
                    .observeOn(AndroidSchedulers.mainThread())
                    .subscribe(this::setIcon);
        }

        private void disposeLastLoading() {
            if (mIconLoaderDisposable != null && !mIconLoaderDisposable.isDisposed()) {
                mIconLoaderDisposable.dispose();
            }
        }

        /**
         * 该方法会在初次创建 NotificationView 对象时调用，你可以重写该方法来进行一些初始化操作。
         */
        protected void onInit(Context context) {
        }

        /**
         * 创建一个 {@link IconLoader} 对象。
         * <p>
         * 如果子类想要实现自定义的图片加载逻辑，则可以覆盖该方法来提供一个自定义的 {@link IconLoader}。
         *
         * @param context Context 对象，不为 null
         * @return {@link IconLoader} 对象，不能为 null
         */
        @Deprecated
        @NonNull
        protected IconLoader onCreateIconLoader(@NonNull Context context) {
            return new IconLoaderImp(context, getDefaultIcon());
        }

        @NonNull
        protected BetterIconLoader onCreateBetterIconLoader(@NonNull Context context) {
            return new IconLoaderCompat(onCreateIconLoader(context));
        }

        /**
         * 该方法会在播放模式发生改变时调用。
         *
         * @param playMode 当前播放模式。
         */
        protected void onPlayModeChanged(@NonNull PlayMode playMode) {
        }

        /**
         * 该方法会在 Service 销毁时调用，可以在该方法中释放占用的资源。
         */
        @SuppressWarnings("EmptyMethod")
        protected void onRelease() {
        }

        /**
         * 检查图标是否已过期，如果已过期，则会重新加载图标。
         * <p>
         * 仅在图标完成加载后才会更新 Notification。
         *
         * @return 如果图标已完成加载，则返回 true，否则返回 false。
         */
        boolean checkIconExpired() {
            if (isIconExpire() && (mIconLoaderDisposable == null || mIconLoaderDisposable.isDisposed())) {
                reloadIcon();
            }

            return mIconExpired;
        }

        protected void onPlayingMusicItemChanged(@NonNull MusicItem musicItem) {
        }

        protected void onIconLoaded() {
        }

        /**
         * 构建一个可附件到通知控件上的 PendingIntent 自定义动作。
         *
         * @param actionName   自定义动作名称。
         * @param customAction 自定义动作被触发时要执行的任务。
         * @return PendingIntent 对象
         */
        public final PendingIntent buildCustomAction(String actionName, CustomAction customAction) {
            addCustomAction(actionName, customAction);

            mPendingIntentRequestCode += 1;

            Intent intent = mPlayerService.buildCustomActionIntent(actionName);

            int flags;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;
            } else {
                flags = PendingIntent.FLAG_UPDATE_CURRENT;
            }

            return PendingIntent.getBroadcast(getContext(),
                    mPendingIntentRequestCode,
                    intent,
                    flags);
        }

        /**
         * 创建一个新的 Notification 对象，不能为 null。
         *
         * @return Notification 对象，不能为 null。
         */
        @NonNull
        public abstract Notification onCreateNotification();

        /**
         * 创建一个用于占位的 Notification 通知。
         * <p>
         * 可以通过覆盖该方法来返回自定义的 Notification 占位通知。
         * <p>
         * 说明：由于 Android 12 禁止在后台启动前台 Service，而 PlayerService 会等待歌曲图片完成后再启动前台 Service 或者更新通知。
         * 如果歌曲图片的加载时间过长。并且在图片加载完成前应用已被切换到后台，这种情况下就会导致 ForegroundServiceStartNotAllowedException。
         * 为了避免该异常，当启动前台 Service 时，如果歌曲图片尚未加载完成，或者当前没有正在播放的歌曲，则会立即使用占位通知启动前台 Service，
         * 并且在歌曲图片加载完成后将其更新为正常的通知。
         *
         * @param hint 可选的提示信息，你可以使用该提示信息，或者使用任何自定义的提示信息。
         * @return Notification 对象，不能为 null。
         */
        @NonNull
        @RequiresApi(Build.VERSION_CODES.S)
        public abstract Notification onCreatePlaceHolderNotification(String hint);

        /**
         * 返回 Notification 的 ID。
         */
        public abstract int getNotificationId();

        /**
         * 关闭播放器。
         */
        public final void shutdown() {
            mPlayerService.shutdown();
        }

        /**
         * 获取当前通知栏控制器的图标。
         */
        public final Bitmap getIcon() {
            return mIcon;
        }

        /**
         * 设置当前通知栏控制器的图标。
         * <p>
         * 调用该方法后会自动更新通知栏控制器，以应用最新设置的图标。
         */
        public final void setIcon(@NonNull Bitmap icon) {
            mIconExpired = false;
            mIcon = icon;

            mPlayerService.mPlayer.setIcon(icon);

            onIconLoaded();
            invalidate();
        }

        /**
         * 设置图标的尺寸（默认尺寸为 0）。
         * <p>
         * 建议子类覆盖 {@link #onInit(Context)} 方法，并在该方法中完成图标尺寸的设置。
         */
        public final void setIconSize(int size) {
            setIconSize(size, size);
        }

        /**
         * 分别设置图标的宽高尺寸（默认宽高为 0）。
         * <p>
         * 建议子类覆盖 {@link #onInit(Context)} 方法，并在该方法中完成图标宽高尺寸的设置。
         */
        public final void setIconSize(int width, int height) {
            mIconWidth = Math.max(0, width);
            mIconHeight = Math.max(0, height);
        }

        public final void setDefaultIcon(@NonNull Bitmap bitmap) {
            Preconditions.checkNotNull(bitmap);
            mDefaultIcon = bitmap;

            if (mBetterIconLoader instanceof IconLoaderCompat) {
                IconLoaderCompat iconLoaderCompat = (IconLoaderCompat) mBetterIconLoader;
                iconLoaderCompat.setDefaultIcon(bitmap);
            }
        }

        @NonNull
        public final Bitmap getDefaultIcon() {
            return mDefaultIcon;
        }

        /**
         * 工具方法，在 {@link PlaybackState#ERROR} 状态时，会返回一个
         * {@code android.R.color.holo_red_dark} 颜色的描述错误信息的 CharSequence 对象；其它状态下会将
         * {@code defaultValue} 原值返回。
         *
         * @param contentText context text 的值，如果播放器处于正常播放器状态，该方法会将这个值原样返回，
         *                    如果播放器正发生了错误，则将返回一个提示字符串
         */
        public final CharSequence getContentText(String contentText) {
            CharSequence text = contentText;

            if (isError()) {
                text = getErrorMessage();
                Resources res = getContext().getResources();
                SpannableString colorText = new SpannableString(text);
                colorText.setSpan(new ForegroundColorSpan(res.getColor(android.R.color.holo_red_dark)), 0, text.length(), Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
                return colorText;
            }

            return text;
        }

        /**
         * 获取 Context 对象。
         */
        public final Context getContext() {
            return mPlayerService;
        }

        /**
         * 获取当前应用的包名。
         */
        public final String getPackageName() {
            return getContext().getPackageName();
        }

        /**
         * 获取播放器的播放模式。
         */
        public final PlayMode getPlayMode() {
            return mPlayerService.getPlayMode();
        }

        /**
         * 获取播放队列携带的额外参数（可为 null）。
         */
        @Nullable
        public final Bundle getPlaylistExtra() {
            return mPlayerService.getPlaylistExtra();
        }

        /**
         * 添加自定义动作。
         *
         * @param action       自定在动作的名称，请保证该值的唯一性
         * @param customAction 要执行的任务
         */
        public final void addCustomAction(@NonNull String action, @NonNull CustomAction customAction) {
            mPlayerService.addCustomAction(action, customAction);
        }

        /**
         * 添加媒体自定义动作。
         * <p>
         * 媒体自定义动作会作为媒体按钮显示在通知上。
         * <p>
         * 注意！必须在 {@link #onInit(Context)} 方法中注册自定义媒体动作。在其他方法中调用将导致异常。
         * <br>
         * <b>例：</b>
         * <br>
         * <pre>
         * {@code if (Build.VERSION.SDK_INT > = Build.VERSION_CODES.TIRAMISU) {
         *     registerMediaCustomAction(
         *             ACTION_TOGGLE_FAVORITE,
         *             "Favorite",
         *             R.mipmap.ic_notif_favorite_false,
         *             (player, extras) -> {
         *                  // do something
         *             }
         *     );
         * }
         * }
         * </pre>
         *
         * @param action       自定义动作，请保证该值的唯一性。
         * @param name         自定义动作的名称。
         * @param iconRes      自定义动作的图标。
         * @param customAction 要执行的任务
         * @see #registerMediaCustomAction(String, CharSequence, int, Bundle, CustomAction)
         */
        @RequiresApi(Build.VERSION_CODES.TIRAMISU)
        public final void registerMediaCustomAction(
                @NonNull String action,
                @NonNull CharSequence name,
                @DrawableRes int iconRes,
                @NonNull CustomAction customAction
        ) {
            registerMediaCustomAction(action, name, iconRes, null, customAction);
        }

        /**
         * 添加媒体自定义动作。
         * <p>
         * 从 Android 13(API Level 33) 开始，媒体自定义动作会作为媒体按钮显示在通知上。
         * <p>
         * 注意！必须在 {@link #onInit(Context)} 方法中注册自定义媒体动作。在其他方法中调用将导致异常。
         * <br>
         * <b>例：</b>
         * <br>
         * <pre>
         * {@code if (Build.VERSION.SDK_INT > = Build.VERSION_CODES.TIRAMISU) {
         *     registerMediaCustomAction(
         *             ACTION_TOGGLE_FAVORITE,
         *             "Favorite",
         *             R.mipmap.ic_notif_favorite_false,
         *             (player, extras) -> {
         *                 // do something
         *             }
         *     );
         * }
         * }
         * </pre>
         *
         * @param action       自定义动作，请保证该值的唯一性。
         * @param name         自定义动作的名称。
         * @param iconRes      自定义动作的图标。
         * @param extras       为自定义媒体动作设置可选附加功能。具体请查看 <a target="_blank" href="https://developer.android.google.cn/reference/android/support/v4/media/session/PlaybackStateCompat.CustomAction.Builder?hl=en#setExtras(android.os.Bundle)">PlaybackStateCompat.CustomAction.Builder#setExtras</a>
         * @param customAction 自定义动作触发时要执行的任务。
         * @see #registerMediaCustomAction(String, CharSequence, int, CustomAction)
         */
        @RequiresApi(Build.VERSION_CODES.TIRAMISU)
        public final void registerMediaCustomAction(
                @NonNull String action,
                @NonNull CharSequence name,
                @DrawableRes int iconRes,
                @Nullable Bundle extras,
                @NonNull CustomAction customAction
        ) {
            if (mInitialized) {
                throw new IllegalStateException("请在 onInit 方法中注册自定义媒体动作。");
            }

            PlaybackStateCompat.CustomAction mediaCustomAction = new PlaybackStateCompat.CustomAction.Builder(action, name, iconRes)
                    .setExtras(extras)
                    .build();

            mPlayerService.mMediaCustomActions.add(mediaCustomAction);

            mPlayerService.addCustomAction(action, customAction);
        }

        /**
         * 播放器当前是否处正在准备中。
         *
         * @return 如果播放器正在准备中，则返回 true，否则返回 false
         */
        public final boolean isPreparing() {
            return mPlayerService.isPreparing();
        }

        /**
         * 播放器是否已准备完毕。
         *
         * @return 播放器是否已准备完毕。
         */
        public final boolean isPrepared() {
            return mPlayerService.isPrepared();
        }

        /**
         * 判断当前播放器是否处于 {@code stalled} 状态。
         *
         * @return 当缓冲区没有足够的数据支持播放器继续播放时，该方法会返回 {@code true}，否则返回 false
         */
        public final boolean isStalled() {
            return mPlayerService.isStalled();
        }

        /**
         * 获取播放器的播放状态。
         *
         * @return 播放器的播放状态
         */
        @NonNull
        public final PlaybackState getPlaybackState() {
            return mPlayerService.getPlaybackState();
        }

        /**
         * 当前是否正在播放音乐。
         */
        public final boolean isPlayingState() {
            return getPlaybackState() == PlaybackState.PLAYING;
        }

        /**
         * 播放器是否发生了错误。
         */
        public final boolean isError() {
            return getPlaybackState() == PlaybackState.ERROR;
        }

        /**
         * 获取错误信息。
         * <p>
         * 该方法的返回值仅在发生错误（{@link #isError()} 方法返回 true）时才有意义。
         */
        @NonNull
        public final String getErrorMessage() {
            return mPlayerService.getErrorMessage();
        }

        /**
         * 检查 {@link NotificationView} 是否已被释放。
         *
         * @return 如果已被释放，则返回 true，此时不应该再调用 {@link NotificationView} 的任何方法。
         */
        public final boolean isReleased() {
            return mReleased;
        }

        /**
         * 获取当前正在播放的音乐的 MusicItem 对象。
         */
        @NonNull
        public final MusicItem getPlayingMusicItem() {
            return mPlayingMusicItem;
        }

        /**
         * 获取当前播放器的 {@link MediaSessionCompat} 对象。
         *
         * @return {@link MediaSessionCompat} 对象
         */
        public final MediaSessionCompat getMediaSession() {
            return mPlayerService.getMediaSession();
        }

        /**
         * 通知是否已经过期。
         * <p>
         * 通知会在当前正在播放的音乐改变时过期。你可以在 {@link #onCreateNotification()}
         * 方法中调用该方法检测当前通知是否已过期，如果已过期，
         * 则你应该重新获取与当前正在播放的歌曲相关的信息，例如重新获取歌曲的封面图片。
         */
        public final boolean isExpire() {
            return mExpire;
        }

        /**
         * 要求 Service 更新 NotificationView，如果没有设置 NotificationView，则忽略本次操作。
         */
        public final void invalidate() {
            if (mReleased) {
                return;
            }

            mPlayerService.updateNotificationView();
        }

        @NonNull
        Notification createNotification() {
            if (mExpire) {
                reloadIcon();
            }

            mExpire = false;

            return onCreateNotification();
        }

        @NonNull
        @RequiresApi(Build.VERSION_CODES.S)
        Notification createPlaceHolderNotification(String hint) {
            return onCreatePlaceHolderNotification(hint);
        }

        void setPlayingMusicItem(@NonNull MusicItem musicItem) {
            Preconditions.checkNotNull(musicItem);
            if (mPlayingMusicItem.equals(musicItem)) {
                return;
            }

            mPlayingMusicItem = musicItem;
            mExpire = true;
            mIconExpired = true;

            onPlayingMusicItemChanged(mPlayingMusicItem);
        }

        void release() {
            onRelease();
            mReleased = true;
            disposeLastLoading();
        }

        /**
         * 已弃用，请使用 {@link BetterIconLoader} 代替。
         * <p>
         * 用于加载 {@link MusicItem} 对象的 Icon 图片。
         */
        @Deprecated
        public abstract static class IconLoader {
            private int mWidth;
            private int mHeight;
            private Bitmap mDefaultIcon;

            public IconLoader(@NonNull Bitmap defaultIcon) {
                Preconditions.checkNotNull(defaultIcon);
                mDefaultIcon = defaultIcon;
            }

            /**
             * 加载图片。
             */
            public abstract void loadIcon(@NonNull MusicItem musicItem, @NonNull Callback callback);

            /**
             * 取消加载。
             */
            public abstract void cancel();

            /**
             * 设置图片的宽度（便于自动采样以降低内存占用）。
             */
            public void setWidth(int width) {
                mWidth = width;
            }

            /**
             * 获取图片的宽度。
             */
            public int getWidth() {
                return mWidth;
            }

            /**
             * 设置图片高度（便于自动采样以降低内存占用）。
             */
            public void setHeight(int height) {
                mHeight = height;
            }

            /**
             * 获取图片高度。
             */
            public int getHeight() {
                return mHeight;
            }

            /**
             * 设置默认图片，并在图片加载失败时返回该默认图片。
             */
            public void setDefaultIcon(@NonNull Bitmap bitmap) {
                Preconditions.checkNotNull(bitmap);
                mDefaultIcon = bitmap;
            }

            /**
             * 获取默认图片，该图片会在加载失败时返回。
             */
            @NonNull
            public Bitmap getDefaultIcon() {
                return mDefaultIcon;
            }

            /**
             * 回调接口。
             */
            @Deprecated
            public interface Callback {
                /**
                 * 图片加载成功或者失败时调用该方法。
                 *
                 * @param bitmap 加载的图片，加载失败时会返回默认图片。
                 * @see IconLoader#setDefaultIcon(Bitmap)
                 */
                void onIconLoaded(Bitmap bitmap);
            }
        }

        /**
         * 用于加载 {@link MusicItem} 对象的 Icon 图片。
         */
        public interface BetterIconLoader {
            /**
             * 加载 {@link MusicItem} 对象的 Icon 图片。
             * <p>
             * 该方法会在异步线程中调用，因此你可以在该方法中执行耗时任务，例如访问网络或者文件。
             *
             * @param musicItem 要加载图片的 {@link MusicItem} 对象，不为 null
             * @param width     图片的期望宽度
             * @param height    图片的期望高度
             * @param result    用于接收异步任务的结果值，不为 null
             */
            void loadIcon(@NonNull MusicItem musicItem, int width, int height, @NonNull AsyncResult<Bitmap> result);
        }

        private static class IconLoaderImp extends IconLoader {
            private Context mContext;
            private Disposable mLoadIconDisposable;
            private FutureTarget<Bitmap> mFutureTarget;

            IconLoaderImp(Context context, Bitmap defaultIcon) {
                super(defaultIcon);
                mContext = context;
            }

            @Override
            public void loadIcon(@NonNull final MusicItem musicItem, @NonNull final Callback callback) {
                cancelLastLoading();
                mLoadIconDisposable = Single.create(new SingleOnSubscribe<Bitmap>() {
                            @Override
                            public void subscribe(@NonNull SingleEmitter<Bitmap> emitter) {
                                // 1. load icon from internet
                                Bitmap bitmap = loadIconFromInternet(musicItem);

                                // check disposed
                                if (emitter.isDisposed()) {
                                    return;
                                }

                                // 2. load embedded picture
                                if (bitmap == null) {
                                    bitmap = loadEmbeddedPicture(musicItem);
                                }

                                // check disposed
                                if (emitter.isDisposed()) {
                                    return;
                                }

                                // 3. load default icon
                                if (bitmap == null) {
                                    bitmap = getDefaultIcon();
                                }

                                // check disposed
                                if (emitter.isDisposed()) {
                                    return;
                                }

                                emitter.onSuccess(bitmap);
                            }
                        }).subscribeOn(Schedulers.io())
                        .observeOn(AndroidSchedulers.mainThread())
                        .subscribe(new Consumer<Bitmap>() {
                            @Override
                            public void accept(Bitmap bitmap) {
                                callback.onIconLoaded(bitmap);
                            }
                        });
            }

            @Override
            public void cancel() {
                cancelLastLoading();
            }

            private Bitmap loadIconFromInternet(MusicItem musicItem) {
                mFutureTarget = Glide.with(mContext)
                        .asBitmap()
                        .load(musicItem.getIconUri())
                        .submit(getWidth(), getHeight());

                try {
                    return mFutureTarget.get();
                } catch (ExecutionException | InterruptedException | CancellationException e) {
                    return null;
                }
            }

            @SuppressWarnings("resource")
            private Bitmap loadEmbeddedPicture(MusicItem musicItem) {
                if (notLocaleMusic(musicItem)) {
                    return null;
                }

                MediaMetadataRetriever retriever = new MediaMetadataRetriever();

                try {
                    retriever.setDataSource(mContext, Uri.parse(musicItem.getUri()));
                    byte[] pictureData = retriever.getEmbeddedPicture();
                    return Glide.with(mContext)
                            .asBitmap()
                            .load(pictureData)
                            .submit(getWidth(), getHeight())
                            .get();
                } catch (IllegalArgumentException | ExecutionException | InterruptedException e) {
                    return null;
                } finally {
                    try {
                        retriever.release();
                    } catch (IOException e) {
                        // ignore
                    }
                }
            }

            private boolean notLocaleMusic(MusicItem musicItem) {
                String stringUri = musicItem.getUri();
                String scheme = Uri.parse(stringUri).getScheme();

                return "http".equalsIgnoreCase(scheme) | "https".equalsIgnoreCase(scheme);
            }

            private void cancelLastLoading() {
                if (mLoadIconDisposable != null && !mLoadIconDisposable.isDisposed()) {
                    mLoadIconDisposable.dispose();
                }

                if (mFutureTarget != null && !mFutureTarget.isDone()) {
                    mFutureTarget.cancel(true);
                }
            }
        }

        private static class IconLoaderCompat implements BetterIconLoader {
            private IconLoader mIconLoader;

            IconLoaderCompat(IconLoader iconLoader) {
                mIconLoader = iconLoader;
            }

            @Override
            public void loadIcon(@NonNull MusicItem musicItem, int width, int height, @NonNull final AsyncResult<Bitmap> result) {
                mIconLoader.setWidth(width);
                mIconLoader.setHeight(height);
                mIconLoader.loadIcon(musicItem, new IconLoader.Callback() {
                    @Override
                    public void onIconLoaded(Bitmap bitmap) {
                        result.onSuccess(bitmap);
                    }
                });

                result.setOnCancelListener(new AsyncResult.OnCancelListener() {
                    @Override
                    public void onCancelled() {
                        mIconLoader.cancel();
                    }
                });
            }

            void setDefaultIcon(Bitmap defaultIcon) {
                mIconLoader.setDefaultIcon(defaultIcon);
            }
        }
    }

    /**
     * 播放器当前是否处正在准备中。
     *
     * @return 如果播放器正在准备中，则返回 true，否则返回 false
     */
    public final boolean isPreparing() {
        return mPlayer.isPreparing();
    }

    /**
     * 播放器当前是否处已准备完毕。
     *
     * @return 如果播放器已准备完毕，则返回 true，否则返回 false
     */
    public final boolean isPrepared() {
        return mPlayer.isPrepared();
    }

    /**
     * 通知栏控制器，使用 Android 系统提供的样式。通知的样式为：<a target="_blank" href="https://developer.android.google.cn/reference/androidx/media/app/NotificationCompat.MediaStyle?hl=en">NotificationCompat.MediaStyle</a>
     * <p>
     * 该类是个抽象类，可以通过实现 {@link #onBuildMediaStyle(androidx.media.app.NotificationCompat.MediaStyle)}
     * 方法和实现 {@link #onBuildNotification(NotificationCompat.Builder)} 来对当前 NotificationView
     * 的外观进行定制。
     * <p>
     * 更多信息，请参考官方文档： <a target="_blank" href="https://developer.android.google.cn/training/notify-user/expanded#media-style">https://developer.android.google.cn/training/notify-user/expanded#media-style</a>
     * <p>
     * 注意！从 Android 13(API Level 33) 开始，<a target="_blank" href="https://developer.android.google.cn/about/versions/13/behavior-changes-13?hl=zh-cn#playback-controls">系统会从 PlaybackState 操作派生媒体控件</a>，如果你的应用的 targetSdkVersion 设置为了 33，则使用
     * {@link NotificationCompat.Builder#addAction(int, CharSequence, PendingIntent)} 添加的控件将不会再显示在通知栏中。
     * 如果你的应用的 targetSdkVersion 大于等于 从 Android 13(API Level 33)，需要使用 {@link #registerMediaCustomAction(String, CharSequence, int, Bundle, CustomAction)} 方法
     * 注册自定义媒体按钮（必须在 {@link #onInit(Context)} 方法中调用 {@link #registerMediaCustomAction(String, CharSequence, int, Bundle, CustomAction)} 方法）。
     */
    public static class MediaNotificationView extends NotificationView {
        private static final String ACTION_SKIP_TO_PREVIOUS = "__skip_to_previous";
        private static final String ACTION_PLAY_PAUSE = "__play_pause";
        private static final String ACTION_SKIP_TO_NEXT = "__skip_to_next";

        private PendingIntent mSkipToPrevious;
        private PendingIntent mPlayPause;
        private PendingIntent mSkipToNext;

        private PendingIntent mShutdown;

        @Override
        protected void onInit(Context context) {
            initAllPendingIntent();
        }

        private void initAllPendingIntent() {
            mSkipToPrevious = buildCustomAction(ACTION_SKIP_TO_PREVIOUS, (player, extras) -> player.skipToPrevious());

            mPlayPause = buildCustomAction(ACTION_PLAY_PAUSE, (player, extras) -> player.playPause());

            mSkipToNext = buildCustomAction(ACTION_SKIP_TO_NEXT, (player, extras) -> player.skipToNext());

            mShutdown = buildCustomAction(CUSTOM_ACTION_SHUTDOWN, (player, extras) -> shutdown());
        }

        public final PendingIntent doSkipToPrevious() {
            return mSkipToPrevious;
        }

        public final PendingIntent doPlayPause() {
            return mPlayPause;
        }

        public final PendingIntent doSkipToNext() {
            return mSkipToNext;
        }

        public final PendingIntent doShutdown() {
            return mShutdown;
        }

        @NonNull
        @Override
        public Notification onCreateNotification() {
            androidx.media.app.NotificationCompat.MediaStyle mediaStyle =
                    new androidx.media.app.NotificationCompat.MediaStyle()
                            .setMediaSession(getMediaSession().getSessionToken())
                            .setCancelButtonIntent(mShutdown);

            onBuildMediaStyle(mediaStyle);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
                    .setSmallIcon(getSmallIconId())
                    .setLargeIcon(getIcon())
                    .setContentTitle(MusicItemUtil.getTitle(getContext(), getPlayingMusicItem()))
                    .setContentText(getContentText(MusicItemUtil.getArtist(getContext(), getPlayingMusicItem())))
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setShowWhen(false)
                    .setAutoCancel(false)
                    .setStyle(mediaStyle);

            onBuildNotification(builder);

            return builder.build();
        }

        @NonNull
        @Override
        public Notification onCreatePlaceHolderNotification(String hint) {
            androidx.media.app.NotificationCompat.MediaStyle mediaStyle =
                    new androidx.media.app.NotificationCompat.MediaStyle()
                            .setMediaSession(getMediaSession().getSessionToken());

            NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
                    .setSmallIcon(getSmallIconId())
                    .setLargeIcon(getIcon())
                    .setContentTitle(getAppName())
                    .setContentText(hint)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setShowWhen(false)
                    .setAutoCancel(false)
                    .setStyle(mediaStyle);

            return builder.build();
        }

        private String getAppName() {
            PackageManager pm = getContext().getPackageManager();
            String appName;
            try {
                ApplicationInfo info = pm.getApplicationInfo(getPackageName(), 0);
                appName = getContext().getString(info.labelRes);
            } catch (PackageManager.NameNotFoundException e) {
                appName = "Unknown";
            }

            if (TextUtils.isEmpty(appName)) {
                appName = "Unknown";
            }

            return appName;
        }

        @Override
        public int getNotificationId() {
            return 1024;
        }

        /**
         * Notification 的 small icon 的资源 id。
         *
         * @return drawable 资源的 ID
         */
        @DrawableRes
        public int getSmallIconId() {
            return R.mipmap.snow_ic_notif_small_icon;
        }

        /**
         * 该方法会在创建 {@code NotificationCompat.MediaStyle} 对象期间调用。
         * <p>
         * 可以在该方法中对 {@code NotificationCompat.MediaStyle} 对象进行配置。例如，调用
         * {@code setShowActionsInCompactView (int... actions)} 方法设置要在紧凑的通知视图中显示的操作。
         */
        protected void onBuildMediaStyle(androidx.media.app.NotificationCompat.MediaStyle mediaStyle) {
            mediaStyle.setShowActionsInCompactView(1, 2);
        }

        /**
         * 该方法会在创建 {@code NotificationCompat.Builder} 期间调用。
         * <p>
         * 可以在该方法中对 {@code NotificationCompat.Builder} 对象进行配置。例如，调用
         * {@code addAction (int icon, CharSequence title, PendingIntent intent)} 向通知添加操作。
         * <p>
         * 该方法中使用 addAction 方法添加了三个按钮：上一曲、播放/暂停、下一曲。如果你不需要这三个按钮，
         * 则你在覆盖该方法时可以不回调超类方法。
         */
        protected void onBuildNotification(NotificationCompat.Builder builder) {
            builder.addAction(R.mipmap.snow_ic_notif_skip_to_previous, "skip_to_previous", doSkipToPrevious());

            if (isPlayingState()) {
                builder.addAction(R.mipmap.snow_ic_notif_pause, "pause", doPlayPause());
            } else {
                builder.addAction(R.mipmap.snow_ic_notif_play, "play", doPlayPause());
            }

            builder.addAction(R.mipmap.snow_ic_notif_skip_to_next, "skip_to_next", doSkipToNext());
        }
    }

    /**
     * 自定义动作。
     *
     * @see PlayerService#addCustomAction(String, CustomAction)
     */
    public interface CustomAction {
        /**
         * 要执行的任务。
         *
         * @param player 播放器
         * @param extras 携带的额外参数。通过调用 Intent.getExtras() 方法获取，可为 null
         */
        void doAction(@NonNull Player player, @Nullable Bundle extras);
    }

    // 避免因所有客户端都断开连接而导致 Service 终止
    private static class KeepAliveConnection implements ServiceConnection {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            // ignore
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            // ignore
        }
    }
}
