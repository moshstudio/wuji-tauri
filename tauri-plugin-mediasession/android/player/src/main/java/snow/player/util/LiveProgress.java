package snow.player.util;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleObserver;
import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.OnLifecycleEvent;

import com.google.common.base.Preconditions;

import snow.player.PlaybackState;
import snow.player.Player;
import snow.player.PlayerClient;
import snow.player.audio.MusicItem;

/**
 * 用于监听播放器的实时播放进度。
 */
public class LiveProgress {
    private final PlayerClient mPlayerClient;
    private final OnUpdateListener mOnUpdateListener;

    @Nullable
    private LifecycleOwner mLifecycleOwner;
    private LifecycleObserver mLifecycleObserver;

    private final ProgressClock mProgressClock;

    private Player.OnPlayingMusicItemChangeListener mOnPlayingMusicItemChangeListener;
    private Player.OnPrepareListener mOnPrepareListener;
    private PlayerClient.OnPlaybackStateChangeListener mOnPlaybackStateChangeListener;
    private Player.OnSeekCompleteListener mOnSeekCompleteListener;
    private Player.OnStalledChangeListener mOnStalledChangeListener;
    private PlayerClient.OnConnectStateChangeListener mOnConnectStateChangeListener;
    private Player.OnRepeatListener mOnRepeatListener;
    private Player.OnSpeedChangeListener mSpeedChangeListener;

    /**
     * 创建一个 {@link LiveProgress} 对象。
     *
     * @param playerClient {@link PlayerClient} 对象，不能为 null
     * @param listener     {@link OnUpdateListener} 监听器，用于监听实时播放进度,不能为 null
     */
    public LiveProgress(@NonNull PlayerClient playerClient, @NonNull OnUpdateListener listener) {
        this(playerClient, listener, false);
    }

    /**
     * 创建一个 {@link LiveProgress} 对象。
     *
     * @param playerClient {@link PlayerClient} 对象，不能为 null
     * @param listener     {@link OnUpdateListener} 监听器，用于监听实时播放进度,不能为 null
     * @param countDown    是否是倒计时的实时播放进度。如果你需要倒计时的实时播放进度，则可以将该参数设为 true（默认为 false）
     */
    public LiveProgress(@NonNull PlayerClient playerClient,
                        @NonNull OnUpdateListener listener,
                        boolean countDown) {
        Preconditions.checkNotNull(playerClient);
        Preconditions.checkNotNull(listener);

        mPlayerClient = playerClient;
        mOnUpdateListener = listener;

        mProgressClock = new ProgressClock(countDown, new ProgressClock.Callback() {
            @Override
            public void onUpdateProgress(int progressSec, int durationSec) {
                updateLiveProgress(progressSec, durationSec);
            }
        });

        initAllListener();
    }

