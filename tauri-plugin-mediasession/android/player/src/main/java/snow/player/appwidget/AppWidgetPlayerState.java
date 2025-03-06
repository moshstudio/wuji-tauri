package snow.player.appwidget;

import android.app.ActivityManager;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Parcel;
import android.os.Parcelable;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.common.base.Preconditions;
import com.tencent.mmkv.MMKV;

import java.util.List;

import snow.player.PlayMode;
import snow.player.PlaybackState;
import snow.player.PlayerService;
import snow.player.audio.MusicItem;

/**
 * 该类主要用于在 {@code AppWidget} 中访问播放器状态。
 * <p>
 * 当播放器状态改变时，会发送一个 {@link #ACTION_PLAYER_STATE_CHANGED} 广播，该广播的 Category 是你的
 * PlayerService 的完整类名（如 {@code snow.player.demo.MyPlayerService}）。可以为你的
 * {@code AppWidgetProvider} 添加一个监听该广播的 {@code <intent-filter>}，并在接收到该广播时更新你的 AppWidget。
 * <p>
 * <b>例：</b>
 * <pre>{@code <receiver android:name=".MyAppWidgetProvider">
 *      ...
 *      <intent-filter>
 *          <action android:name="snow.player.appwidget.action.PLAYER_STATE_CHANGED" />
 *          <category android:name="snow.player.demo.MyPlayerService"/>
 *      </intent-filter>
 * </receiver>
 * }</pre>
 */
public class AppWidgetPlayerState implements Parcelable {
    public static final String ACTION_PLAYER_STATE_CHANGED = "snow.player.appwidget.action.PLAYER_STATE_CHANGED";
    public static final String PERMISSION_UPDATE_APP_WIDGET = "snow.player.appwidget.permission.UPDATE_APPWIDGET";

    private static final String KEY_PLAYER_STATE = "PLAYER_STATE";
    private static boolean sMMKVInitialized;

    private final PlaybackState mPlaybackState;
    @Nullable
    private final MusicItem mPlayingMusicItem;
    private final PlayMode mPlayMode;
    private final long mPlayProgress;
    private final float mSpeed;
    private final long mPlayProgressUpdateTime;
    private final boolean mPreparing;
    private final boolean mPrepared;
    private final boolean mStalled;
    private final String mErrorMessage;

    public AppWidgetPlayerState(@NonNull PlaybackState playbackState,
                                @Nullable MusicItem playingMusicItem,
                                @NonNull PlayMode playMode,
                                float speed,
                                long playProgress,
                                long playProgressUpdateTime,
                                boolean preparing,
                                boolean prepared,
                                boolean stalled,
                                @NonNull String errorMessage) {
        Preconditions.checkNotNull(playbackState);
        Preconditions.checkNotNull(playMode);
        Preconditions.checkNotNull(errorMessage);

        mPlaybackState = playbackState;
        mPlayingMusicItem = playingMusicItem;
        mPlayMode = playMode;
        mSpeed = speed;
        mPlayProgress = playProgress;
        mPlayProgressUpdateTime = playProgressUpdateTime;
        mPreparing = preparing;
        mPrepared = prepared;
        mStalled = stalled;
        mErrorMessage = errorMessage;
    }

    public static AppWidgetPlayerState emptyState() {
        return new AppWidgetPlayerState(
                PlaybackState.NONE,
                new MusicItem(),
                PlayMode.PLAYLIST_LOOP,
                1.0F,
                0,
                0,
                false,
                false,
                false,
                ""
        );
    }

