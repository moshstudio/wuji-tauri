package snow.player;

import android.os.SystemClock;

import com.google.common.base.Preconditions;

import java.util.concurrent.TimeUnit;

import io.reactivex.Observable;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;
import io.reactivex.functions.Consumer;

class SleepTimerImp implements SleepTimer {
    private final PlayerService mPlayerService;
    private final PlayerState mPlayerState;
    private final OnStateChangeListener2 mSleepTimerStateChangedListener;
    private final OnWaitPlayCompleteChangeListener mWaitPlayCompleteChangeListener;
    private final PlayerStateHelper mPlayerStateHelper;

    private Disposable mSleepTimerDisposable;

    SleepTimerImp(PlayerService playerService,
                  PlayerState playerState,
                  ServicePlayerStateHelper playerStateHelper,
                  SleepTimer.OnStateChangeListener2 onStateChangeListener2,
                  OnWaitPlayCompleteChangeListener onWaitPlayCompleteChangeListener) {
        mPlayerService = playerService;
        mPlayerState = playerState;
        mSleepTimerStateChangedListener = onStateChangeListener2;
        mWaitPlayCompleteChangeListener = onWaitPlayCompleteChangeListener;

        mPlayerStateHelper = playerStateHelper;
    }

    @Override
    public void startSleepTimer(long time, TimeoutAction action) {
        if (time < 0) {
            throw new IllegalArgumentException("time must >= 0");
        }
        Preconditions.checkNotNull(action);

        disposeLastSleepTimer();

        if (mPlayerService.getPlayingMusicItem() == null) {
            return;
        }

        if (time == 0) {
            onTimeout();
            return;
        }

        mSleepTimerDisposable = Observable.timer(time, TimeUnit.MILLISECONDS)
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<Long>() {
                    @Override
                    public void accept(Long aLong) {
                        onTimeout();
                    }
                });

        long startTime = SystemClock.elapsedRealtime();
        mPlayerStateHelper.onSleepTimerStart(time, startTime, action);
        mSleepTimerStateChangedListener.onTimerStart(time, startTime, action, mPlayerState.isWaitPlayComplete());
    }

    @Override
    public void cancelSleepTimer() {
        disposeLastSleepTimer();
        mPlayerStateHelper.onSleepTimerEnd();
        mSleepTimerStateChangedListener.onTimerEnd();
    }

    @Override
    public void setWaitPlayComplete(boolean waitPlayComplete) {
        if (waitPlayComplete == mPlayerState.isWaitPlayComplete()) {
            return;
        }

        mPlayerStateHelper.onWaitPlayCompleteChanged(waitPlayComplete);
        mWaitPlayCompleteChangeListener.onWaitPlayCompleteChanged(waitPlayComplete);

        if (!waitPlayComplete
                && mPlayerState.isSleepTimerStarted()
                && mPlayerState.isSleepTimerTimeout()
                && !mPlayerState.isSleepTimerEnd()) {
            cancelSleepTimer();
        }
    }

    private void onTimeout() {
        if (mPlayerState.isWaitPlayComplete() && mPlayerService.isPlaying()) {
            mPlayerStateHelper.onSleepTimerTimeout(false);
            mSleepTimerStateChangedListener.onTimeout(false);
            return;
        }

        doAction();
        mPlayerStateHelper.onSleepTimerTimeout(true);
        mSleepTimerStateChangedListener.onTimeout(true);
        mSleepTimerStateChangedListener.onTimerEnd();
    }

    public void performAction() {
        if (mPlayerState.isSleepTimerEnd()) {
            return;
        }

        doAction();
        mSleepTimerStateChangedListener.onTimerEnd();
    }

    private void doAction() {
        switch (mPlayerState.getTimeoutAction()) {
            case PAUSE:
                mPlayerService.getPlayer().pause();
                break;
            case STOP:
                mPlayerService.getPlayer().stop();
                break;
            case SHUTDOWN:
                mPlayerService.shutdown();
                break;
        }

        mPlayerStateHelper.onSleepTimerEnd();
    }

    private void disposeLastSleepTimer() {
        if (mSleepTimerDisposable == null || mSleepTimerDisposable.isDisposed()) {
            return;
        }

        mSleepTimerDisposable.dispose();
    }
}
