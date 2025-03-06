package snow.player.lifecycle;

import android.content.Context;
import android.os.SystemClock;
import android.widget.SeekBar;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.Transformations;
import androidx.lifecycle.ViewModel;

import com.google.common.base.Preconditions;

import snow.player.PlayMode;
import snow.player.PlaybackState;
import snow.player.Player;
import snow.player.PlayerClient;
import snow.player.R;
import snow.player.SleepTimer;
import snow.player.audio.MusicItem;
import snow.player.playlist.Playlist;
import snow.player.playlist.PlaylistManager;
import snow.player.util.ProgressClock;
import snow.player.util.MusicItemUtil;

/**
 * 播放器 ViewModel，支持 DataBinding。
 * <p>
 * <b>注意！使用前必须先调用 {@link PlayerViewModel} 对象的任意一个 init 方法进行初始化。</b>
 */
public class PlayerViewModel extends ViewModel {
    private PlayerClient mPlayerClient;

    private MutableLiveData<String> mTitle;
    private MutableLiveData<String> mArtist;
    private MutableLiveData<String> mAlbum;
    private MutableLiveData<String> mIconUri;
    private MutableLiveData<Integer> mDuration;             // 单位：秒
    private MutableLiveData<Integer> mPlayProgress;         // 单位：秒
    private MutableLiveData<Integer> mBufferedProgress;     // 单位：秒
    private MutableLiveData<Boolean> mSleepTimerStarted;
    private MutableLiveData<Integer> mSleepTimerTime;       // 单位：秒
    private MutableLiveData<Integer> mSleepTimerProgress;   // 单位：秒
    private MutableLiveData<Boolean> mWaitPlayComplete;
    private MutableLiveData<Integer> mPlayPosition;
    private MutableLiveData<PlayMode> mPlayMode;
    private MutableLiveData<Float> mSpeed;
    private MutableLiveData<PlaybackState> mPlaybackState;
    private MutableLiveData<Boolean> mStalled;
    private MutableLiveData<Boolean> mConnected;
    private MutableLiveData<Boolean> mPreparing;
    private MutableLiveData<String> mErrorMessage;
    private MutableLiveData<MusicItem> mPlayingMusicItem;
    private MutableLiveData<Boolean> mPlayingNoStalled;
    private MutableLiveData<Float> mVolume;

    private Player.OnPlayingMusicItemChangeListener mPlayingMusicItemChangeListener;
    private Player.OnPlaylistChangeListener mPlaylistChangeListener;
    private Player.OnPlayModeChangeListener mPlayModeChangeListener;
    private Player.OnSpeedChangeListener mSpeedChangeListener;
    private PlayerClient.OnPlaybackStateChangeListener mClientPlaybackStateChangeListener;
    private Player.OnBufferedProgressChangeListener mBufferedProgressChangeListener;
    private SleepTimer.OnStateChangeListener mSleepTimerStateChangeListener;
    private SleepTimer.OnWaitPlayCompleteChangeListener mWaitPlayCompleteChangeListener;
    private Player.OnSeekCompleteListener mSeekCompleteListener;
    private Player.OnStalledChangeListener mStalledChangeListener;
    private Player.OnPrepareListener mPrepareListener;
    private PlayerClient.OnConnectStateChangeListener mConnectStateChangeListener;
    private Player.OnRepeatListener mRepeatListener;
    private Player.OnVolumeChaneListener mVolumeChaneListener;

    private String mDefaultTitle;
    private String mDefaultArtist;
    private String mDefaultAlbum;

    private ProgressClock mProgressClock;
    private ProgressClock mSleepTimerProgressClock;

    private boolean mInitialized;
    private boolean mCleared;
    private boolean mAutoDisconnect;

