package snow.player;

import android.appwidget.AppWidgetProvider;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.common.base.Preconditions;

import java.util.List;

import snow.player.appwidget.AppWidgetPlayerState;
import snow.player.audio.MusicItem;

class ServicePlayerStateHelper extends PlayerStateHelper {
    private final Context mContext;
    private final Class<? extends PlayerService> mPlayerService;

    @Nullable
    private final List<Class<? extends AppWidgetProvider>> mAppWidgets;

    public ServicePlayerStateHelper(
            @NonNull PlayerState playerState,
            @NonNull Context context,
            @NonNull Class<? extends PlayerService> playerService,
            @Nullable List<Class<? extends AppWidgetProvider>> appWidgets
    ) {
        super((playerState));
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(playerService);

        mContext = context;
        mPlayerService = playerService;
        mAppWidgets = appWidgets;
    }

    private void updateAppWidgetPlayerState() {
        AppWidgetPlayerState playerState = new AppWidgetPlayerState(
                getPlayerState().getPlaybackState(),
                getPlayerState().getMusicItem(),
                getPlayerState().getPlayMode(),
                getPlayerState().getSpeed(),
                getPlayerState().getPlayProgress(),
                getPlayerState().getPlayProgressUpdateTime(),
                getPlayerState().isPreparing(),
                getPlayerState().isPrepared(),
                getPlayerState().isStalled(),
                getPlayerState().getErrorMessage()
        );

        if (mAppWidgets != null) {
            AppWidgetPlayerState.updatePlayerState(mContext, mPlayerService, playerState, mAppWidgets);
            return;
        }

        AppWidgetPlayerState.updatePlayerState(mContext, mPlayerService, playerState);
    }

    @Override
    public void onPreparing() {
        super.onPreparing();

        updateAppWidgetPlayerState();
    }

    @Override
    public void onPrepared(int audioSessionId, int duration) {
        super.onPrepared(audioSessionId, duration);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onPlay(boolean stalled, int progress, long updateTime) {
        super.onPlay(stalled, progress, updateTime);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onPaused(int playProgress, long updateTime) {
        super.onPaused(playProgress, updateTime);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onStopped() {
        super.onStopped();

        updateAppWidgetPlayerState();
    }

    @Override
    public void onStalled(boolean stalled, int playProgress, long updateTime) {
        super.onStalled(stalled, playProgress, updateTime);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onRepeat(long repeatTime) {
        super.onRepeat(repeatTime);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onError(int errorCode, String errorMessage) {
        super.onError(errorCode, errorMessage);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onPlayingMusicItemChanged(@Nullable MusicItem musicItem, int position, int playProgress) {
        super.onPlayingMusicItemChanged(musicItem, position, playProgress);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onSeekComplete(int playProgress, long updateTime, boolean stalled) {
        super.onSeekComplete(playProgress, updateTime, stalled);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onPlayModeChanged(PlayMode playMode) {
        super.onPlayModeChanged(playMode);

        updateAppWidgetPlayerState();
    }

    @Override
    public void onSpeedChanged(float speed, int progress, long updateTime) {
        super.onSpeedChanged(speed, progress, updateTime);

        updateAppWidgetPlayerState();
    }
}
