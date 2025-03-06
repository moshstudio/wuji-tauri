package snow.player;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.content.ContextCompat;

import com.google.common.base.Preconditions;

import java.util.List;
import java.util.Random;
import java.util.concurrent.TimeUnit;

import io.reactivex.Observable;
import io.reactivex.Single;
import io.reactivex.SingleEmitter;
import io.reactivex.SingleObserver;
import io.reactivex.SingleOnSubscribe;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;
import io.reactivex.functions.Cancellable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;
import media.helper.AudioFocusHelper;
import media.helper.BecomeNoiseHelper;
import snow.player.audio.MusicItem;
import snow.player.audio.MusicPlayer;
import snow.player.effect.AudioEffectManager;
import snow.player.helper.PhoneCallStateHelper;
import snow.player.playlist.Playlist;
import snow.player.playlist.PlaylistEditor;
import snow.player.playlist.PlaylistManager;
import snow.player.audio.ErrorCode;
import snow.player.helper.NetworkHelper;
import snow.player.util.AsyncResult;

/**
 * 该类实现了 {@link Player} 接口，并实现大部分音乐播放器功能。
 */
class SnowPlayer implements Player, PlaylistEditor {
    private static final String TAG = "SnowPlayer";
    private static final String TAG_WAKE_LOCK = "snow.player:SnowPlayer";
    private static final int FORWARD_STEP = 15_000;     // 15 秒, 单位：毫秒 ms

    private final Context mApplicationContext;
    private final PlayerConfig mPlayerConfig;
    private final PlayerState mPlayerState;
    private final PlayerStateHelper mPlayerStateHelper;
    @Nullable
    private PlayerStateListener mPlayerStateListener;

    private MusicPlayer.OnPreparedListener mPreparedListener;
    private MusicPlayer.OnCompletionListener mCompletionListener;
    private MusicPlayer.OnRepeatListener mRepeatListener;
    private MusicPlayer.OnSeekCompleteListener mSeekCompleteListener;
    private MusicPlayer.OnStalledListener mStalledListener;
    private MusicPlayer.OnBufferingUpdateListener mBufferingUpdateListener;
    private MusicPlayer.OnErrorListener mErrorListener;

    private AudioFocusHelper mAudioFocusHelper;
    private PhoneCallStateHelper mPhoneCallStateHelper;
    private BecomeNoiseHelper mBecomeNoiseHelper;
    private NetworkHelper mNetworkHelper;

    @Nullable
    private MusicPlayer mMusicPlayer;

    private boolean mPlayOnPrepared;
    private boolean mPlayOnSeekComplete;
    private Runnable mPreparedAction;
    private Runnable mSeekCompleteAction;

    private final PlaylistManagerImp mPlaylistManager;
    private Playlist mPlaylist;

    private Random mRandom;
    private Disposable mPrepareMusicItemDisposable;
    private Disposable mRetrieveUriDisposable;

    private boolean mReleased;

    private Disposable mRecordProgressDisposable;
    private Disposable mCheckCachedDisposable;

    private MediaSessionCompat mMediaSession;
    private PlaybackStateCompat.Builder mPlaybackStateBuilder;
    private PlaybackStateCompat.Builder mForbidSeekPlaybackStateBuilder;
    private MediaMetadataCompat.Builder mMediaMetadataBuilder;

    @Nullable
    private PowerManager.WakeLock mWakeLock;
    @Nullable
    private WifiManager.WifiLock mWifiLock;

    private boolean mConfirmNextPlay;
    private boolean mResumePlay;

    private boolean mInitialized;
    private OnInitializedListener mOnInitializedListener;

    private final OnStateChangeListener mOnStateChangeListener;

    private SleepTimerImp mSleepTimer;

    @Nullable
    private AudioEffectManager mAudioEffectManager;

    @Nullable
    private Bitmap mMusicIcon;

    private final Factory mFactory;
    private final Callback mCallback;

