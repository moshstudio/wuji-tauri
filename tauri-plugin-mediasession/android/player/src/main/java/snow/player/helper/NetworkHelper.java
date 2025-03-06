package snow.player.helper;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.NetworkRequest;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import com.google.common.base.Preconditions;

import java.lang.ref.WeakReference;

/**
 * 用于帮助获取和监听当前的网络状态。
 * <p>
 * 用于帮助实现 “仅 Wifi 网络播放” 功能。
 */
@SuppressWarnings("deprecation")
public class NetworkHelper {
    private final Context mApplicationContext;
    private final WeakReference<OnNetworkStateChangeListener> mListenerWeakReference;

    private final ConnectivityManager mConnectivityManager;
    private final BroadcastReceiver mNetworkStateReceiver;
    private ConnectivityManager.NetworkCallback mNetworkCallback;

    private NetworkHelper(Context context, OnNetworkStateChangeListener listener) {
        mApplicationContext = context;
        mListenerWeakReference = new WeakReference<>(listener);

        mConnectivityManager = (ConnectivityManager) mApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE);

        mNetworkStateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                OnNetworkStateChangeListener ls = mListenerWeakReference.get();
                if (ls == null) {
                    return;
                }

                ls.onNetworkStateChanged(networkAvailable(), isWifiNetwork());
            }
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            mNetworkCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onLosing(@NonNull Network network, int maxMsToLive) {
                    OnNetworkStateChangeListener ls = mListenerWeakReference.get();
                    if (ls == null) {
                        return;
                    }

                    ls.onNetworkStateChanged(networkAvailable(), false);
                }

                @Override
                public void onAvailable(@NonNull Network network) {
                    OnNetworkStateChangeListener ls = mListenerWeakReference.get();
                    if (ls == null) {
                        return;
                    }

                    ls.onNetworkStateChanged(networkAvailable(), true);
                }
            };
        }
    }

    /**
     * 创建一个新的 {@link NetworkHelper} 对象。
     *
     * @param context  {@link Context} 对象，不能为 null
     * @param listener 网络状态监听器，不能为 null
     * @return {@link NetworkHelper} 对象
     */
    public static NetworkHelper newInstance(@NonNull Context context, @NonNull OnNetworkStateChangeListener listener) {
        Preconditions.checkNotNull(context);
        Preconditions.checkNotNull(listener);

        return new NetworkHelper(context, listener);
    }

    /**
     * 当前网络是否可用。
     */
    public boolean networkAvailable() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return hasNetworkApi28();
        }

        return mConnectivityManager.getActiveNetworkInfo() != null;
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private boolean hasNetworkApi28() {
        return mConnectivityManager.getActiveNetwork() != null;
    }

    /**
     * 当前网络是否是 Wifi 网络。
     */
    public boolean isWifiNetwork() {
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.P) {
            return isWifiNetworkApi28();
        }

        NetworkInfo networkInfo = mConnectivityManager.getActiveNetworkInfo();
        if (networkInfo == null) {
            return false;
        }

        return networkInfo.getType() == ConnectivityManager.TYPE_WIFI;
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private boolean isWifiNetworkApi28() {
        Network network = mConnectivityManager.getActiveNetwork();
        if (network == null) {
            return false;
        }

        NetworkCapabilities capabilities = mConnectivityManager.getNetworkCapabilities(network);
        if (capabilities == null) {
            return false;
        }

        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private void subscribeNetworkStateApi28() {
        mConnectivityManager.registerNetworkCallback(
                new NetworkRequest.Builder()
                        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                        .build(),
                mNetworkCallback);
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private void unsubscribeNetworkStateApi28() {
        mConnectivityManager.unregisterNetworkCallback(mNetworkCallback);
    }

    /**
     * 订阅当前网络状态。
     * <p>
     * 调用该方法后，当网络状态发生改变时，{@link OnNetworkStateChangeListener} 监听器会被调用。
     */
    public void subscribeNetworkState() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            subscribeNetworkStateApi28();
            return;
        }

        IntentFilter intentFilter = new IntentFilter(ConnectivityManager.EXTRA_NO_CONNECTIVITY);
        intentFilter.addCategory(Intent.CATEGORY_DEFAULT);
        mApplicationContext.registerReceiver(mNetworkStateReceiver, intentFilter);
    }

    /**
     * 取消订阅当前网络状态。
     */
    public void unsubscribeNetworkState() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            unsubscribeNetworkStateApi28();
            return;
        }

        mApplicationContext.unregisterReceiver(mNetworkStateReceiver);
    }

    /**
     * 网络状态监听器。
     */
    public interface OnNetworkStateChangeListener {

        /**
         * 该方法会在网络状态改变时调用。
         *
         * @param connected   当前网络是否已连接
         * @param wifiNetwork 当前网络是否是 Wifi 网络
         */
        void onNetworkStateChanged(boolean connected, boolean wifiNetwork);
    }
}
