package tauri.plugin.commands

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Color
import android.media.AudioManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.annotation.RequiresApi
import androidx.core.view.WindowCompat
import kotlin.math.roundToInt

class Commands(private val activity: Activity) {
    fun exit_app() {
        // 关闭所有 Activity
        activity.finishAffinity()
        // 终止进程
        System.exit(0)
    }

    @Suppress("DEPRECATION")
    fun setStatusBar(bg: String, text: String? = null): Boolean {
        val textIsLight = text == "dark"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // API 30+ 使用 WindowInsetsController
            val controller = activity.window.insetsController
            controller?.setSystemBarsAppearance(
                if (textIsLight) WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS else 0,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            )
        } else
        // API 23-29 使用 View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            activity.window.decorView.systemUiVisibility =
                if (textIsLight) View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR else 0

        activity.window?.statusBarColor = Color.parseColor(bg)
        activity.window?.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)

        return true
    }

    fun getScreenOrientation(): String {
        when (activity.resources.configuration.orientation) {
            Configuration.ORIENTATION_LANDSCAPE -> {
                return "landscape"
            }

            Configuration.ORIENTATION_PORTRAIT -> {
                return "portrait"
            }

            Configuration.ORIENTATION_UNDEFINED -> {
                return "auto"
            }

            else -> {
                return "unknown"
            }

        }
    }

    fun setScreenOrientation(orientation: String): Boolean {
        when (orientation) {
            "landscape" -> {
                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                hideStatusBar()
                return true
            }

            "portrait" -> {
                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                WindowCompat.setDecorFitsSystemWindows(activity.window, true)
                hideStatusBar(false)
                return true
            }

            "auto" -> {
                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
                WindowCompat.setDecorFitsSystemWindows(activity.window, true)
                hideStatusBar(false)
                return true
            }

            else -> throw IllegalArgumentException("Invalid orientation: $orientation")
        }
    }

    fun hideStatusBar(hide: Boolean = true): Boolean {
        return if (hide) {
            handleHideStatusBar()
        } else {
            handleShowStatusBar()
        }
    }

    private fun handleHideStatusBar(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            activity.window?.insetsController?.apply {
                hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            activity.window?.decorView?.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    )
        }
        return true
    }

    private fun handleShowStatusBar(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            activity.window?.insetsController?.apply {
                show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
            }
        } else {
            @Suppress("DEPRECATION", "DEPRECATED_SYNTAX_WITHOUT_DEPRECATE")
            activity.window?.apply {
                clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
            }
        }
        return true
    }
    fun getBrightness(): Float {
        val layoutParams = activity.window.attributes
        return layoutParams.screenBrightness
    }
    fun getSystemBrightness(): Int {
        return try {
            Settings.System.getInt(
                activity.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS
            )
        } catch (e: Settings.SettingNotFoundException) {
            -1  // 返回-1表示获取失败
        }
    }

    fun setBrightness(brightness: Float): Boolean {
        if (!(brightness in 0f..1f || brightness == -1f)) {
            throw IllegalArgumentException("Brightness must be between 0 and 1 or -1")
        }
        val layoutParams = activity.window.attributes
        layoutParams.screenBrightness = brightness
        activity.window.attributes = layoutParams
        return true
    }

    fun getVolume(): Int? {
        val audioManager = activity.getSystemService(AudioManager::class.java) ?: return null
        if (audioManager.isVolumeFixed) {
            Log.e("VolumeManager", "Device volume is fixed")
            return null // 设备音量固定，无法获取
        }

        val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
        val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)

        // 计算百分比（四舍五入）
        return ((currentVolume.toFloat() / maxVolume) * 100).roundToInt()
    }

    fun setVolume(volume: Int): Boolean {
        val audioManager = activity?.getSystemService(AudioManager::class.java) ?: return false
        if (audioManager.isVolumeFixed) {
            Log.e("VolumeManager", "Device volume is fixed")
            return false // 设备音量固定，无法设置
        }
        val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        // 计算实际音量值（四舍五入）
        val targetVolume = (volume * maxVolume / 100f).roundToInt()
        return try {
            audioManager.setStreamVolume(
                AudioManager.STREAM_MUSIC,
                targetVolume,
                0
            )
            true
        } catch (e: SecurityException) {
            false // 无权限
        }
    }

    fun getAndroidId(): String {
        val androidId = Settings.Secure.getString(
            activity.contentResolver,
            Settings.Secure.ANDROID_ID
        )
        val buildInfo = "${Build.BRAND}-${Build.MODEL}-${Build.MANUFACTURER}-${Build.HARDWARE}"
        return "$androidId-${buildInfo}"
    }

}