    /**
     * 创建一个 {@link SnowPlayer} 对象。
     *
     * @param context         {@link Context} 对象，不能为 null
     * @param playerConfig    {@link PlayerConfig} 对象，保存了播放器的初始配置信息，不能为 null
     * @param playerState     {@link PlayerState} 对象，保存了播放器的初始状态，不能为 null
     * @param playlistManager {@link PlaylistManagerImp} 对象，用于管理播放列表，不能为 null
     */
    SnowPlayer(
            @NonNull Context context,
            @NonNull PlayerConfig playerConfig,
            @NonNull PlayerState playerState,
            @NonNull ServicePlayerStateHelper playerStateHelper,
            @NonNull PlaylistManagerImp playlistManager,
            @NonNull Class<? extends PlayerService> playerService,
            @NonNull OnStateChangeListener listener,
            @NonNull Factory factory,
            @NonNull Callback callback
    ) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerConfig);
        Preconditions.checkNotNull(playerState);
        Preconditions.checkNotNull(playlistManager);
        Preconditions.checkNotNull(playerService);
        Preconditions.checkNotNull(listener);

        mApplicationContext = context.getApplicationContext();
        mPlayerConfig = playerConfig;
        mPlayerState = playerState;
        mPlayerStateHelper = playerStateHelper;
        mPlaylistManager = playlistManager;
        mOnStateChangeListener = listener;
        mFactory = factory;
        mCallback = callback;

        initAllListener();
        initAllHelper();

        mNetworkHelper.subscribeNetworkState();
    }

    void setAudioEffectManager(@Nullable AudioEffectManager audioEffectManager) {
        mAudioEffectManager = audioEffectManager;
    }

    void initialize(@NonNull final OnInitializedListener listener) {
        mOnInitializedListener = listener;
        loadPlaylist();
    }

    /**
     * 释放播放器所占用的资源。注意！调用该方法后，就不允许在使用当前 Player 对象了，否则会导致不可预见的错误。
     */
    public void release() {
        mReleased = true;
        disposePrepareMusicItem();
        disposeRetrieveUri();
        releaseMusicPlayer();
        releaseWakeLock();

        mAudioFocusHelper.abandonAudioFocus();
        mPhoneCallStateHelper.unregisterCallStateListener();
        mBecomeNoiseHelper.unregisterBecomeNoiseReceiver();
        mNetworkHelper.unsubscribeNetworkState();

        mAudioFocusHelper = null;
        mBecomeNoiseHelper = null;
        mNetworkHelper = null;

        mPreparedAction = null;
        mSeekCompleteAction = null;
    }

    /**
     * 获取当前正在播放的音乐。
     *
     * @return 如果没有正在播放的音乐，则返回 null
     */
    @Nullable
    protected final MusicItem getMusicItem() {
        return mPlayerState.getMusicItem();
    }

    /**
     * 准备当前播放器所持有的 {@link MusicItem} 对象（测试用）。
     *
     * @param preparedAction 在音乐播放器准备完成后要执行的操作
     */
    private void prepareMusicPlayer(boolean playOnPrepared, @Nullable Runnable preparedAction) {
        releaseMusicPlayer();
        disposeRetrieveUri();

        MusicItem musicItem = mPlayerState.getMusicItem();
        if (musicItem == null) {
            return;
        }

        if (mPlayerConfig.isOnlyWifiNetwork() && !isWiFiNetwork()) {
            notifyError(ErrorCode.ONLY_WIFI_NETWORK, ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.ONLY_WIFI_NETWORK));
            return;
        }

        mPlayOnPrepared = playOnPrepared;
        mRetrieveUriDisposable = getMusicItemUri(musicItem, mPlayerConfig.getSoundQuality())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(prepareMusicPlayer(musicItem, preparedAction), notifyGetUrlFailed());
    }

    private void disposeRetrieveUri() {
        if (mRetrieveUriDisposable != null && !mRetrieveUriDisposable.isDisposed()) {
            mRetrieveUriDisposable.dispose();
        }
    }

    private Single<Uri> getMusicItemUri(@NonNull final MusicItem musicItem, @NonNull final SoundQuality soundQuality) {
        return Single.create(new SingleOnSubscribe<Uri>() {
            @Override
            public void subscribe(@NonNull final SingleEmitter<Uri> emitter) {
                mCallback.retrieveMusicItemUri(musicItem, soundQuality, new AsyncResult<Uri>() {
                    @Override
                    public void onSuccess(@NonNull Uri uri) {
                        emitter.onSuccess(uri);
                    }

                    @Override
                    public void onError(@NonNull Throwable throwable) {
                        emitter.onError(throwable);
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
        });
    }

    private Consumer<Uri> prepareMusicPlayer(@NonNull final MusicItem musicItem, @Nullable final Runnable preparedAction) {
        return new Consumer<Uri>() {
            @Override
            public void accept(Uri uri) {
                mMusicPlayer = mFactory.createMusicPlayer(mApplicationContext, musicItem, uri);
                attachListeners(mMusicPlayer);

                mPreparedAction = preparedAction;
                notifyPreparing();

                try {
                    if (!mMusicPlayer.isInvalid()) {
                        mMusicPlayer.prepare();
                    }
                } catch (Exception e) {
                    Log.w(TAG, e);
                    notifyError(ErrorCode.DATA_LOAD_FAILED, ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.DATA_LOAD_FAILED));
                }
            }
        };
    }

    private Consumer<Throwable> notifyGetUrlFailed() {
        return new Consumer<Throwable>() {
            @Override
            public void accept(Throwable throwable) {
                Log.w(TAG, throwable);
                notifyError(ErrorCode.GET_URL_FAILED, ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.GET_URL_FAILED));
            }
        };
    }

    private boolean isWiFiNetwork() {
        return mNetworkHelper.isWifiNetwork();
    }

    private void initAllListener() {
        mPreparedListener = new MusicPlayer.OnPreparedListener() {
            @Override
            public void onPrepared(MusicPlayer mp) {
                if (mReleased) {
                    return;
                }

                mp.setLooping(isLooping());
                mp.setVolume(mPlayerState.getVolume());

                if (mPlayerConfig.isAudioEffectEnabled() && mAudioEffectManager != null) {
                    mAudioEffectManager.attachAudioEffect(mp.getAudioSessionId());
                }

                notifyPrepared(mp.getAudioSessionId(), mp.getDuration());

                MusicItem musicItem = mPlayerState.getMusicItem();
                assert musicItem != null;
                if (musicItem.isAutoDuration()) {
                    mMediaSession.setMetadata(buildMediaMetadata());
                }

                if (!mPlayerState.isForbidSeek() && mPlayerState.getPlayProgress() > 0) {
                    mPlayOnSeekComplete = mPlayOnPrepared;
                    mPlayOnPrepared = false;
                    seekTo(mPlayerState.getPlayProgress(), mPreparedAction);
                    mPreparedAction = null;
                    return;
                }

                if (mPlayOnPrepared) {
                    mPlayOnPrepared = false;
                    play();
                } else if (mPreparedAction == null) {
                    notifyPaused();
                }

                if (mPreparedAction != null) {
                    mPreparedAction.run();
                    mPreparedAction = null;
                }
            }
        };

        mCompletionListener = new MusicPlayer.OnCompletionListener() {
            @Override
            public void onCompletion(MusicPlayer mp) {
                if (mPlayerState.getPlayMode() == PlayMode.LOOP) {
                    return;
                }

                if (mPlayerState.getPlayMode() == PlayMode.SINGLE_ONCE) {
                    notifyPlayOnceComplete();
                    return;
                }

                if (getPlaybackState() != PlaybackState.PLAYING) {
                    return;
                }

                if (performSleepTimerAction()) {
                    return;
                }

                skipToNext();
            }
        };

        mRepeatListener = new MusicPlayer.OnRepeatListener() {
            @Override
            public void onRepeat(MusicPlayer mp) {
                if (performSleepTimerAction()) {
                    return;
                }

                notifyRepeat(SystemClock.elapsedRealtime());
            }
        };

        mSeekCompleteListener = new MusicPlayer.OnSeekCompleteListener() {
            @Override
            public void onSeekComplete(MusicPlayer mp) {
                if (mReleased) {
                    return;
                }

                notifySeekComplete(mp.getProgress(), SystemClock.elapsedRealtime(), mp.isStalled());

                if (mPlayOnSeekComplete) {
                    mPlayOnSeekComplete = false;
                    play();
                }

                if (mSeekCompleteAction != null) {
                    mSeekCompleteAction.run();
                    mSeekCompleteAction = null;
                }
            }
        };

        mStalledListener = new MusicPlayer.OnStalledListener() {
            @Override
            public void onStalled(boolean stalled) {
                notifyStalled(stalled);
            }
        };

        mBufferingUpdateListener = new MusicPlayer.OnBufferingUpdateListener() {
            @Override
            public void onBufferingUpdate(MusicPlayer mp, int buffered, boolean isPercent) {
                notifyBufferedChanged(buffered, isPercent);
            }
        };

        mErrorListener = new MusicPlayer.OnErrorListener() {
            @Override
            public void onError(MusicPlayer mp, int errorCode) {
                Log.e("MusicPlayer", "errorCode:" + errorCode);

                notifyError(errorCode, ErrorCode.getErrorMessage(mApplicationContext, errorCode));
            }
        };
    }

    private boolean performSleepTimerAction() {
        if (mPlayerState.isWaitPlayComplete()
                && mPlayerState.isSleepTimerStarted()
                && mPlayerState.isSleepTimerTimeout()
                && !mPlayerState.isSleepTimerEnd()) {

            releaseMusicPlayer();

            mPlayerState.setPlayProgress(0);
            mPlayerState.setPlayProgressUpdateTime(SystemClock.elapsedRealtime());

            mSleepTimer.performAction();
            return true;
        }

        return false;
    }

    private void initAllHelper() {
        initAudioFocusHelper();

        mPhoneCallStateHelper = new PhoneCallStateHelper(mApplicationContext, new PhoneCallStateHelper.OnStateChangeListener() {
            private boolean mResumePlay;

            @Override
            public void onIDLE() {
                if (mResumePlay) {
                    mResumePlay = false;
                    play();
                }
            }

            @Override
            public void onRinging() {
                if (mResumePlay) {
                    return;
                }

                mResumePlay = isPlayingState();
                pause();
            }

            @Override
            public void onOffHook() {
                if (mResumePlay) {
                    return;
                }

                mResumePlay = isPlayingState();
                pause();
            }
        });

        mBecomeNoiseHelper = new BecomeNoiseHelper(mApplicationContext, new BecomeNoiseHelper.OnBecomeNoiseListener() {
            @Override
            public void onBecomeNoise() {
                pause();
            }
        });

        mNetworkHelper = NetworkHelper.newInstance(mApplicationContext, new NetworkHelper.OnNetworkStateChangeListener() {
            @Override
            public void onNetworkStateChanged(boolean connected, boolean wifiNetwork) {
                if (!isPrepared() || !connected) {
                    return;
                }

                checkNetworkType(mPlayerConfig.isOnlyWifiNetwork(), wifiNetwork);
            }
        });
    }

    private void initAudioFocusHelper() {
        AudioManager.OnAudioFocusChangeListener listener = mFactory.createAudioFocusChangeListener();
        if (listener != null) {
            mAudioFocusHelper = new AudioFocusHelper(mApplicationContext, listener);
            return;
        }

        mAudioFocusHelper = new AudioFocusHelper(mApplicationContext, new AudioFocusHelper.OnAudioFocusChangeListener() {
            @Override
            public void onLoss() {
                mResumePlay = false;
                pause();
            }

            @Override
            public void onLossTransient() {
                boolean playing = isPlayingState();
                pause();
                // 因为调用 pause() 方法时会将 mResumePlay 设为 false，因此需要在调用 pause() 方法后再设置 mResumePlay 字段的值
                mResumePlay = playing;
            }

            @Override
            public void onLossTransientCanDuck() {
                mResumePlay = isMusicPlayerPlaying();
                if (isMusicPlayerPlaying()) {
                    assert mMusicPlayer != null;
                    mMusicPlayer.quiet();
                }
            }

            @Override
            public void onGain(boolean lossTransient, boolean lossTransientCanDuck) {
                if (!mResumePlay) {
                    return;
                }

                if (lossTransient) {
                    play();
                    return;
                }

                if (mMusicPlayer != null && lossTransientCanDuck && isMusicPlayerPlaying()) {
                    mMusicPlayer.dismissQuiet();
                }
            }
        });
    }

    private void notifyPlayOnceComplete() {
        cancelRecordProgress();
        releaseWakeLock();

        int playProgress = mPlayerState.getPlayProgress();
        long updateTime = mPlayerState.getPlayProgressUpdateTime();

        if (isPrepared()) {
            assert mMusicPlayer != null;
            playProgress = mMusicPlayer.getProgress();
            updateTime = SystemClock.elapsedRealtime();

            releaseMusicPlayer();
        }

        mPlayerStateHelper.onPaused(playProgress, updateTime);
        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PAUSED));

        // 需要将服务端保存的播放进度设置为 0，以便下次调用 play() 方法时，可以从初始位置开始播放
        mPlayerState.setPlayProgress(0);
        mPlayerState.setPlayProgressUpdateTime(updateTime);

        mBecomeNoiseHelper.unregisterBecomeNoiseReceiver();

        mOnStateChangeListener.onPaused();

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onPause(playProgress, updateTime);
        }
    }

    /**
     * 设置 MediaSessionCompat 对象。
     * <p>
     * 创建 {@link SnowPlayer} 对象后，必须调用该方法设置一个 MediaSessionCompat 对象，否则
     * {@link SnowPlayer} 对象无法正常工作。
     *
     * @param mediaSession MediaSessionCompat 对象，不能为 null
     */
    public final void setMediaSession(@NonNull MediaSessionCompat mediaSession) {
        Preconditions.checkNotNull(mediaSession);

        initMediaMetadataBuilder();
        initPlaybackStateBuilder();

        mMediaSession = mediaSession;

        if (getMusicItem() != null) {
            mPlayerState.setPlaybackState(PlaybackState.PAUSED);
            mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PAUSED));
        } else {
            mPlayerState.setPlaybackState(PlaybackState.NONE);
            mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_NONE));
        }

        mMediaSession.setMetadata(buildMediaMetadata());
    }

    void setIcon(Bitmap icon) {
        mMusicIcon = icon;
        mMediaSession.setMetadata(buildMediaMetadata());
    }

    private void initPlaybackStateBuilder() {
        mPlaybackStateBuilder = new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY |
                        PlaybackStateCompat.ACTION_PAUSE |
                        PlaybackStateCompat.ACTION_PLAY_PAUSE |
                        PlaybackStateCompat.ACTION_STOP |
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackStateCompat.ACTION_SKIP_TO_QUEUE_ITEM |
                        PlaybackStateCompat.ACTION_SET_REPEAT_MODE |
                        PlaybackStateCompat.ACTION_SET_SHUFFLE_MODE |
                        PlaybackStateCompat.ACTION_FAST_FORWARD |
                        PlaybackStateCompat.ACTION_REWIND |
                        PlaybackStateCompat.ACTION_SEEK_TO);

        mForbidSeekPlaybackStateBuilder = new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY |
                        PlaybackStateCompat.ACTION_PAUSE |
                        PlaybackStateCompat.ACTION_PLAY_PAUSE |
                        PlaybackStateCompat.ACTION_STOP |
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackStateCompat.ACTION_SKIP_TO_QUEUE_ITEM |
                        PlaybackStateCompat.ACTION_SET_REPEAT_MODE |
                        PlaybackStateCompat.ACTION_SET_SHUFFLE_MODE |
                        PlaybackStateCompat.ACTION_SET_RATING);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            applyMediaCustomAction();
        }
    }

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    private void applyMediaCustomAction() {
        List<PlaybackStateCompat.CustomAction> customActions = mFactory.createMediaCustomAction();
        if (customActions != null && !customActions.isEmpty()) {
            for (PlaybackStateCompat.CustomAction customAction : customActions) {
                mPlaybackStateBuilder.addCustomAction(customAction);
                mForbidSeekPlaybackStateBuilder.addCustomAction(customAction);
            }
        }
    }

    private void initMediaMetadataBuilder() {
        mMediaMetadataBuilder = new MediaMetadataCompat.Builder();
    }

    private PowerManager.WakeLock createWakeLock() {
        PowerManager pm = (PowerManager) mApplicationContext.getSystemService(Context.POWER_SERVICE);

        PowerManager.WakeLock wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, TAG_WAKE_LOCK);
        wakeLock.setReferenceCounted(false);

        return wakeLock;
    }

    private WifiManager.WifiLock createWifiLock() {
        WifiManager wm = (WifiManager) mApplicationContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);

        WifiManager.WifiLock wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, TAG_WAKE_LOCK);
        wifiLock.setReferenceCounted(false);

        return wifiLock;
    }

    private boolean isWakeLockHeld() {
        return mWakeLock != null && mWakeLock.isHeld();
    }

    private boolean isWifiLockHeld() {
        return mWifiLock != null && mWifiLock.isHeld();
    }

    public void setSleepTimer(SleepTimerImp sleepTimerImp) {
        mSleepTimer = sleepTimerImp;
    }

    @SuppressLint("WakelockTimeout")
    private void requireWakeLock() {
        if (wakeLockPermissionDenied()) {
            Log.w(TAG, "need permission: 'android.permission.WAKE_LOCK'");
            return;
        }

        if (!isWakeLockHeld()) {
            mWakeLock = createWakeLock();
            mWakeLock.acquire();
        }

        if (!isWifiLockHeld()) {
            mWifiLock = createWifiLock();
            mWifiLock.acquire();
        }
    }

    private boolean wakeLockPermissionDenied() {
        return PackageManager.PERMISSION_DENIED ==
                ContextCompat.checkSelfPermission(mApplicationContext, Manifest.permission.WAKE_LOCK);
    }

    private void releaseWakeLock() {
        if (mWakeLock != null && mWakeLock.isHeld()) {
            mWakeLock.release();
        }

        if (mWifiLock != null && mWifiLock.isHeld()) {
            mWifiLock.release();
        }
    }

    private PlaybackStateCompat buildPlaybackState(int state) {
        if (mPlayerState.isForbidSeek()) {
            return mForbidSeekPlaybackStateBuilder.setState(state, mPlayerState.getPlayProgress(), mPlayerState.getSpeed(), mPlayerState.getPlayProgressUpdateTime())
                    .build();
        }

        return mPlaybackStateBuilder.setState(state, mPlayerState.getPlayProgress(), mPlayerState.getSpeed(), mPlayerState.getPlayProgressUpdateTime())
                .build();
    }

    private PlaybackStateCompat buildErrorState(String errorMessage) {
        if (mPlayerState.isForbidSeek()) {
            return mForbidSeekPlaybackStateBuilder.setState(PlaybackStateCompat.STATE_ERROR, mPlayerState.getPlayProgress(), mPlayerState.getSpeed(), mPlayerState.getPlayProgressUpdateTime())
                    .setErrorMessage(PlaybackStateCompat.ERROR_CODE_APP_ERROR, errorMessage)
                    .build();
        }

        return mPlaybackStateBuilder.setState(PlaybackStateCompat.STATE_ERROR, mPlayerState.getPlayProgress(), mPlayerState.getSpeed(), mPlayerState.getPlayProgressUpdateTime())
                .setErrorMessage(PlaybackStateCompat.ERROR_CODE_APP_ERROR, errorMessage)
                .build();
    }

    private MediaMetadataCompat buildMediaMetadata() {
        MusicItem musicItem = getMusicItem();

        if (musicItem != null) {
            return mMediaMetadataBuilder.putString(MediaMetadataCompat.METADATA_KEY_TITLE, musicItem.getTitle())
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, musicItem.getArtist())
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, musicItem.getAlbum())
                    .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON_URI, musicItem.getIconUri())
                    .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, mPlayerState.getDuration())
                    .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, mMusicIcon)
                    .build();
        }

        return new MediaMetadataCompat.Builder().build();
    }

    private void attachListeners(MusicPlayer musicPlayer) {
        musicPlayer.setOnPreparedListener(mPreparedListener);
        musicPlayer.setOnCompletionListener(mCompletionListener);
        musicPlayer.setOnRepeatListener(mRepeatListener);
        musicPlayer.setOnSeekCompleteListener(mSeekCompleteListener);
        musicPlayer.setOnStalledListener(mStalledListener);
        musicPlayer.setOnBufferingUpdateListener(mBufferingUpdateListener);
        musicPlayer.setOnErrorListener(mErrorListener);
    }

    /**
     * 释放当前播放器所持有的 {@link MusicPlayer} 对象（测试用）。
     */
    private void releaseMusicPlayer() {
        cancelRecordProgress();
        if (mMusicPlayer != null) {
            mMusicPlayer.release();
            mMusicPlayer = null;
        }

        mPlayerStateHelper.clearPrepareState();
        mPlayOnPrepared = false;
        mPlayOnSeekComplete = false;

        mPreparedAction = null;
        mSeekCompleteAction = null;

        if (mPlayerState.isStalled()) {
            notifyStalled(false);
        }
    }

    /**
     * 播放器当前是否处已准备完毕。
     *
     * @return 如果播放器已准备完毕，则返回 true，否则返回 false
     */
    public final boolean isPrepared() {
        return mMusicPlayer != null && mPlayerState.isPrepared();
    }

    /**
     * 播放器当前是否处正在准备中。
     *
     * @return 如果播放器正在准备中，则返回 true，否则返回 false
     */
    public final boolean isPreparing() {
        return mPlayerState.isPreparing();
    }

    public boolean isMusicPlayerPlaying() {
        if (isPrepared()) {
            assert mMusicPlayer != null;
            return mMusicPlayer.isPlaying();
        }

        return false;
    }

    private boolean isPlayingState() {
        return getPlaybackState() == PlaybackState.PLAYING;
    }

    /**
     * 获取播放器当前的播放状态。
     *
     * @return 播放器当前的播放状态。
     */
    @NonNull
    public final PlaybackState getPlaybackState() {
        return mPlayerState.getPlaybackState();
    }

    /**
     * 获取播放器的播放模式。
     *
     * @return 播放器的播放模式。
     */
    @NonNull
    public final PlayMode getPlayMode() {
        return mPlayerState.getPlayMode();
    }

    /**
     * 当前播放器是否处于 {@code stalled} 状态。
     *
     * @return 当缓冲区没有足够的数据支持播放器继续播放时，该方法会返回 {@code true}，否则返回 false
     */
    public final boolean isStalled() {
        return mPlayerState.isStalled();
    }

    /**
     * 获取当前正在播放的音乐的 audio session id。
     * <p>
     * 如果当前没有播放任何音乐，或者播放器还没有准备完毕（{@link #isPrepared()} 返回了 false），则该方法会
     * 返回 0。
     *
     * @return 当前正在播放的音乐的 audio session id。
     */
    public final int getAudioSessionId() {
        if (mMusicPlayer != null && isPrepared()) {
            return mMusicPlayer.getAudioSessionId();
        }

        return 0;
    }

    /**
     * 设置播放器状态监听器。
     *
     * @param listener 播放器状态监听器，为 null 时会清除已设置的监听器
     */
    public final void setPlayerStateListener(@Nullable PlayerStateListener listener) {
        mPlayerStateListener = listener;
    }

    private void notifyPreparing() {
        requireWakeLock();
        mPlayerStateHelper.onPreparing();

        mOnStateChangeListener.onPreparing();

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onPreparing();
        }
    }

    private void notifyPrepared(int audioSessionId, int duration) {
        mPlayerStateHelper.onPrepared(audioSessionId, duration);

        mOnStateChangeListener.onPrepared(audioSessionId);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onPrepared(audioSessionId, duration);
        }
    }

    private void notifyPlaying(boolean stalled, int progress, long updateTime) {
        mPlayerStateHelper.onPlay(stalled, progress, updateTime);
        requireWakeLock();

        if (!stalled) {
            mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PLAYING));
        }

        startRecordProgress();

        mBecomeNoiseHelper.registerBecomeNoiseReceiver();

        mOnStateChangeListener.onPlaying(progress, updateTime);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onPlay(stalled, progress, updateTime);
        }
    }

    private void notifyPaused() {
        cancelRecordProgress();
        releaseWakeLock();

        int playProgress = mPlayerState.getPlayProgress();
        long updateTime = mPlayerState.getPlayProgressUpdateTime();

        if (isPrepared()) {
            assert mMusicPlayer != null;
            playProgress = mMusicPlayer.getProgress();
            updateTime = SystemClock.elapsedRealtime();
        }

        mPlayerStateHelper.onPaused(playProgress, updateTime);

        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PAUSED));

        mBecomeNoiseHelper.unregisterBecomeNoiseReceiver();

        mOnStateChangeListener.onPaused();

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onPause(playProgress, updateTime);
        }
    }

    private void notifyStopped() {
        cancelRecordProgress();
        releaseWakeLock();

        mPlayerStateHelper.onStopped();
        mMediaSession.setActive(false);
        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_STOPPED));

        mAudioFocusHelper.abandonAudioFocus();
        mPhoneCallStateHelper.unregisterCallStateListener();
        mBecomeNoiseHelper.unregisterBecomeNoiseReceiver();

        mOnStateChangeListener.onStopped();

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onStop();
        }
    }

    private void notifyStalled(boolean stalled) {
        int playProgress = mPlayerState.getPlayProgress();
        long updateTime = mPlayerState.getPlayProgressUpdateTime();

        if (isMusicPlayerPlaying()) {
            assert mMusicPlayer != null;
            playProgress = mMusicPlayer.getProgress();
            updateTime = SystemClock.elapsedRealtime();
        }

        mPlayerStateHelper.onStalled(stalled, playProgress, updateTime);
        updateMediaSessionPlaybackState(stalled);
        mOnStateChangeListener.onStalledChanged(stalled);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onStalledChanged(stalled, playProgress, updateTime);
        }
    }

    private void notifyRepeat(long repeatTime) {
        mPlayerStateHelper.onRepeat(repeatTime);
        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PLAYING));

        MusicItem musicItem = getMusicItem();
        if (mPlayerStateListener != null && musicItem != null) {
            mPlayerStateListener.onRepeat(musicItem, repeatTime);
        }
    }

    private void updateMediaSessionPlaybackState(boolean stalled) {
        if (stalled) {
            cancelRecordProgress();
            mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_BUFFERING));
            return;
        }

        if (mPlayOnPrepared || mPlayOnSeekComplete) {
            return;
        }

        switch (getPlaybackState()) {
            case PLAYING:
                startRecordProgress();
                mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PLAYING));
                break;
            case PAUSED:
                mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PAUSED));
                break;
        }
    }

    private void notifyError(int errorCode, String errorMessage) {
        releaseMusicPlayer();
        releaseWakeLock();

        mPlayerStateHelper.onError(errorCode, errorMessage);
        mMediaSession.setPlaybackState(buildErrorState(errorMessage));

        mAudioFocusHelper.abandonAudioFocus();
        mPhoneCallStateHelper.unregisterCallStateListener();
        mBecomeNoiseHelper.unregisterBecomeNoiseReceiver();

        mOnStateChangeListener.onError(errorCode, errorMessage);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onError(errorCode, errorMessage);
        }
    }

    private int getMusicItemDuration() {
        return mPlayerState.getDuration();
    }

    private void notifyBufferedChanged(int buffered, boolean isPercent) {
        int bufferedProgress = buffered;

        if (isPercent) {
            bufferedProgress = (int) ((buffered / 100.0) * getMusicItemDuration());
        }

        mPlayerStateHelper.onBufferedChanged(bufferedProgress);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onBufferedProgressChanged(bufferedProgress);
        }
    }

    private void notifyPlayingMusicItemChanged(@Nullable MusicItem musicItem, final int position, final boolean play) {
        disposePrepareMusicItem();
        releaseMusicPlayer();

        if (musicItem == null) {
            onPlayingMusicItemChanged(null, position, false);
            return;
        }

        prepareMusicItemAsync(musicItem)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new SingleObserver<MusicItem>() {
                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        mPrepareMusicItemDisposable = d;
                    }

                    @Override
                    public void onSuccess(@NonNull MusicItem musicItem) {
                        onPlayingMusicItemChanged(musicItem, position, play);
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        notifyError(ErrorCode.PREPARE_MUSIC_ITEM_ERROR, ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.PREPARE_MUSIC_ITEM_ERROR));
                    }
                });
    }

    private Single<MusicItem> prepareMusicItemAsync(@NonNull final MusicItem musicItem) {
        return Single.create(new SingleOnSubscribe<MusicItem>() {
            @Override
            public void subscribe(@NonNull final SingleEmitter<MusicItem> emitter) {
                mCallback.prepareMusicItem(musicItem, mPlayerConfig.getSoundQuality(), new AsyncResult<MusicItem>() {
                    @Override
                    public void onSuccess(@NonNull MusicItem item) {
                        emitter.onSuccess(item);
                    }

                    @Override
                    public void onError(@NonNull Throwable throwable) {
                        emitter.onError(throwable);
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
        });
    }

    private void disposePrepareMusicItem() {
        if (mPrepareMusicItemDisposable != null && !mPrepareMusicItemDisposable.isDisposed()) {
            mPrepareMusicItemDisposable.dispose();
        }
    }

    private void onPlayingMusicItemChanged(@Nullable MusicItem musicItem, int position, boolean play) {
        mPlayerStateHelper.onPlayingMusicItemChanged(musicItem, position, 0);

        if (musicItem == null) {
            mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_NONE));
        }
        mMediaSession.setMetadata(buildMediaMetadata());

        mOnStateChangeListener.onPlayingMusicItemChanged(musicItem);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onPlayingMusicItemChanged(musicItem, position, mPlayerState.getPlayProgress());
        }

        notifyBufferedChanged(0, false);

        if (play) {
            play();
        } else {
            stop();
        }
    }

    private void notifySeekComplete(int playProgress, long updateTime, boolean stalled) {
        mPlayerStateHelper.onSeekComplete(playProgress, updateTime, stalled);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onSeekComplete(playProgress, updateTime, stalled);
        }

        if (stalled || mPlayOnSeekComplete) {
            return;
        }

        if (isMusicPlayerPlaying()) {
            mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_PLAYING));
        } else {
            notifyPaused();
        }
    }

    @Override
    public void play() {
        if (!mInitialized) {
            Log.i(TAG, "play: player not initialized");
            return;
        }

        if (getMusicItem() == null || isMusicPlayerPlaying()) {
            return;
        }

        if (isPreparing()) {
            mPreparedAction = new Runnable() {
                @Override
                public void run() {
                    play();
                }
            };
            return;
        }

        if (requestAudioFocusFailed()) {
            return;
        }

        mMediaSession.setActive(true);
        if (isPrepared()) {
            assert mMusicPlayer != null;

            mMusicPlayer.start();
            mMusicPlayer.setSpeed(mPlayerState.getSpeed());
            mMusicPlayer.setVolume(mPlayerState.getVolume());

            notifyPlaying(mMusicPlayer.isStalled(), mMusicPlayer.getProgress(), SystemClock.elapsedRealtime());
            return;
        }

        prepareMusicPlayer(true, null);
    }

    @Override
    public void pause() {
        if (!mInitialized) {
            Log.i(TAG, "pause: player not initialized");
            return;
        }

        mResumePlay = false;

        if (isPreparing()) {
            mPlayOnPrepared = false;
            mPlayOnSeekComplete = false;
            return;
        }

        if (!isPlayingState()) {
            return;
        }

        if (mMusicPlayer != null && mMusicPlayer.isPlaying()) {
            mMusicPlayer.pause();
        }

        notifyPaused();
    }

    @Override
    public void stop() {
        if (!mInitialized) {
            Log.i(TAG, "stop: player not initialized");
            return;
        }

        if (getPlaybackState() == PlaybackState.STOPPED) {
            return;
        }

        if (isPrepared()) {
            assert mMusicPlayer != null;
            mMusicPlayer.stop();
        }

        releaseMusicPlayer();
        notifyStopped();
    }

    @Override
    public void playPause() {
        if (!mInitialized) {
            Log.i(TAG, "playPause: player not initialized");
            return;
        }

        if (isPreparing() && mPlayOnPrepared) {
            pause();
            return;
        }

        if (isPlayingState()) {
            pause();
        } else {
            play();
        }
    }

    private void seekTo(final int progress, final Runnable seekCompleteAction) {
        if (mPlayerState.isForbidSeek()) {
            return;
        }

        if (isPreparing()) {
            mPlayOnSeekComplete = mPlayOnPrepared;
            mPlayOnPrepared = false;
            mPreparedAction = new Runnable() {
                @Override
                public void run() {
                    seekTo(progress, seekCompleteAction);
                }
            };
            return;
        }

        if (isPrepared()) {
            assert mMusicPlayer != null;
            mSeekCompleteAction = seekCompleteAction;
            mMusicPlayer.seekTo(progress);
            return;
        }

        if (getMusicItem() != null) {
            notifySeekComplete(Math.min(progress, getMusicItemDuration()), SystemClock.elapsedRealtime(), false);
        }
    }

    @Override
    public void seekTo(final int progress) {
        if (!mInitialized) {
            Log.i(TAG, "seekTo: player not initialized");
            return;
        }

        seekTo(progress, null);
    }

    @Override
    public void fastForward() {
        if (!mInitialized) {
            Log.i(TAG, "fastForward: player not initialized");
            return;
        }

        if (mPlayerState.isForbidSeek()) {
            return;
        }

        if (isPreparing()) {
            mPreparedAction = new Runnable() {
                @Override
                public void run() {
                    fastForward();
                }
            };
            return;
        }

        int progress = Math.min(mPlayerState.getDuration(), mPlayerState.getPlayProgress() + FORWARD_STEP);
        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_FAST_FORWARDING));
        seekTo(progress);
    }

    @Override
    public void rewind() {
        if (!mInitialized) {
            Log.i(TAG, "rewind: player not initialized");
            return;
        }

        if (mPlayerState.isForbidSeek()) {
            return;
        }

        if (isPreparing()) {
            mPreparedAction = new Runnable() {
                @Override
                public void run() {
                    rewind();
                }
            };
            return;
        }

        int progress = Math.min(mPlayerState.getDuration(), mPlayerState.getPlayProgress() - FORWARD_STEP);
        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_REWINDING));
        seekTo(progress);
    }

    /**
     * 通知播放器当前的 {@link SoundQuality} 已改变。
     * <p>
     * 该方法应该在调用与当前播放器管理的 {@link PlayerConfig} 对象的
     * {@link PlayerConfig#setSoundQuality(SoundQuality)} 方法后调用。
     */
    public final void notifySoundQualityChanged() {
        if (isPrepared()) {
            assert mMusicPlayer != null;
            boolean playing = mMusicPlayer.isPlaying();
            final int position = mMusicPlayer.getProgress();

            releaseMusicPlayer();
            prepareMusicPlayer(playing, new Runnable() {
                @Override
                public void run() {
                    if (position > 0) {
                        seekTo(position);
                    }
                }
            });
        }
    }

    /**
     * 通知播放器当前的 {@code audioEffectEnabled} 状态已改变。
     * <p>
     * 该方法应该在调用与当前播放器管理的 {@link PlayerConfig} 对象的
     * {@link PlayerConfig#setAudioEffectEnabled(boolean)} 方法后调用。
     */
    public final void notifyAudioEffectEnableChanged() {
        if (!isPrepared() || mAudioEffectManager == null) {
            return;
        }

        if (mPlayerConfig.isAudioEffectEnabled()) {
            attachAudioEffect(mAudioEffectManager);
            return;
        }

        mAudioEffectManager.detachAudioEffect();
    }

    private void attachAudioEffect(AudioEffectManager audioEffectManager) {
        int audioSessionId = getAudioSessionId();
        if (audioSessionId < 1) {
            return;
        }

        audioEffectManager.attachAudioEffect(audioSessionId);
    }

    /**
     * 通知播放器当前的 {@code onlyWifiNetwork} 状态已改变。
     * <p>
     * 该方法应该在调用与当前播放器管理的 {@link PlayerConfig} 对象的
     * {@link PlayerConfig#setOnlyWifiNetwork(boolean)} 方法后调用。
     */
    public final void notifyOnlyWifiNetworkChanged() {
        if (!isPrepared()) {
            return;
        }

        checkNetworkType(mPlayerConfig.isOnlyWifiNetwork(), mNetworkHelper.isWifiNetwork());
    }

    public void notifyIgnoreAudioFocusChanged() {
        if (requestAudioFocusFailed() && (isPlayingState() || mPlayOnPrepared)) {
            pause();
        }
    }

    private boolean requestAudioFocusFailed() {
        if (mPlayerConfig.isIgnoreAudioFocus()) {
            mAudioFocusHelper.abandonAudioFocus();
            mPhoneCallStateHelper.registerCallStateListener();
            return !mPhoneCallStateHelper.isCallIDLE();
        }

        return AudioManager.AUDIOFOCUS_REQUEST_FAILED ==
                mAudioFocusHelper.requestAudioFocus(AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
    }

    private void checkNetworkType(boolean onlyWifiNetwork, boolean isWifiNetwork) {
        disposeCheckCached();

        if (!mNetworkHelper.networkAvailable()) {
            return;
        }

        mCheckCachedDisposable = playingMusicIsCached()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(checkNetworkTypeConsumer(onlyWifiNetwork, isWifiNetwork));
    }

    private void disposeCheckCached() {
        if (mCheckCachedDisposable != null) {
            mCheckCachedDisposable.dispose();
            mCheckCachedDisposable = null;
        }
    }

    private Single<Boolean> playingMusicIsCached() {
        return Single.create(new SingleOnSubscribe<Boolean>() {
            @Override
            public void subscribe(@NonNull final SingleEmitter<Boolean> emitter) {
                MusicItem musicItem = getMusicItem();
                if (musicItem == null) {
                    emitter.onSuccess(false);
                    return;
                }

                mCallback.isCached(musicItem, mPlayerConfig.getSoundQuality(), new AsyncResult<Boolean>() {
                    @Override
                    public void onSuccess(@NonNull Boolean aBoolean) {
                        emitter.onSuccess(aBoolean);
                    }

                    @Override
                    public void onError(@NonNull Throwable throwable) {
                        Log.w(TAG, throwable);
                        emitter.onSuccess(false);
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
        });
    }

    private Consumer<Boolean> checkNetworkTypeConsumer(final boolean onlyWifiNetwork, final boolean isWifiNetwork) {
        return new Consumer<Boolean>() {
            @Override
            public void accept(Boolean cached) {
                if (onlyWifiNetwork && !isWifiNetwork && !cached) {
                    pause();
                    releaseMusicPlayer();
                    notifyError(ErrorCode.ONLY_WIFI_NETWORK,
                            ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.ONLY_WIFI_NETWORK));
                }
            }
        };
    }

    private void loadPlaylist() {
        mPlaylistManager.getPlaylist(new PlaylistManager.Callback() {
            @Override
            public void onFinished(@NonNull final Playlist playlist) {
                if (mReleased) {
                    return;
                }

                correctPlayPosition(playlist);

                mPlaylist = playlist;

                if (!mInitialized) {
                    mInitialized = true;
                    notifyInitialized();
                }
            }
        });
    }

    /**
     * 修正播放位置。
     * <p>
     * 当播放位置超出 Playlist 的索引范围时将播放位置设置为 0，以避免 IndexOutOfBoundsException 异常。
     */
    private void correctPlayPosition(Playlist playlist) {
        int position = mPlayerState.getPlayPosition();
        if (position < 0 || position >= playlist.size()) {
            mPlayerState.setPlayPosition(0);
        }
    }

    private void notifyInitialized() {
        if (mPlaylist.isEmpty()) {
            mOnInitializedListener.onInitialized();
            return;
        }

        prepareMusicItemAsync(mPlaylist.get(mPlayerState.getPlayPosition()))
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new SingleObserver<MusicItem>() {
                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        mPrepareMusicItemDisposable = d;
                    }

                    @Override
                    public void onSuccess(@NonNull MusicItem musicItem) {
                        mPlayerState.setMusicItem(musicItem);
                        mOnInitializedListener.onInitialized();
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        notifyError(ErrorCode.PREPARE_MUSIC_ITEM_ERROR, ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.PREPARE_MUSIC_ITEM_ERROR));
                    }
                });
    }

    private int getRandomPosition(int exclude) {
        if (mPlaylist == null || getPlaylistSize() < 2) {
            return 0;
        }

        if (mRandom == null) {
            mRandom = new Random();
        }

        int position = mRandom.nextInt(getPlaylistSize());

        if (position != exclude) {
            return position;
        }

        return getRandomPosition(exclude);
    }

    private void notifyPlayModeChanged(PlayMode playMode) {
        mPlayerStateHelper.onPlayModeChanged(playMode);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onPlayModeChanged(playMode);
        }

        mOnStateChangeListener.onPlayModeChanged(playMode);
    }

    private void notifySpeedChanged(float speed, int progress, long updateTime) {
        mPlayerStateHelper.onSpeedChanged(speed, progress, updateTime);

        mMediaSession.setPlaybackState(buildPlaybackState(mMediaSession.getController().getPlaybackState().getState()));

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onSpeedChanged(speed, progress, updateTime);
        }
    }

    private void notifyPlaylistChanged(int position) {
        mPlayerStateHelper.onPlaylistChanged(position);

        if (mPlayerStateListener != null) {
            // 注意！playlistManager 参数为 null，客户端接收到该事件后，应该将其替换为自己的 PlaylistManager 对象
            mPlayerStateListener.onPlaylistChanged(null, position);
        }
    }

    private void notifyVolumeChanged(float volume) {
        mPlayerStateHelper.onVolumeChanged(volume);

        if (mPlayerStateListener != null) {
            mPlayerStateListener.onVolumeChanged(volume);
        }
    }

    /**
     * 获取播放列表的大小。
     *
     * @return 播放列表的大小
     */
    protected final int getPlaylistSize() {
        return mPlaylistManager.getPlaylistSize();
    }

    /**
     * 获取播放列表携带的额外参数。
     *
     * @return 播放列表携带的额外参数，可能为 null
     */
    @Nullable
    public final Bundle getPlaylistExtra() {
        if (mPlaylist == null) {
            return null;
        }

        return mPlaylist.getExtra();
    }

    private boolean isLooping() {
        return mPlayerState.getPlayMode() == PlayMode.LOOP;
    }

    @Override
    public void skipToNext() {
        if (!mInitialized) {
            Log.i(TAG, "skipToNext: player not initialized");
            return;
        }

        if (getPlaylistSize() < 1) {
            return;
        }

        int position = getNextPosition(mPlayerState.getPlayPosition());

        notifyPlayingMusicItemChanged(mPlaylist.get(position), position, true);
        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_SKIPPING_TO_NEXT));
    }

    @Override
    public void skipToPosition(int position) {
        if (!mInitialized) {
            Log.i(TAG, "skipToPosition: player not initialized");
            return;
        }

        if (position == mPlayerState.getPlayPosition()) {
            return;
        }

        playPause(position);
    }

    private int getNextPosition(int currentPosition) {
        PlayMode playMode = mPlayerState.getPlayMode();
        if (mConfirmNextPlay || playMode == PlayMode.PLAYLIST_LOOP || playMode == PlayMode.LOOP || playMode == PlayMode.SINGLE_ONCE) {
            mConfirmNextPlay = false;
            int position = currentPosition + 1;
            if (position >= getPlaylistSize()) {
                return 0;
            }
            return position;
        }

        return getRandomPosition(currentPosition);
    }

    @Override
    public void skipToPrevious() {
        if (!mInitialized) {
            Log.i(TAG, "skipToPrevious: player not initialized");
            return;
        }

        if (getPlaylistSize() < 1) {
            return;
        }

        int position = getPreviousPosition(mPlayerState.getPlayPosition());

        notifyPlayingMusicItemChanged(mPlaylist.get(position), position, true);
        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_SKIPPING_TO_PREVIOUS));
    }

    private int getPreviousPosition(int currentPosition) {
        int position = 0;

        switch (mPlayerState.getPlayMode()) {
            case PLAYLIST_LOOP:     // 注意！case 穿透
            case SINGLE_ONCE:       // 注意！case 穿透
            case LOOP:
                position = currentPosition - 1;
                if (position < 0) {
                    return getPlaylistSize() - 1;
                }
                break;
            case SHUFFLE:
                position = getRandomPosition(currentPosition);
                break;
        }

        return position;
    }

    @Override
    public void playPause(final int position) {
        if (!mInitialized) {
            Log.i(TAG, "playPause: player not initialized");
            return;
        }

        if (position < 0 || position >= mPlaylist.size()) {
            notifyError(ErrorCode.PLAY_POSITION_OUT_OF_BOUNDS, ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.PLAY_POSITION_OUT_OF_BOUNDS));
            return;
        }

        if (position == mPlayerState.getPlayPosition()) {
            playPause();
            return;
        }

        mMediaSession.setPlaybackState(buildPlaybackState(PlaybackStateCompat.STATE_SKIPPING_TO_QUEUE_ITEM));
        notifyPlayingMusicItemChanged(mPlaylist.get(position), position, true);
    }

    @Override
    public void setPlayMode(@NonNull PlayMode playMode) {
        if (!mInitialized) {
            Log.i(TAG, "setPlayMode: player not initialized");
            return;
        }

        Preconditions.checkNotNull(playMode);
        if (playMode == mPlayerState.getPlayMode()) {
            return;
        }

        if (isPrepared()) {
            assert mMusicPlayer != null;
            mMusicPlayer.setLooping(playMode == PlayMode.LOOP);
        }

        notifyPlayModeChanged(playMode);
    }

    @Override
    public void setSpeed(float speed) {
        if (!mInitialized) {
            Log.i(TAG, "setSpeed: player not initialized");
            return;
        }

        if (speed < 0.1F) {
            speed = 0.1F;
        }

        if (speed > 10.0F) {
            speed = 10.0F;
        }

        if (speed == mPlayerState.getSpeed()) {
            return;
        }

        if (isPrepared()) {
            assert mMusicPlayer != null;
            mMusicPlayer.setSpeed(speed);
            notifySpeedChanged(speed, mMusicPlayer.getProgress(), SystemClock.elapsedRealtime());
            return;
        }

        notifySpeedChanged(speed, mPlayerState.getPlayProgress(), SystemClock.elapsedRealtime());
    }

    @Override
    public void setVolume(float volume) {
        if (!mInitialized) {
            Log.i(TAG, "setVolume: player not initialized");
            return;
        }

        if (volume == mPlayerState.getVolume()) {
            return;
        }

        if (isPrepared()) {
            assert mMusicPlayer != null;
            mMusicPlayer.setVolume(volume);
        }

        notifyVolumeChanged(volume);
    }

    @Override
    public void setPlaylist(Playlist playlist, final int position, final boolean play) {
        if (!mInitialized) {
            Log.i(TAG, "setPlaylist: player not initialized");
            return;
        }

        if (position < 0 || position >= playlist.size()) {
            notifyError(ErrorCode.PLAY_POSITION_OUT_OF_BOUNDS, ErrorCode.getErrorMessage(mApplicationContext, ErrorCode.PLAY_POSITION_OUT_OF_BOUNDS));
            return;
        }

        final MusicItem musicItem = playlist.get(position);
        updatePlaylist(playlist, playlist.getAllMusicItem(), new Runnable() {
            @Override
            public void run() {
                notifyPlaylistChanged(position);
                notifyPlayingMusicItemChanged(musicItem, position, play);
            }
        });
    }

    private void updatePlayPosition(int fromPosition, int toPosition) {
        int playPosition = mPlayerState.getPlayPosition();
        if (notInRegion(playPosition, fromPosition, toPosition)) {
            notifyPlaylistChanged(playPosition);
            return;
        }

        if (fromPosition < playPosition) {
            playPosition -= 1;
        } else if (fromPosition == playPosition) {
            playPosition = toPosition;
        } else {
            playPosition += 1;
        }

        mPlayerState.setPlayPosition(playPosition);
    }

    private void onMusicItemInserted(int position) {
        int playPosition = mPlayerState.getPlayPosition();

        if (position <= playPosition) {
            playPosition += 1;
        }

        mPlayerState.setPlayPosition(playPosition);
    }

    private void onMusicItemRemoved(int removePosition, int playPosition) {
        if (removePosition < playPosition) {
            playPosition -= 1;
        } else if (removePosition == playPosition) {
            playPosition = getNextPosition(playPosition - 1);
        }

        mPlayerState.setPlayPosition(playPosition);
    }

    private boolean notInRegion(int position, int fromPosition, int toPosition) {
        return position > Math.max(fromPosition, toPosition) || position < Math.min(fromPosition, toPosition);
    }

    private void startRecordProgress() {
        cancelRecordProgress();

        if (mPlayerState.isForbidSeek()) {
            return;
        }

        mRecordProgressDisposable = Observable.interval(0, 1, TimeUnit.SECONDS, Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<Long>() {
                    @Override
                    public void accept(Long aLong) {
                        if (isPrepared()) {
                            assert mMusicPlayer != null;
                            mPlayerStateHelper.updatePlayProgress(mMusicPlayer.getProgress(), SystemClock.elapsedRealtime());
                        }
                    }
                });
    }

    private void cancelRecordProgress() {
        if (mRecordProgressDisposable == null || mRecordProgressDisposable.isDisposed()) {
            return;
        }

        mRecordProgressDisposable.dispose();
    }

    @Override
    public void updateMusicItem(@NonNull MusicItem oldItem, @NonNull MusicItem newItem) {
        if (!mInitialized) {
            Log.i(TAG, "updateMusicItem: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }
        List<MusicItem> musicItems = mPlaylist.getAllMusicItem();
        int index = -1;
        for (MusicItem musicItem : musicItems) {
            if (musicItem.getMusicId().equals(oldItem.getMusicId())) {
                index = musicItems.indexOf(musicItem);
                break;
            }
        }
        if (index > -1) {
            MusicItem positionItem = musicItems.get(index);
            positionItem.setAutoDuration(newItem.isAutoDuration());
            positionItem.setMusicId(newItem.getMusicId());
            positionItem.setTitle(newItem.getTitle());
            positionItem.setArtist(newItem.getArtist());
            positionItem.setAlbum(newItem.getAlbum());
            positionItem.setUri(newItem.getUri());
            positionItem.setIconUri(newItem.getIconUri());
            positionItem.setDuration(newItem.getDuration());
            positionItem.setForbidSeek(newItem.isForbidSeek());
            positionItem.setExtra(newItem.getExtra());
            updatePlaylist(mPlaylist, musicItems, new Runnable() {
                @Override
                public void run() {
                    notifyPlaylistChanged(mPlayerState.getPlayPosition());
                }
            });
            return;
        }
    }

    @Override
    public void insertMusicItem(final int position, @NonNull final MusicItem musicItem) {
        if (!mInitialized) {
            Log.i(TAG, "insertMusicItem: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }

        List<MusicItem> musicItems = mPlaylist.getAllMusicItem();
        int index = musicItems.indexOf(musicItem);
        if (index > -1) {
            if (index < mPlayerState.getPlayPosition()) {
                moveMusicItem(index, Math.min(position - 1, getPlaylistSize() - 1));
            } else {
                moveMusicItem(index, Math.min(position, getPlaylistSize() - 1));
            }
            return;
        }

        musicItems.add(position, musicItem);

        onMusicItemInserted(position);
        updatePlaylist(mPlaylist, musicItems, new Runnable() {
            @Override
            public void run() {
                notifyPlaylistChanged(mPlayerState.getPlayPosition());
            }
        });
    }

    @Override
    public void appendMusicItem(@NonNull MusicItem musicItem) {
        if (!mInitialized) {
            Log.i(TAG, "appendMusicItem: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }

        insertMusicItem(getPlaylistSize(), musicItem);
    }

    @Override
    public void moveMusicItem(final int fromPosition, final int toPosition) {
        if (!mInitialized) {
            Log.i(TAG, "moveMusicItem: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }

        if (fromPosition == toPosition) {
            return;
        }

        int size = mPlaylist.size();
        if (fromPosition < 0 || fromPosition >= size) {
            throw new IndexOutOfBoundsException("fromPosition: " + fromPosition + ", size: " + size);
        }

        if (toPosition < 0 || toPosition >= size) {
            throw new IndexOutOfBoundsException("toPosition: " + toPosition + ", size: " + size);
        }

        List<MusicItem> musicItems = mPlaylist.getAllMusicItem();

        musicItems.add(toPosition, musicItems.remove(fromPosition));
        updatePlayPosition(fromPosition, toPosition);

        updatePlaylist(mPlaylist, musicItems, new Runnable() {
            @Override
            public void run() {
                notifyPlaylistChanged(mPlayerState.getPlayPosition());
            }
        });
    }

    @Override
    public void removeMusicItem(@NonNull final MusicItem musicItem) {
        if (!mInitialized) {
            Log.i(TAG, "removeMusicItem: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }

        List<MusicItem> musicItems = mPlaylist.getAllMusicItem();
        if (!musicItems.contains(musicItem)) {
            return;
        }

        final int index = musicItems.indexOf(musicItem);
        final int oldPlayPosition = mPlayerState.getPlayPosition();

        musicItems.remove(musicItem);

        onMusicItemRemoved(index, oldPlayPosition);
        updatePlaylist(mPlaylist, musicItems, new Runnable() {
            @Override
            public void run() {
                int playPosition = mPlayerState.getPlayPosition();
                notifyPlaylistChanged(playPosition);

                if (mPlaylist.isEmpty()) {
                    notifyPlayingMusicItemChanged(null, playPosition, false);
                    notifyStopped();
                    return;
                }

                if (index == oldPlayPosition) {
                    playPosition = playPosition < mPlaylist.size() ? playPosition : 0;
                    notifyPlayingMusicItemChanged(mPlaylist.get(playPosition), playPosition, isMusicPlayerPlaying());
                }
            }
        });
    }

    @Override
    public void removeMusicItem(final int position) {
        if (!mInitialized) {
            Log.i(TAG, "removeMusicItem: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }

        if (position < 0 || position >= mPlaylist.size()) {
            return;
        }

        removeMusicItem(mPlaylist.get(position));
    }

    @Override
    public void setNextPlay(@NonNull final MusicItem musicItem) {
        if (!mInitialized) {
            Log.i(TAG, "setNextPlay: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }

        if (musicItem.equals(getMusicItem())) {
            return;
        }

        insertMusicItem(mPlayerState.getPlayPosition() + 1, musicItem);
        mConfirmNextPlay = true;
    }
    public void save() {
        if (!mInitialized) {
            Log.i(TAG, "save: player not initialized");
            return;
        }

        if (!mPlaylistManager.isPlaylistEditable()) {
            return;
        }

        mPlaylistManager.save(mPlaylist, null);
    }

    private void updatePlaylist(Playlist playlist, List<MusicItem> musicItems, Runnable doOnSaved) {
        mPlaylist = new Playlist.Builder()
                .setName(playlist.getName())
                .appendAll(musicItems)
                .setEditable(playlist.isEditable())
                .setExtra(playlist.getExtra())
                .build();
        mPlaylistManager.save(mPlaylist, doOnSaved);
    }

    interface OnStateChangeListener {
        /**
         * 该方法会在开始准备音乐播放器时调用。
         */
        void onPreparing();

        /**
         * 该方法会在音乐播放器准备完毕后调用。
         *
         * @param audioSessionId 当前正准备播放的音乐的 audio session id。
         */
        void onPrepared(int audioSessionId);

        /**
         * 该方法会在开始播放时调用。
         *
         * @param progress   当前的播放进度。
         * @param updateTime 播放进度的更新时间。
         */
        void onPlaying(int progress, long updateTime);

        /**
         * 该方法会在暂停播放时调用。
         */
        void onPaused();

        /**
         * 该方法会在 stalled 状态改变时调用。
         * <p>
         * 你可以根据 stalled 参数的值来显示或隐藏缓冲进度条。如果缓冲区没有足够的数据支撑继续播放时，则该参数为
         * true，当缓冲区缓存了足够的数据可以继续播放时，该参数为 false。
         *
         * @param stalled 如果缓冲区没有足够的数据继续播放时，则该参数为 true，当缓冲区缓存了足够的数据可以继续
         *                播放时，该参数为 false。
         */
        void onStalledChanged(boolean stalled);

        /**
         * 该方法会在停止播放时调用。
         */
        void onStopped();

        /**
         * 该方法会在错误发生时调用。
         *
         * @param errorCode    错误码
         * @param errorMessage 错误信息
         * @see ErrorCode
         */
        void onError(int errorCode, String errorMessage);

        /**
         * 该方法会在当前播放的 MusicItem 对象改变时调用。
         *
         * @param musicItem 本次要播放的 MusicItem 对象（可能为 null）。
         */
        void onPlayingMusicItemChanged(@Nullable MusicItem musicItem);

        /**
         * 该方法会在播放器的播放模式发生改变时调用。
         *
         * @param playMode 播放器当前的播放模式。
         */
        void onPlayModeChanged(@NonNull PlayMode playMode);
    }

    /**
     * 监听 {@link SnowPlayer} 的初始化状态。
     */
    interface OnInitializedListener {
        /**
         * 该方法会在 {@link SnowPlayer} 初始化完毕后调用。
         */
        void onInitialized();
    }

    interface Factory {
        /**
         * 该方法会在创建 MusicPlayer 对象时调用。
         * <p>
         * 你可以重写该方法来返回你自己的 MusicPlayer 实现。
         */
        MusicPlayer createMusicPlayer(@NonNull Context context, @NonNull MusicItem musicItem, @NonNull Uri uri);

        /**
         * 可以通过覆盖该方法来提供一个自定义的 AudioManager.OnAudioFocusChangeListener
         *
         * @return 如果返回 null，则会使用默认的音频焦点监听器。
         */
        AudioManager.OnAudioFocusChangeListener createAudioFocusChangeListener();

        /**
         * 创建 {@link PlaybackStateCompat.CustomAction} 自定义动作。
         *
         * @return 返回创建的自定义动作，入门不需要创建任何自定义动作，则返回 null。
         */
        @RequiresApi(Build.VERSION_CODES.TIRAMISU)
        @Nullable
        List<PlaybackStateCompat.CustomAction> createMediaCustomAction();
    }

    interface Callback {
        /**
         * 查询具有 soundQuality 音质的 MusicItem 表示的的音乐是否已被缓存。
         * <p>
         * 该方法会在异步线程中被调用。
         *
         * @param musicItem    要查询的 MusicItem 对象
         * @param soundQuality 音乐的音质
         * @param result       用于接收异步任务的结果值
         */
        void isCached(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality, @NonNull AsyncResult<Boolean> result);

        /**
         * 准备 {@link MusicItem} 对象。
         * <p>
         * 该方法会在歌曲即将播放前调用，你可以在该方法中对 {@link MusicItem} 对象进行修正。
         * 例如，从服务器获取歌曲的播放时长、播放链接，并将这些数据重新设置给 {@link MusicItem} 对象即可。
         * <p>
         * 该方法会在异步线程中执行，因此可以执行各种耗时操作，例如访问网络。
         *
         * @param musicItem    即将播放的 {@link MusicItem} 对象，不为 null。
         * @param soundQuality 即将播放的音乐的音质
         * @param result       用于接收修正后的 {@link MusicItem} 对象，不为 null。
         */
        void prepareMusicItem(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality, @NonNull AsyncResult<MusicItem> result);

        /**
         * 获取音乐的播放链接。
         * <p>
         * 该方法会在异步线程中执行，因此可以执行各种耗时操作，例如访问网络。
         *
         * @param musicItem    要播放的音乐
         * @param soundQuality 要播放的音乐的音质
         * @param result       用于接收异步任务的结果
         */
        void retrieveMusicItemUri(@NonNull MusicItem musicItem, @NonNull SoundQuality soundQuality, @NonNull AsyncResult<Uri> result);
    }
}