    public static AppWidgetPlayerState getPlayerState(@NonNull Context context, @NonNull Class<? extends PlayerService> playerService) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerService);

        MMKV mmkv = getMMKV(context, playerService);
        return mmkv.decodeParcelable(KEY_PLAYER_STATE, AppWidgetPlayerState.class, emptyState());
    }

    public static void updatePlayerState(@NonNull Context context,
                                         @NonNull Class<? extends PlayerService> playerService,
                                         @NonNull AppWidgetPlayerState playerState) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerService);
        Preconditions.checkNotNull(playerState);

        MMKV mmkv = getMMKV(context, playerService);
        mmkv.encode(KEY_PLAYER_STATE, playerState);

        Intent intent = new Intent(ACTION_PLAYER_STATE_CHANGED);
        intent.addCategory(playerService.getName());
        intent.setPackage(context.getPackageName());
        context.sendBroadcast(intent, PERMISSION_UPDATE_APP_WIDGET);
    }

    public static void updatePlayerState(@NonNull Context context,
                                         @NonNull Class<? extends PlayerService> playerService,
                                         @NonNull AppWidgetPlayerState playerState,
                                         @NonNull List<Class<? extends AppWidgetProvider>> appWidgets) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerService);
        Preconditions.checkNotNull(playerState);

        MMKV mmkv = getMMKV(context, playerService);
        mmkv.encode(KEY_PLAYER_STATE, playerState);

        AppWidgetManager am = AppWidgetManager.getInstance(context);

        for (Class<? extends AppWidgetProvider> appWidgetClazz : appWidgets) {
            Intent intent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);

            ComponentName componentName = new ComponentName(context, appWidgetClazz);
            intent.setComponent(componentName);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, am.getAppWidgetIds(componentName));
            
            context.sendBroadcast(intent);
        }
    }

    private static MMKV getMMKV(@NonNull Context context, @NonNull Class<? extends PlayerService> playerService) {
        if (!sMMKVInitialized) {
            sMMKVInitialized = true;
            MMKV.initialize(context);
        }

        String persistenceId = PlayerService.getPersistenceId(playerService);
        return MMKV.mmkvWithID("AppWidgetPlayerState:" + persistenceId, MMKV.MULTI_PROCESS_MODE);
    }

    @NonNull
    public PlaybackState getPlaybackState() {
        return mPlaybackState;
    }

    @Nullable
    public MusicItem getPlayingMusicItem() {
        return mPlayingMusicItem;
    }

    @NonNull
    public PlayMode getPlayMode() {
        return mPlayMode;
    }

    public float getSpeed() {
        return mSpeed;
    }

    public long getPlayProgress() {
        return mPlayProgress;
    }

    public long getPlayProgressUpdateTime() {
        return mPlayProgressUpdateTime;
    }

    public boolean isPreparing() {
        return mPreparing;
    }

    public boolean isPrepared() {
        return mPrepared;
    }

    public boolean isStalled() {
        return mStalled;
    }

    @NonNull
    public String getErrorMessage() {
        return mErrorMessage;
    }

    /**
     * 检查 PlayerService 是否存活。
     *
     * @return 如果 PlayerService 处于存活状态，则返回 true，否则返回 false
     */
    public static boolean isServiceAlive(Context context, Class<? extends PlayerService> playerService) {
        ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);

        for (ActivityManager.RunningServiceInfo serviceInfo : am.getRunningServices(100)) {
            if (serviceInfo.service.equals(new ComponentName(context, playerService))) {
                return true;
            }
        }

        return false;
    }

    // ----------------------- Parcelable -----------------------

    protected AppWidgetPlayerState(Parcel in) {
        mPlaybackState = PlaybackState.values()[in.readInt()];
        mPlayingMusicItem = in.readParcelable(MusicItem.class.getClassLoader());
        mPlayMode = PlayMode.values()[in.readInt()];
        mSpeed = in.readFloat();
        mPlayProgress = in.readLong();
        mPlayProgressUpdateTime = in.readLong();
        mPreparing = in.readByte() != 0;
        mPrepared = in.readByte() != 0;
        mStalled = in.readByte() != 0;
        mErrorMessage = in.readString();
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeInt(mPlaybackState.ordinal());
        dest.writeParcelable(mPlayingMusicItem, flags);
        dest.writeInt(mPlayMode.ordinal());
        dest.writeFloat(mSpeed);
        dest.writeLong(mPlayProgress);
        dest.writeLong(mPlayProgressUpdateTime);
        dest.writeByte((byte) (mPreparing ? 1 : 0));
        dest.writeByte((byte) (mPrepared ? 1 : 0));
        dest.writeByte((byte) (mStalled ? 1 : 0));
        dest.writeString(mErrorMessage);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<AppWidgetPlayerState> CREATOR = new Creator<AppWidgetPlayerState>() {
        @Override
        public AppWidgetPlayerState createFromParcel(Parcel in) {
            return new AppWidgetPlayerState(in);
        }

        @Override
        public AppWidgetPlayerState[] newArray(int size) {
            return new AppWidgetPlayerState[size];
        }
    };
}
