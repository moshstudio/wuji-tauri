package snow.player.util;

import android.annotation.SuppressLint;
import android.os.Build;
import android.os.Environment;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.annotation.RestrictTo;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.Properties;

@RestrictTo(RestrictTo.Scope.LIBRARY)
public class Util {
    private static final String TAG = "Util";

    private static boolean isInfoReaded;
    private static String sMiuiVersionName;

    /**
     * 是否是 MIUI。
     * <p>
     * 代码参考自 QMUI_Android 的 QMUIDeviceHelper 类。
     * <p>
     * QMUI_Android: https://github.com/Tencent/QMUI_Android
     */
    public static boolean isMIUI() {
        checkReadInfo();
        return !TextUtils.isEmpty(sMiuiVersionName);
    }

    /**
     * 是否是 MIUI 13。
     * <p>
     * 代码参考自 QMUI_Android 的 QMUIDeviceHelper 类。
     * <p>
     * QMUI_Android: https://github.com/Tencent/QMUI_Android
     */
    public static boolean isMIUI13() {
        checkReadInfo();
        return "v130".equals(sMiuiVersionName);
    }

    /**
     * 代码参考自 QMUI_Android 的 QMUIDeviceHelper 类。
     * <p>
     * QMUI_Android: https://github.com/Tencent/QMUI_Android
     */
    @SuppressLint("PrivateApi")
    private static void checkReadInfo() {
        if (isInfoReaded) {
            return;
        }
        isInfoReaded = true;
        Properties properties = new Properties();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // android 8.0，读取 /system/uild.prop 会报 permission denied
            FileInputStream fileInputStream = null;
            try {
                fileInputStream = new FileInputStream(new File(Environment.getRootDirectory(), "build.prop"));
                properties.load(fileInputStream);
            } catch (Exception e) {
                Log.e(TAG, "read file error");
            } finally {
                if (fileInputStream != null) {
                    try {
                        fileInputStream.close();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }

        Class<?> clzSystemProperties;
        try {
            clzSystemProperties = Class.forName("android.os.SystemProperties");
            Method getMethod = clzSystemProperties.getDeclaredMethod("get", String.class);
            // miui
            sMiuiVersionName = getLowerCaseName(properties, getMethod);
        } catch (Exception e) {
            Log.e(TAG, "read SystemProperties error");
        }
    }

    /**
     * 代码参考自 QMUI_Android 的 QMUIDeviceHelper 类。
     * <p>
     * QMUI_Android: https://github.com/Tencent/QMUI_Android
     */
    @Nullable
    private static String getLowerCaseName(Properties p, Method get) {
        String key = "ro.miui.ui.version.name";
        String name = p.getProperty(key);
        if (name == null) {
            try {
                name = (String) get.invoke(null, key);
            } catch (Exception ignored) {
            }
        }
        if (name != null) name = name.toLowerCase();
        return name;
    }
}
