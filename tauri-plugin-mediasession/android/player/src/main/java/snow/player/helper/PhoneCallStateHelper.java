package snow.player.helper;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.google.common.base.Preconditions;

/**
 * 监听手机来电状态。
 */
public final class PhoneCallStateHelper {
    private final Context mApplicationContext;
    private final TelephonyManager mTelephonyManager;
    private final PhoneStateListener mPhoneStateListener;
    private final OnStateChangeListener mCallStateListener;
    private boolean mRegistered;

    /**
     * 创建一个 {@link PhoneCallStateHelper} 对象。
     *
     * @param context  Context 对象，不能为 null
     * @param listener 监听器对象，不能为 null
     */
    public PhoneCallStateHelper(@NonNull Context context, @NonNull OnStateChangeListener listener) {
        Preconditions.checkNotNull(listener);
        mApplicationContext = context.getApplicationContext();
        mTelephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        mCallStateListener = listener;

        mPhoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String phoneNumber) {
                switch (state) {
                    case TelephonyManager.CALL_STATE_IDLE:
                        mCallStateListener.onIDLE();
                        break;
                    case TelephonyManager.CALL_STATE_RINGING:
                        mCallStateListener.onRinging();
                        break;
                    case TelephonyManager.CALL_STATE_OFFHOOK:
                        mCallStateListener.onOffHook();
                        break;
                }
            }
        };
    }

    /**
     * 是否没有任何来电。
     */
    public boolean isCallIDLE() {
        if (noPermission()) {
            return true;
        }

        return mTelephonyManager.getCallState() == TelephonyManager.CALL_STATE_IDLE;
    }

    /**
     * 注册监听器。如果已经注册，则忽略本次调用。
     */
    public void registerCallStateListener() {
        if (noPermission()) {
            return;
        }

        if (mRegistered) {
            return;
        }

        mRegistered = true;
        addPhoneStartListener();
    }

    /**
     * 取消已注册的监听器。如果还没有注册，则忽略本次调用。
     */
    public void unregisterCallStateListener() {
        if (mRegistered) {
            mRegistered = false;

            if (noPermission()) {
                return;
            }

            removePhoneStateListener();
        }
    }

    private void addPhoneStartListener() {
        mTelephonyManager.listen(mPhoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
    }

    private void removePhoneStateListener() {
        mTelephonyManager.listen(mPhoneStateListener, PhoneStateListener.LISTEN_NONE);
    }

    private boolean noPermission() {
        return ContextCompat.checkSelfPermission(
                mApplicationContext,
                Manifest.permission.READ_PHONE_STATE
        ) != PackageManager.PERMISSION_GRANTED;
    }

    /**
     * 手机来电状态监听器。
     */
    public interface OnStateChangeListener {
        /**
         * 没有来电（或者来电已经挂了）。
         */
        void onIDLE();

        /**
         * 来电响铃。一个新的呼叫已到达，正在响铃或等待。在后一种情况下，另一个呼叫已经处于活动状态。
         */
        void onRinging();

        /**
         * 正在拨号，正在通话或处于保留状态的呼叫，并且没有电话在响铃或等待。
         */
        void onOffHook();
    }
}
