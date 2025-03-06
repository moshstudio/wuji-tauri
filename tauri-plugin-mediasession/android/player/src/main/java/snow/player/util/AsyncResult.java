package snow.player.util;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * 用于接收异步任务执行的结果值。
 *
 * @param <T> 异步任务的结果值的类型。
 */
public abstract class AsyncResult<T> {
    @Nullable
    private OnCancelListener mOnCancelListener;

    /**
     * 当异步任务执行成功时，调用该方法发送结果值。
     *
     * @param t 异步执行得到的结果值，不能为 null。
     */
    public abstract void onSuccess(@NonNull T t);

    /**
     * 当异步任务执行失败时，调用该方法发送异常信息。
     *
     * @param throwable 异常信息，不能为 null。
     */
    public abstract void onError(@NonNull Throwable throwable);

    /**
     * 判断异步任务是否已被取消。
     * <p>
     * 子类在实现该方法时请确保该方法的线程安全，因为该方法可能会被并发访问。
     *
     * @return 异步任务是否已被取消，如果已被取消，则返回 true，否则返回 false。
     */
    public abstract boolean isCancelled();

    /**
     * 设置一个 {@link OnCancelListener} 监听器，用于监听异步任务的取消事件。
     *
     * @param listener {@link OnCancelListener} 监听器，设置为 null 时将清除上次设置的监听器。
     */
    public synchronized void setOnCancelListener(@Nullable OnCancelListener listener) {
        mOnCancelListener = listener;
    }

    /**
     * 发送异步任务已被取消的通知。
     */
    protected synchronized void notifyCancelled() {
        if (mOnCancelListener != null) {
            mOnCancelListener.onCancelled();
        }
    }

    /**
     * 异步任务取消事件监听器。
     */
    public interface OnCancelListener {
        /**
         * 当异步任务被取消时该方法会被调用。
         * <p>
         * 你可以在该方法中释放占用的资源。
         */
        void onCancelled();
    }
}
