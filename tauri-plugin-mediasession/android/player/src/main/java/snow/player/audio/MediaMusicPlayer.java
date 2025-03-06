package snow.player.audio;

import android.content.Context;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;

import com.google.common.base.Preconditions;

import java.net.HttpCookie;
import java.util.List;
import java.util.Map;

/**
 * 封装了一个 MediaPlayer。
 */
public class MediaMusicPlayer implements MusicPlayer {
    private static final String TAG = "MediaMusicPlayer";

    private final Context mContext;
    private final Uri mUri;
    private final Map<String, String> mHeaders;
    private List<HttpCookie> mCookies;

    private MediaPlayer mMediaPlayer;

    @Nullable
    private OnErrorListener mErrorListener;
    @Nullable
    private OnStalledListener mStalledListener;
    @Nullable
    private OnRepeatListener mRepeatListener;
    @Nullable
    private OnCompletionListener mCompletionListener;

    private boolean mStalled;
    private boolean mInvalid;
    private boolean mLooping;

    private float mVolume = 1.0F;

    /**
     * 创建一个 {@link MediaMusicPlayer} 对象。
     *
     * @param context Context 对象，不能为 null
     * @param uri     要播放的歌曲的 URI，不能为 null
     */
    public MediaMusicPlayer(@NonNull Context context, @NonNull Uri uri) {
        this(context, uri, null);
    }

    /**
     * 创建一个 {@link MediaMusicPlayer} 对象。
     *
     * @param context Context 对象，不能为 null
     * @param uri     要播放的歌曲的 URI，不能为 null
     * @param headers HTTP 首部
     */
    public MediaMusicPlayer(@NonNull Context context, @NonNull Uri uri, @Nullable Map<String, String> headers) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(uri);

        mContext = context;
        mUri = uri;
        mHeaders = headers;

        mMediaPlayer = new MediaPlayer();
        mInvalid = false;

        mMediaPlayer.setWakeMode(context, PowerManager.PARTIAL_WAKE_LOCK);

        mMediaPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
            @Override
            public boolean onError(MediaPlayer mp, int what, int extra) {
                Log.e(TAG, "MediaPlayer Error[what: " + what + ", extra: " + extra + "]");

                setInvalid();

                if (mErrorListener != null) {
                    mErrorListener.onError(MediaMusicPlayer.this, toErrorCode(what, extra));
                }
                return true;
            }
        });

        mMediaPlayer.setOnInfoListener(new MediaPlayer.OnInfoListener() {
            @Override
            public boolean onInfo(MediaPlayer mp, int what, int extra) {
                switch (what) {
                    case MediaPlayer.MEDIA_INFO_BUFFERING_START:
                        setStalled(true);
                        return true;
                    case MediaPlayer.MEDIA_INFO_BUFFERING_END:
                        setStalled(false);
                        return true;
                }

                return false;
            }
        });

        mMediaPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
            @Override
            public void onCompletion(MediaPlayer mp) {
                if (mLooping) {
                    mp.start();
                    notifyOnRepeat();
                    return;
                }

                notifyOnComplete();
            }
        });
    }

    private void notifyOnRepeat() {
        if (mRepeatListener != null) {
            mRepeatListener.onRepeat(this);
        }
    }

    private void notifyOnComplete() {
        if (mCompletionListener != null) {
            mCompletionListener.onCompletion(this);
        }
    }

    /**
     * 创建一个 {@link MediaMusicPlayer} 对象。
     *
     * @param context Context 对象，不能为 null
     * @param uri     要播放的歌曲的 URI，不能为 null
     * @param headers HTTP 首部
     * @param cookies HTTP cookies
     */
    @RequiresApi(Build.VERSION_CODES.O)
    public MediaMusicPlayer(@NonNull Context context, @NonNull Uri uri, @Nullable Map<String, String> headers, @Nullable List<HttpCookie> cookies) {
        this(context, uri, headers);
        mCookies = cookies;
    }

    private int toErrorCode(int what, int extra) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR1) {
            switch (what) {
                case MediaPlayer.MEDIA_ERROR_UNKNOWN:
                    return ErrorCode.UNKNOWN_ERROR;
                case MediaPlayer.MEDIA_ERROR_SERVER_DIED:
                    return ErrorCode.PLAYER_ERROR;
            }
        }

        switch (extra) {
            case MediaPlayer.MEDIA_ERROR_IO:            // 注意！case 穿透！
            case MediaPlayer.MEDIA_ERROR_TIMED_OUT:
                return ErrorCode.DATA_LOAD_FAILED;
            case MediaPlayer.MEDIA_ERROR_MALFORMED:     // 注意！case 穿透！
            case MediaPlayer.MEDIA_ERROR_UNSUPPORTED:
            case -2147483648/*低级系统错误*/:
                return ErrorCode.PLAYER_ERROR;
            default:
                return ErrorCode.UNKNOWN_ERROR;
        }
    }

    private void setStalled(boolean stalled) {
        mStalled = stalled;
        if (mStalledListener != null) {
            mStalledListener.onStalled(mStalled);
        }
    }

    @Override
    public void prepare() throws Exception {
        if (isInvalid()) {
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mMediaPlayer.setDataSource(mContext, mUri, mHeaders, mCookies);
            } else {
                mMediaPlayer.setDataSource(mContext, mUri, mHeaders);
            }
            mMediaPlayer.prepareAsync();
        } catch (Exception e) {
            setInvalid();
            throw e;
        }
    }

    @Override
    public void setLooping(boolean looping) {
        if (isInvalid()) {
            return;
        }

        mLooping = looping;
    }

    @Override
    public boolean isLooping() {
        return mMediaPlayer.isLooping();
    }

    @Override
    public boolean isStalled() {
        return mStalled;
    }

    @Override
    public boolean isPlaying() {
        return mMediaPlayer.isPlaying();
    }

    @Override
    public int getDuration() {
        return mMediaPlayer.getDuration();
    }

    @Override
    public int getProgress() {
        return mMediaPlayer.getCurrentPosition();
    }

    @Override
    public void start() {
        if (isInvalid()) {
            return;
        }

        mMediaPlayer.start();
    }

    @Override
    public void pause() {
        if (isInvalid()) {
            return;
        }

        mMediaPlayer.pause();
    }

    @Override
    public void stop() {
        if (isInvalid()) {
            return;
        }

        mMediaPlayer.stop();
    }

    @Override
    public void quiet() {
        if (isInvalid()) {
            return;
        }

        float volume = mVolume * 0.5F;
        mMediaPlayer.setVolume(volume, volume);
    }

    @Override
    public void dismissQuiet() {
        if (isInvalid()) {
            return;
        }

        mMediaPlayer.setVolume(mVolume, mVolume);
    }

    @Override
    public void release() {
        setInvalid();
        if (mMediaPlayer != null) {
            mMediaPlayer.release();
        }
    }

    @Override
    public void seekTo(int pos) {
        if (isInvalid()) {
            return;
        }

        mMediaPlayer.seekTo(pos);
    }

    @Override
    public void setVolume(float volume) {
        if (isInvalid()) {
            return;
        }

        mVolume = volume;
        mMediaPlayer.setVolume(volume, volume);
    }

    @Override
    public float getVolume() {
        return mVolume;
    }

    @Override
    public void setSpeed(float speed) {
        if (isInvalid()) {
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return;
        }

        PlaybackParams playbackParams = mMediaPlayer.getPlaybackParams();
        playbackParams.setSpeed(speed);
        mMediaPlayer.setPlaybackParams(playbackParams);
    }

    @Override
    public synchronized boolean isInvalid() {
        return mInvalid;
    }

    private synchronized void setInvalid() {
        mInvalid = true;
    }

    @Override
    public int getAudioSessionId() {
        return mMediaPlayer.getAudioSessionId();
    }

    @Override
    public void setOnPreparedListener(@Nullable final OnPreparedListener listener) {
        if (listener == null) {
            mMediaPlayer.setOnPreparedListener(null);
            return;
        }

        mMediaPlayer.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
            @Override
            public void onPrepared(MediaPlayer mp) {
                listener.onPrepared(MediaMusicPlayer.this);
            }
        });
    }

    @Override
    public void setOnCompletionListener(@Nullable OnCompletionListener listener) {
        mCompletionListener = listener;
    }

    @Override
    public void setOnRepeatListener(@Nullable OnRepeatListener listener) {
        mRepeatListener = listener;
    }

    @Override
    public void setOnSeekCompleteListener(@Nullable final OnSeekCompleteListener listener) {
        if (listener == null) {
            mMediaPlayer.setOnSeekCompleteListener(null);
            return;
        }

        mMediaPlayer.setOnSeekCompleteListener(new MediaPlayer.OnSeekCompleteListener() {
            @Override
            public void onSeekComplete(MediaPlayer mp) {
                listener.onSeekComplete(MediaMusicPlayer.this);
            }
        });
    }

    @Override
    public void setOnStalledListener(@Nullable final OnStalledListener listener) {
        mStalledListener = listener;
    }

    @Override
    public void setOnBufferingUpdateListener(@Nullable final OnBufferingUpdateListener listener) {
        if (listener == null) {
            mMediaPlayer.setOnBufferingUpdateListener(null);
            return;
        }

        mMediaPlayer.setOnBufferingUpdateListener(new MediaPlayer.OnBufferingUpdateListener() {
            @Override
            public void onBufferingUpdate(MediaPlayer mp, int percent) {
                listener.onBufferingUpdate(MediaMusicPlayer.this, percent, true);
            }
        });
    }

    @Override
    public void setOnErrorListener(@Nullable OnErrorListener listener) {
        mErrorListener = listener;
    }
}