    private void initAllListener() {
        mOnPlayingMusicItemChangeListener = new Player.OnPlayingMusicItemChangeListener() {
            @Override
            public void onPlayingMusicItemChanged(@Nullable MusicItem musicItem, int position, int playProgress) {
                mProgressClock.cancel();

                if (musicItem == null) {
                    updateLiveProgress(0, 0);
                    return;
                }

                updateLiveProgress(playProgress / 1000, getDurationSec());
            }
        };

        mOnPrepareListener = new Player.OnPrepareListener2() {
            @Override
            public void onPreparing() {
                // ignore
            }

            @Override
            public void onPrepared(int audioSessionId) {
                // ignore
            }

            @Override
            public void onPrepared(int audioSessionId, int duration) {
                MusicItem musicItem = mPlayerClient.getPlayingMusicItem();
                assert musicItem != null;

                if (musicItem.isAutoDuration()) {
                    updateLiveProgress(mPlayerClient.getPlayProgress() / 1000, getDurationSec());
                }
            }
        };

        mOnPlaybackStateChangeListener = new PlayerClient.OnPlaybackStateChangeListener() {
            @Override
            public void onPlaybackStateChanged(PlaybackState playbackState, boolean stalled) {
                switch (playbackState) {
                    case PLAYING:
                        if (stalled) {
                            return;
                        }
                        mProgressClock.start(mPlayerClient.getPlayProgress(),
                                mPlayerClient.getPlayProgressUpdateTime(),
                                mPlayerClient.getPlayingMusicItemDuration(),
                                mPlayerClient.getSpeed());
                        break;
                    case STOPPED:
                        updateLiveProgress(0);
                        mProgressClock.cancel();
                        break;
                    case PAUSED:
                        updateLiveProgress(mPlayerClient.getPlayProgress() / 1000);
                        mProgressClock.cancel();
                        break;
                    case ERROR:
                        mProgressClock.cancel();
                        break;
                }
            }
        };

        mOnSeekCompleteListener = new Player.OnSeekCompleteListener() {
            @Override
            public void onSeekComplete(int progress, long updateTime, boolean stalled) {
                updateLiveProgress(progress / 1000);

                if (mPlayerClient.isPlaying() && !stalled) {
                    mProgressClock.start(progress,
                            updateTime,
                            mPlayerClient.getPlayingMusicItemDuration(),
                            mPlayerClient.getSpeed());
                }
            }
        };

        mOnStalledChangeListener = new Player.OnStalledChangeListener() {
            @Override
            public void onStalledChanged(boolean stalled, int playProgress, long updateTime) {
                if (stalled) {
                    mProgressClock.cancel();
                    return;
                }

                if (mPlayerClient.isPlaying()) {
                    mProgressClock.start(playProgress,
                            updateTime,
                            mPlayerClient.getPlayingMusicItemDuration(),
                            mPlayerClient.getSpeed());
                }
            }
        };

        mOnConnectStateChangeListener = new PlayerClient.OnConnectStateChangeListener() {
            @Override
            public void onConnectStateChanged(boolean connected) {
                if (!connected) {
                    mProgressClock.cancel();
                }
            }
        };

        mOnRepeatListener = new Player.OnRepeatListener() {
            @Override
            public void onRepeat(@NonNull MusicItem musicItem, long repeatTime) {
                mProgressClock.start(0,
                        repeatTime,
                        musicItem.getDuration(),
                        mPlayerClient.getSpeed());
            }
        };

        mSpeedChangeListener = new Player.OnSpeedChangeListener() {
            @Override
            public void onSpeedChanged(float speed, int playProgress, long playProgressUpdateTime) {
                mProgressClock.setSpeed(speed);
            }
        };
    }

    private void updateLiveProgress(int progressSec) {
        updateLiveProgress(progressSec, getDurationSec());
    }

    private void updateLiveProgress(int progressSec, int durationSec) {
        if (mLifecycleOwner == null) {
            mOnUpdateListener.onUpdate(progressSec,
                    durationSec,
                    ProgressClock.asText(progressSec),
                    ProgressClock.asText(durationSec));
            return;
        }

        if (atLeastState(mLifecycleOwner)) {
            mOnUpdateListener.onUpdate(progressSec,
                    durationSec,
                    ProgressClock.asText(progressSec),
                    ProgressClock.asText(durationSec));
        }
    }

    private boolean atLeastState(@NonNull LifecycleOwner owner) {
        return owner.getLifecycle()
                .getCurrentState()
                .isAtLeast(Lifecycle.State.STARTED);
    }

    private int getDurationSec() {
        return mPlayerClient.getPlayingMusicItemDuration() / 1000;
    }

    private void addAllListener() {
        mPlayerClient.addOnPlayingMusicItemChangeListener(mOnPlayingMusicItemChangeListener);
        mPlayerClient.addOnPrepareListener(mOnPrepareListener);
        mPlayerClient.addOnPlaybackStateChangeListener(mOnPlaybackStateChangeListener);
        mPlayerClient.addOnSeekCompleteListener(mOnSeekCompleteListener);
        mPlayerClient.addOnStalledChangeListener(mOnStalledChangeListener);
        mPlayerClient.addOnConnectStateChangeListener(mOnConnectStateChangeListener);
        mPlayerClient.addOnRepeatListener(mOnRepeatListener);
        mPlayerClient.addOnSpeedChangeListener(mSpeedChangeListener);
    }