    /**
     * 初始化 {@link PlayerViewModel} 对象。
     * <p>
     * 默认启用了进度条时钟（用于实时更新播放进度）。
     * <p>
     * 默认标题为 "未知标题"；默认歌手为 "未知歌手"；默认专辑为 "未知专辑"。这些默认值会在正在播放的
     * {@link MusicItem} 对应的字段为空时展示。
     *
     * @param context      Context 对象，不能为 null
     * @param playerClient PlayerClient 对象，不能为 null
     */
    public void init(@NonNull Context context, @NonNull PlayerClient playerClient) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerClient);

        init(context, playerClient, true);
    }

    /**
     * 初始化 {@link PlayerViewModel} 对象。
     * <p>
     * 默认标题为 "未知标题"；默认歌手为 "未知歌手"；默认专辑为 "未知专辑"。这些默认值会在正在播放的
     * {@link MusicItem} 对应的字段为空时展示。
     *
     * @param context             Context 对象，不能为 null。
     * @param playerClient        PlayerClient 对象，不能为 null。
     * @param enableProgressClock 是否启用进度条时钟（用于实时更新播放进度）。
     */
    public void init(@NonNull Context context, @NonNull PlayerClient playerClient, boolean enableProgressClock) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerClient);

        init(playerClient,
                context.getString(R.string.snow_music_item_unknown_title),
                context.getString(R.string.snow_music_item_unknown_artist),
                context.getString(R.string.snow_music_item_unknown_album),
                enableProgressClock);
    }

    /**
     * 初始化 {@link PlayerViewModel} 对象。
     * <p>
     * 默认启用了进度条时钟（用于实时更新播放进度）。
     *
     * @param playerClient  PlayerClient 对象，不能为 null。
     * @param defaultTitle  默认标题，会在正在播放的歌曲的标题为空时展示，不能为 null。
     * @param defaultArtist 默认艺术家，会在正在播放的歌曲的艺术家为空时展示，不能为 null。
     * @param defaultAlbum  默认专辑，会在正在播放的歌曲的专辑为空时展示，不能为 null。
     */
    public void init(@NonNull PlayerClient playerClient,
                     @NonNull String defaultTitle,
                     @NonNull String defaultArtist,
                     @NonNull String defaultAlbum) {
        Preconditions.checkNotNull(playerClient);
        Preconditions.checkNotNull(defaultTitle);
        Preconditions.checkNotNull(defaultArtist);
        Preconditions.checkNotNull(defaultAlbum);

        init(playerClient, defaultTitle, defaultArtist, defaultAlbum, true);
    }

    /**
     * 初始化 {@link PlayerViewModel} 对象。
     *
     * @param playerClient        PlayerClient 对象，不能为 null。
     * @param defaultTitle        默认标题，会在正在播放的歌曲的标题为空时展示，不能为 null。
     * @param defaultArtist       默认艺术家，会在正在播放的歌曲的艺术家为空时展示，不能为 null。
     * @param defaultAlbum        默认专辑，会在正在播放的歌曲的专辑为空时展示，不能为 null。
     * @param enableProgressClock 是否启用进度条时钟。用于实时更新播放进度，默认为 true。
     *                            如果你不需要展示实时播放进度，则可以将该参数设置为 false。
     */
    public void init(@NonNull PlayerClient playerClient,
                     @NonNull String defaultTitle,
                     @NonNull String defaultArtist,
                     @NonNull String defaultAlbum,
                     boolean enableProgressClock) {
        Preconditions.checkNotNull(playerClient);
        Preconditions.checkNotNull(defaultTitle);
        Preconditions.checkNotNull(defaultArtist);
        Preconditions.checkNotNull(defaultAlbum);

        if (mInitialized) {
            throw new IllegalArgumentException("PlayerViewModel is initialized, please do not repeat initialization.");
        }

        if (mCleared) {
            throw new IllegalStateException("PlayerViewModel is cleared.");
        }

        mPlayerClient = playerClient;
        mDefaultTitle = defaultTitle;
        mDefaultArtist = defaultArtist;
        mDefaultAlbum = defaultAlbum;

        initAllLiveData();
        initAllListener();
        initAllProgressClock(enableProgressClock);

        addAllListener();

        mInitialized = true;
        onInitialized();
    }

    /**
     * 该方法会在 {@link PlayerViewModel} 初始化完成后调用。
     * <p>
     * 如果你创建了子类并让其继承了 {@link PlayerViewModel} 类，且打算在该子类中对 {@link PlayerViewModel}
     * 进行控制，请务必等待到 {@link PlayerViewModel} 的初始化完成。
     */
    protected void onInitialized() {
    }

    /**
     * 设置是否在 ViewModel 被清理时自动断开 PlayerClient 的连接。
     *
     * @param autoDisconnect 如果为 true，则会在 ViewModel 被清理时自动断开 PlayerClient 的连接，默认为 false。
     */
    public void setAutoDisconnect(boolean autoDisconnect) {
        mAutoDisconnect = autoDisconnect;
    }

    private void initAllListener() {
        mPlayingMusicItemChangeListener = new Player.OnPlayingMusicItemChangeListener() {
            @Override
            public void onPlayingMusicItemChanged(@Nullable MusicItem musicItem, int position, int playProgress) {
                mProgressClock.cancel();
                mPlayPosition.setValue(position);
                mPlayingMusicItem.setValue(musicItem);

                if (musicItem == null) {
                    mTitle.setValue(mDefaultTitle);
                    mArtist.setValue(mDefaultArtist);
                    mAlbum.setValue(mDefaultAlbum);
                    mIconUri.setValue("");
                    mDuration.setValue(0);
                    mPlayProgress.setValue(0);
                    return;
                }

                mTitle.setValue(MusicItemUtil.getTitle(musicItem, mDefaultTitle));
                mArtist.setValue(MusicItemUtil.getArtist(musicItem, mDefaultArtist));
                mAlbum.setValue(MusicItemUtil.getAlbum(musicItem, mDefaultAlbum));

                mIconUri.setValue(musicItem.getIconUri());

                mPlayProgress.setValue(playProgress / 1000);
                mDuration.setValue(getDurationSec());
            }
        };

        mPlaylistChangeListener = new Player.OnPlaylistChangeListener() {
            @Override
            public void onPlaylistChanged(PlaylistManager playlistManager, int position) {
                mPlayPosition.setValue(position);
            }
        };

        mPlayModeChangeListener = new Player.OnPlayModeChangeListener() {
            @Override
            public void onPlayModeChanged(PlayMode playMode) {
                mPlayMode.setValue(playMode);
            }
        };

        mSpeedChangeListener = new Player.OnSpeedChangeListener() {
            @Override
            public void onSpeedChanged(float speed, int playProgress, long playProgressUpdateTime) {
                mSpeed.setValue(speed);
                mProgressClock.setSpeed(speed);
            }
        };

        mClientPlaybackStateChangeListener = new PlayerClient.OnPlaybackStateChangeListener() {
            @Override
            public void onPlaybackStateChanged(PlaybackState playbackState, boolean stalled) {
                if (playbackState == PlaybackState.ERROR) {
                    mErrorMessage.setValue(mPlayerClient.getErrorMessage());
                } else {
                    mErrorMessage.setValue("");
                }

                mPlaybackState.setValue(playbackState);
                mPlayingNoStalled.setValue(playbackState == PlaybackState.PLAYING && !stalled);

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
                        mPreparing.setValue(false);
                        mPlayProgress.setValue(0);
                        mPreparing.setValue(false);
                        mProgressClock.cancel();
                        break;
                    case PAUSED:
                        mPlayProgress.setValue(mPlayerClient.getPlayProgress() / 1000);
                        mPreparing.setValue(false);
                        mProgressClock.cancel();
                        break;
                    case ERROR:
                        mPreparing.setValue(false);
                        mProgressClock.cancel();
                        break;
                }
            }
        };

        mBufferedProgressChangeListener = new Player.OnBufferedProgressChangeListener() {
            @Override
            public void onBufferedProgressChanged(int bufferedProgress) {
                mBufferedProgress.setValue(getBufferedProgressSec());
            }
        };

        mSleepTimerStateChangeListener = new SleepTimer.OnStateChangeListener() {
            @Override
            public void onTimerStart(long time, long startTime, SleepTimer.TimeoutAction action) {
                mSleepTimerStarted.setValue(true);
                mSleepTimerTime.setValue((int) (time / 1000));
                mSleepTimerProgressClock.start(0, startTime, (int) time);
            }

            @Override
            public void onTimerEnd() {
                mSleepTimerStarted.setValue(false);
                mSleepTimerProgressClock.cancel();
                mSleepTimerTime.setValue(0);
                mSleepTimerProgress.setValue(0);
            }
        };

        mWaitPlayCompleteChangeListener = new SleepTimer.OnWaitPlayCompleteChangeListener() {
            @Override
            public void onWaitPlayCompleteChanged(boolean waitPlayComplete) {
                mWaitPlayComplete.setValue(waitPlayComplete);
            }
        };

        mSeekCompleteListener = new Player.OnSeekCompleteListener() {
            @Override
            public void onSeekComplete(int progress, long updateTime, boolean stalled) {
                mPlayProgress.setValue(progress / 1000);

                if (PlaybackState.PLAYING == mPlaybackState.getValue() && !stalled) {
                    mProgressClock.start(progress,
                            updateTime,
                            mPlayerClient.getPlayingMusicItemDuration(),
                            mPlayerClient.getSpeed());
                }
            }
        };

        mStalledChangeListener = new Player.OnStalledChangeListener() {
            @Override
            public void onStalledChanged(boolean stalled, int playProgress, long updateTime) {
                mStalled.setValue(stalled);
                mPlayingNoStalled.setValue(mPlayerClient.isPlaying() && !stalled);
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

        mPrepareListener = new Player.OnPrepareListener2() {
            @Override
            public void onPreparing() {
                mPreparing.setValue(true);
            }

            @Override
            public void onPrepared(int audioSessionId) {
                // ignore
            }

            @Override
            public void onPrepared(int audioSessionId, int duration) {
                mPreparing.setValue(false);

                MusicItem musicItem = mPlayerClient.getPlayingMusicItem();
                assert musicItem != null;

                if (musicItem.isAutoDuration()) {
                    mPlayProgress.setValue(getPlayProgressSec());
                    mDuration.setValue(getDurationSec());
                }
            }
        };

        mConnectStateChangeListener = new PlayerClient.OnConnectStateChangeListener() {
            @Override
            public void onConnectStateChanged(boolean connected) {
                mConnected.setValue(connected);

                if (isInitialized() && !connected) {
                    mProgressClock.cancel();
                    mSleepTimerProgressClock.cancel();
                }
            }
        };

        mRepeatListener = new Player.OnRepeatListener() {
            @Override
            public void onRepeat(@NonNull MusicItem musicItem, long repeatTime) {
                mProgressClock.start(0,
                        repeatTime,
                        musicItem.getDuration(),
                        mPlayerClient.getSpeed());
            }
        };

        mVolumeChaneListener = volume -> mVolume.setValue(volume);
    }

    private void initAllProgressClock(boolean enable) {
        mProgressClock = new ProgressClock(new ProgressClock.Callback() {
            @Override
            public void onUpdateProgress(int progressSec, int durationSec) {
                mPlayProgress.setValue(progressSec);
            }
        });
        mProgressClock.setEnabled(enable);

        mSleepTimerProgressClock = new ProgressClock(true, new ProgressClock.Callback() {
            @Override
            public void onUpdateProgress(int progressSec, int durationSec) {
                mSleepTimerProgress.setValue(progressSec);
            }
        });
    }

    private void addAllListener() {
        mPlayerClient.addOnPlayingMusicItemChangeListener(mPlayingMusicItemChangeListener);
        mPlayerClient.addOnPlaylistChangeListener(mPlaylistChangeListener);
        mPlayerClient.addOnPlayModeChangeListener(mPlayModeChangeListener);
        mPlayerClient.addOnSpeedChangeListener(mSpeedChangeListener);
        mPlayerClient.addOnPlaybackStateChangeListener(mClientPlaybackStateChangeListener);
        mPlayerClient.addOnBufferedProgressChangeListener(mBufferedProgressChangeListener);
        mPlayerClient.addOnSleepTimerStateChangeListener(mSleepTimerStateChangeListener);
        mPlayerClient.addOnWaitPlayCompleteChangeListener(mWaitPlayCompleteChangeListener);
        mPlayerClient.addOnSeekCompleteListener(mSeekCompleteListener);
        mPlayerClient.addOnStalledChangeListener(mStalledChangeListener);
        mPlayerClient.addOnPrepareListener(mPrepareListener);
        mPlayerClient.addOnConnectStateChangeListener(mConnectStateChangeListener);
        mPlayerClient.addOnRepeatListener(mRepeatListener);
        mPlayerClient.addOnVolumeChangeListener(mVolumeChaneListener);
    }

    private void removeAllListener() {
        mPlayerClient.removeOnPlayingMusicItemChangeListener(mPlayingMusicItemChangeListener);
        mPlayerClient.removeOnPlaylistChangeListener(mPlaylistChangeListener);
        mPlayerClient.removeOnPlayModeChangeListener(mPlayModeChangeListener);
        mPlayerClient.removeOnSpeedChangeListener(mSpeedChangeListener);
        mPlayerClient.removeOnPlaybackStateChangeListener(mClientPlaybackStateChangeListener);
        mPlayerClient.removeOnBufferedProgressChangeListener(mBufferedProgressChangeListener);
        mPlayerClient.removeOnSleepTimerStateChangeListener(mSleepTimerStateChangeListener);
        mPlayerClient.removeOnWaitPlayCompleteChangeListener(mWaitPlayCompleteChangeListener);
        mPlayerClient.removeOnSeekCompleteListener(mSeekCompleteListener);
        mPlayerClient.removeOnStalledChangeListener(mStalledChangeListener);
        mPlayerClient.removeOnPrepareListener(mPrepareListener);
        mPlayerClient.removeOnConnectStateChangeListener(mConnectStateChangeListener);
        mPlayerClient.removeOnRepeatListener(mRepeatListener);
        mPlayerClient.removeOnVolumeChangeListener(mVolumeChaneListener);
    }

    @Override
    protected void onCleared() {
        super.onCleared();

        mCleared = true;

        if (!mInitialized) {
            return;
        }

        mProgressClock.cancel();
        mSleepTimerProgressClock.cancel();
        removeAllListener();

        if (mAutoDisconnect) {
            mPlayerClient.disconnect();
        }

        mPlayerClient = null;
    }

    /**
     * 是否已完成初始化。
     *
     * @return 如果返回 false，则必须先调用 {@link #init(Context, PlayerClient)} 方法进行初始化后
     * 才能正常使用当前 {@link PlayerViewModel} 对象。
     */
    public boolean isInitialized() {
        return mInitialized;
    }

    /**
     * 获取当前 {@link PlayerViewModel}关联到的 {@link PlayerClient} 对象。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public PlayerClient getPlayerClient() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mPlayerClient;
    }

    /**
     * 正在播放的歌曲的标题。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getTitle() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mTitle;
    }

    /**
     * 正在播放的歌曲的艺术家（歌手）。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getArtist() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mArtist;
    }

    /**
     * 正在播放的歌曲所属的专辑。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getAlbum() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mAlbum;
    }

    /**
     * 正在播放的歌曲的图标的 Uri。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getIconUri() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mIconUri;
    }

    /**
     * 正在播放的歌曲的持续时间（单位：秒）。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Integer> getDuration() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mDuration;
    }

    /**
     * 正在播放歌曲的实时播放进度（单位：秒），支持双向绑定。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public MutableLiveData<Integer> getPlayProgress() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mPlayProgress;
    }

    /**
     * 正在播放歌曲的缓存进度（单位：秒）。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Integer> getBufferedProgress() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mBufferedProgress;
    }

    /**
     * 正在播放歌曲在列表中的位置。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Integer> getPlayPosition() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mPlayPosition;
    }

    /**
     * 播放器的播放模式。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<PlayMode> getPlayMode() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mPlayMode;
    }

    /**
     * 播放器播放速度。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    public LiveData<Float> getSpeed() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mSpeed;
    }

    /**
     * 播放器的播放状态。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<PlaybackState> getPlaybackState() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mPlaybackState;
    }

    /**
     * 播放器是否处于 stalled 状态。
     * <p>
     * 当缓冲区没有足够的数据支持播放器继续播放时，stalled 状态为 true，否则为 false。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Boolean> getStalled() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mStalled;
    }

    /**
     * 获取客户端的连接结果。
     *
     * @return 客户端的连接结果，如果已成功连接，则返回 true，否则返回 false。
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    public LiveData<Boolean> getConnected() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mConnected;
    }

    /**
     * 播放器是否正在准备中。
     *
     * @return 如果播放器正在准备中，则为 true，否则为 false。
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    public LiveData<Boolean> getPreparing() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mPreparing;
    }

    /**
     * 是否发生了错误。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Boolean> isError() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return Transformations.map(mPlaybackState, playbackState -> playbackState == PlaybackState.ERROR);
    }

    /**
     * 错误信息，只在发生错误时该值才有意义。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getErrorMessage() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mErrorMessage;
    }

    /**
     * 获取当前只在播放的音乐。
     *
     * @return 返回当前正在播放的 `MusicItem` 对象。如果播放列表为空，或者 {@link PlayerClient} 没有与任意一个 {@link snow.player.PlayerService} 建立连接，则可能返回 null。
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<MusicItem> getPlayingMusicItem() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mPlayingMusicItem;
    }

    /**
     * 当前播放器状态为 {@link PlaybackState#PLAYING} 并且播放器没有处于 stalled 状态。
     *
     * @see PlayerClient#isPlaying()
     * @see PlayerClient#isStalled()
     */
    @NonNull
    public LiveData<Boolean> getPlayingNoStalled() {
        return mPlayingNoStalled;
    }

    /**
     * 获取歌曲的持续时间（单位：秒）对应的文本值，例如 82 秒对应的文本值为 "01:22"。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getTextDuration() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return Transformations.map(mDuration, ProgressClock::asText);
    }

    /**
     * 获取歌曲的实时播放进度（单位：秒）对应的文本值，例如 82 秒对应的文本值为 "01:22"。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getTextPlayProgress() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return Transformations.map(mPlayProgress, ProgressClock::asText);
    }

    /**
     * 睡眠定时器是否已启动。
     */
    @NonNull
    public LiveData<Boolean> getSleepTimerStarted() {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mSleepTimerStarted;
    }

    /**
     * 获取睡眠定时器的时长（单位：秒）。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Integer> getSleepTimerTime() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mSleepTimerTime;
    }

    /**
     * 获取睡眠定时器的时长（单位：秒）对应的文本值，例如 82 秒对应的文本值为 "01:22"。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getTextSleepTimerTime() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return Transformations.map(mSleepTimerTime, ProgressClock::asText);
    }

    /**
     * 获取睡眠定时器进度（单位：秒）。
     * <p>
     * 睡眠定时器的进度是个倒计时。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Integer> getSleepTimerProgress() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mSleepTimerProgress;
    }

    /**
     * 睡眠定时器是否等到当前正在播放的歌曲播放完成后，再执行指定的动作。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<Boolean> getWaitPlayComplete() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mWaitPlayComplete;
    }

    /**
     * 获取睡眠定时器进度（单位：秒）对应的文本值，例如 82 秒对应的文本值为 "01:22"。
     * <p>
     * 睡眠定时器的进度是个倒计时。
     *
     * @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    @NonNull
    public LiveData<String> getTextSleepTimerProgress() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return Transformations.map(mSleepTimerProgress, ProgressClock::asText);
    }

    /**
     * 播放器音量，范围为 [0.0, 1.0] 之间的闭区间。
     *
     *  @throws IllegalStateException 如果当前 {@link PlayerViewModel} 对象还没有被初始化（{@link #isInitialized()} 返回 false）。
     */
    public LiveData<Float> getVolume() throws IllegalStateException {
        if (!isInitialized()) {
            throw new IllegalStateException("PlayerViewModel not initialized yet.");
        }

        return mVolume;
    }

    /**
     * 设置播放列表。
     *
     * @param playlist 新的播放列表。
     */
    public void setPlaylist(Playlist playlist) {
        if (isInitialized()) {
            mPlayerClient.setPlaylist(playlist);
        }
    }

    /**
     * 设置播放列表，并决定是否立即播放列表的第 1 首音乐。
     *
     * @param playlist 新的播放列表。
     * @param play     是否立即播放列表的第 1 首音乐。
     */
    public void setPlaylist(Playlist playlist, boolean play) {
        if (isInitialized()) {
            mPlayerClient.setPlaylist(playlist, play);
        }
    }

    /**
     * 设置播放列表，并决定是否立即播放列表的 position 位置处音乐。
     *
     * @param playlist 新的播放列表。
     * @param position 要播放的歌曲的位置。
     * @param play     是否立即播放列表的 position 位置处音乐。
     */
    public void setPlaylist(Playlist playlist, int position, boolean play) {
        if (isInitialized()) {
            mPlayerClient.setPlaylist(playlist, position, play);
        }
    }

    /**
     * 播放。
     */
    public void play() {
        if (isInitialized()) {
            mPlayerClient.play();
        }
    }

    /**
     * 暂停。
     */
    public void pause() {
        if (isInitialized()) {
            mPlayerClient.pause();
        }
    }

    /**
     * 播放/暂停。
     */
    public void playPause() {
        if (isInitialized()) {
            mPlayerClient.playPause();
        }
    }

    /**
     * 播放/暂停 position 位置处的音乐。
     * <p>
     * 如果 position 与当前正在播放的音乐的位置是一样的，则暂停播放，否则播放列表中 position 位置处的音乐。
     */
    public void playPause(int position) {
        if (isInitialized()) {
            mPlayerClient.playPause(position);
        }
    }

    /**
     * 停止。
     */
    public void stop() {
        if (isInitialized()) {
            mPlayerClient.stop();
        }
    }

    /**
     * 上一曲。
     */
    public void skipToPrevious() {
        if (isInitialized()) {
            mPlayerClient.skipToPrevious();
        }
    }

    /**
     * 下一曲。
     */
    public void skipToNext() {
        if (isInitialized()) {
            mPlayerClient.skipToNext();
        }
    }

    /**
     * 播放 position 处的音乐，如果播放列表中 position 处的音乐是当前正在播放的音乐，则忽略本次调用。
     */
    public void skipToPosition(int position) {
        if (isInitialized()) {
            mPlayerClient.skipToPosition(position);
        }
    }

    /**
     * 快进。
     */
    public void fastForward() {
        if (isInitialized()) {
            mPlayerClient.fastForward();
        }
    }

    /**
     * 快退。
     */
    public void rewind() {
        if (isInitialized()) {
            mPlayerClient.rewind();
        }
    }

    /**
     * 设置指定歌曲 “下一曲播放”。
     *
     * @param musicItem 要设定为 “下一曲播放” 的歌曲，如果歌曲已存在播放列表中，则会移动到 “下一曲播放” 的位
     *                  置，如果歌曲不存在，则 musicItem 会被插入到播放列表的 “下一曲播放” 位置。
     */
    public void setNextPlay(@NonNull MusicItem musicItem) {
        Preconditions.checkNotNull(musicItem);
        if (isInitialized()) {
            mPlayerClient.setNextPlay(musicItem);
        }
    }

    /**
     * 设置播放模式。
     *
     * @param playMode 播放模式。
     */
    public void setPlayMode(@NonNull PlayMode playMode) {
        Preconditions.checkNotNull(playMode);
        if (isInitialized()) {
            mPlayerClient.setPlayMode(playMode);
        }
    }

    /**
     * 设置播放速度。
     *
     * @param speed 要设置的播放速度。
     */
    public void setSpeed(float speed) {
        if (isInitialized()) {
            mPlayerClient.setSpeed(speed);
            mProgressClock.setSpeed(speed);
        }
    }

    /**
     * 调整音乐播放进度（单位：毫秒）。
     * <p>
     * 注意！seekTo 方法接收的参数的单位是 <b>毫秒</b>，请注意与 {@link #getPlayProgress()}、
     * {@link #getDuration()} 方法的值进行区分，这两者的单位是 <b>秒</b>。
     *
     * @param progress 要调整到的播放进度（单位：毫秒）
     */
    public void seekTo(int progress) {
        if (isInitialized()) {
            mProgressClock.cancel();
            mPlayerClient.seekTo(progress);
        }
    }

    /**
     * 设置播放器音量。
     *
     * @param volume 要设置的播放器音量，范围为 [0.0, 1.0] 之间的闭区间。
     */
    public void setVolume(float volume) {
        if (isInitialized()) {
            mPlayerClient.setVolume(volume);
        }
    }

    /**
     * 停止实时跟新播放进度。
     */
    public void cancelProgressClock() {
        if (isInitialized()) {
            mProgressClock.cancel();
        }
    }

    /**
     * 启动睡眠定时器。
     *
     * @param time 睡眠时间（单位：毫秒）。播放器会在经过 time 时间后暂停播放。
     * @throws IllegalArgumentException 如果定时时间小于 0，则抛出该异常。
     */
    public void startSleepTimer(long time) throws IllegalArgumentException {
        if (isInitialized()) {
            mPlayerClient.startSleepTimer(time);
        }
    }

    /**
     * 启动睡眠定时器。
     *
     * @param time   睡眠时间（单位：毫秒）。播放器会在经过 time 时间后暂停播放。
     * @param action 定时器的的时间到时要执行的操作。
     * @throws IllegalArgumentException 如果定时时间小于 0，则抛出该异常。
     */
    public void startSleepTimer(long time, SleepTimer.TimeoutAction action) throws IllegalArgumentException {
        if (isInitialized()) {
            mPlayerClient.startSleepTimer(time, action);
        }
    }

    /**
     * 取消睡眠定时器。
     */
    public void cancelSleepTimer() {
        if (isInitialized()) {
            mPlayerClient.cancelSleepTimer();
        }
    }

    /**
     * DataBinding 框架与 SeekBar 专用。
     * <p>
     * 如果你启用了 DataBinding，并且使用 SeekBar 来显示和调整播放进度，那么请将 SeekBar 的
     * {@code android:onStartTrackingTouch} 事件绑定为当前方法。
     * <p>
     * 例如：<br>
     * {@code android:onStartTrackingTouch="@{playerViewModel::onStartTrackingTouch}"}
     */
    public void onStartTrackingTouch(SeekBar seekBar) {
        cancelProgressClock();
    }

    /**
     * DataBinding 框架与 SeekBar 专用。
     * <p>
     * 如果你启用了 DataBinding，并且使用 SeekBar 来显示和调整播放进度，那么请将 SeekBar 的
     * {@code android:onStopTrackingTouch} 事件绑定为当前方法。
     * <p>
     * 例如：<br>
     * {@code android:onStopTrackingTouch="@{playerViewModel::onStopTrackingTouch}"}
     */
    public void onStopTrackingTouch(SeekBar seekBar) {
        if (!isInitialized()) {
            return;
        }

        if (mPlayerClient.isForbidSeek()) {
            restorePlayProgress();
            return;
        }

        seekTo(seekBar.getProgress() * 1000);
    }

    public void setWaitPlayComplete(boolean waitPlayComplete) {
        if (!isInitialized()) {
            return;
        }

        mPlayerClient.setWaitPlayComplete(waitPlayComplete);
    }

    private void restorePlayProgress() {
        if (!mPlayerClient.isPlaying() || mPlayerClient.isStalled()) {
            mPlayProgress.setValue(mPlayerClient.getPlayProgress() / 1000);
            return;
        }

        mProgressClock.start(
                mPlayerClient.getPlayProgress(),
                mPlayerClient.getPlayProgressUpdateTime(),
                mPlayerClient.getPlayingMusicItemDuration(),
                mPlayerClient.getSpeed());
    }

    private void initAllLiveData() {
        mTitle = new MutableLiveData<>(mDefaultTitle);
        mArtist = new MutableLiveData<>(mDefaultArtist);
        mAlbum = new MutableLiveData<>(mDefaultAlbum);
        mIconUri = new MutableLiveData<>(getIconUri(mPlayerClient));
        mDuration = new MutableLiveData<>(getDurationSec());
        mPlayProgress = new MutableLiveData<>(getPlayProgressSec());
        mBufferedProgress = new MutableLiveData<>(getBufferedProgressSec());
        mSleepTimerStarted = new MutableLiveData<>(mPlayerClient.isSleepTimerStarted());
        mSleepTimerTime = new MutableLiveData<>((int) (mPlayerClient.getSleepTimerTime() / 1000));
        mSleepTimerProgress = new MutableLiveData<>((int) (mPlayerClient.getSleepTimerElapsedTime() / 1000));
        mPlayPosition = new MutableLiveData<>(mPlayerClient.getPlayPosition());
        mPlayMode = new MutableLiveData<>(mPlayerClient.getPlayMode());
        mSpeed = new MutableLiveData<>(mPlayerClient.getSpeed());
        mPlaybackState = new MutableLiveData<>(mPlayerClient.getPlaybackState());
        mStalled = new MutableLiveData<>(mPlayerClient.isStalled());
        mConnected = new MutableLiveData<>(mPlayerClient.isConnected());
        mPreparing = new MutableLiveData<>(mPlayerClient.isPreparing());
        mErrorMessage = new MutableLiveData<>(mPlayerClient.getErrorMessage());
        mPlayingMusicItem = new MutableLiveData<>(mPlayerClient.getPlayingMusicItem());
        mPlayingNoStalled = new MutableLiveData<>(mPlayerClient.isPlaying() && !mPlayerClient.isStalled());
        mWaitPlayComplete = new MutableLiveData<>(mPlayerClient.isWaitPlayComplete());
        mVolume = new MutableLiveData<>(mPlayerClient.getVolume());
    }

    private int getDurationSec() {
        return mPlayerClient.getPlayingMusicItemDuration() / 1000;
    }

    private int getPlayProgressSec() {
        if (mPlayerClient.isPlaying()) {
            long realProgress = mPlayerClient.getPlayProgress() + (SystemClock.elapsedRealtime() - mPlayerClient.getPlayProgressUpdateTime());
            return (int) (realProgress / 1000);
        }

        return mPlayerClient.getPlayProgress() / 1000;
    }

    private int getBufferedProgressSec() {
        return mPlayerClient.getBufferedProgress() / 1000;
    }

    private String getIconUri(PlayerClient playerClient) {
        MusicItem musicItem = playerClient.getPlayingMusicItem();
        if (musicItem == null) {
            return "";
        }

        return musicItem.getIconUri();
    }
}