    private void removeAllListener() {
        mPlayerClient.removeOnPlayingMusicItemChangeListener(mOnPlayingMusicItemChangeListener);
        mPlayerClient.removeOnPrepareListener(mOnPrepareListener);
        mPlayerClient.removeOnPlaybackStateChangeListener(mOnPlaybackStateChangeListener);
        mPlayerClient.removeOnSeekCompleteListener(mOnSeekCompleteListener);
        mPlayerClient.removeOnStalledChangeListener(mOnStalledChangeListener);
        mPlayerClient.removeOnConnectStateChangeListener(mOnConnectStateChangeListener);
        mPlayerClient.removeOnRepeatListener(mOnRepeatListener);
        mPlayerClient.removeOnSpeedChangeListener(mSpeedChangeListener);
    }

    private void initLifecycleObserver() {
        if (mLifecycleObserver != null) {
            return;
        }

        mLifecycleObserver = new LifecycleObserver() {
            @OnLifecycleEvent(Lifecycle.Event.ON_DESTROY)
            public void onDestroy() {
                unsubscribe();
            }
        };
    }

    /**
     * 开始监听播放器实时播放进度的更新。
     *
     * <b>注意！当不再需要监听播放器的实时播放进度时，必须调用 {@link #unsubscribe()} 方法取消监听，否则可能
     * 会造成内存泄漏</b>
     *
     * @see #subscribe(LifecycleOwner)
     */
    public void subscribe() {
        subscribe(null);
    }

    /**
     * 开始监听播放器实时播放进度的更新。
     *
     * <b>注意！如果 LifecycleOwner 参数为 null，则必须调用 {@link #unsubscribe()} 方法取消监听，否则可能
     * 会造成内存泄漏</b>
     *
     * @param owner LifecycleOwner 对象。当实时播放进度改变时，只会在 Lifecycle 处于 atLeastState
     *              参数指示的状态时通知监听器，该参数可为 null。如果该参数不为 null，则会在 Lifecycle
     *              的 ON_DESTROYED 事件发生时自动调用 {@link #unsubscribe()} 方法取消监听实时
     *              播放进度。这样可以避免内存泄漏。<b>如果该参数为 null，则必须手动调用
     *              {@link #unsubscribe()} 方法取消监听，否则可能会造成内存泄漏</b>
     * @see #subscribe()
     */
    public void subscribe(@Nullable LifecycleOwner owner) {
        if (owner != null && isDestroyed(owner)) {
            return;
        }

        mLifecycleOwner = owner;

        if (mLifecycleOwner != null) {
            initLifecycleObserver();
            mLifecycleOwner.getLifecycle().addObserver(mLifecycleObserver);
        }

        addAllListener();
    }

    private boolean isDestroyed(LifecycleOwner owner) {
        return owner.getLifecycle().getCurrentState() == Lifecycle.State.DESTROYED;
    }

    /**
     * 取消监听实时播放进度。
     * <p>
     * <b>注意！如果你使用了不带参数的 {@link #subscribe()} 方法或者 subscribe 方法的 LifecycleOwner 参数
     * 为 null，则你必须调用该方法取消监听实时播放进度，否则可能会造成内存泄漏。</b>
     *
     * @see #subscribe()
     * @see #subscribe(LifecycleOwner)
     */
    public void unsubscribe() {
        removeAllListener();
        mProgressClock.cancel();

        if (mLifecycleOwner != null) {
            mLifecycleOwner.getLifecycle().removeObserver(mLifecycleObserver);
            mLifecycleOwner = null;
        }
    }

    /**
     * 用于监听播放器的实时播放进度更新。
     */
    public interface OnUpdateListener {

        /**
         * 当播放器的实时播放进度更新时会调用该方法。
         * <p>
         * 播放器的实时播放进度每秒更新一次。
         *
         * @param progressSec  当前播放进度，单位：秒
         * @param durationSec  歌曲的持续时长，单位：秒
         * @param textProgress 字符串格式的播放进度，格式为：00:00
         * @param textDuration 字符串格式的歌曲的持续时长，格式为：00:00
         */
        void onUpdate(int progressSec, int durationSec, String textProgress, String textDuration);
    }
}
