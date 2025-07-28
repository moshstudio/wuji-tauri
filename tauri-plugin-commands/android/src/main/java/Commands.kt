package tauri.plugin.commands

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Color
import android.media.AudioManager
import android.os.Build
import android.os.Environment
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.core.view.WindowCompat
import java.io.File
import kotlin.math.roundToInt

enum class BaseDirectory(val value: Int) {
    AUDIO(1),
    CACHE(2),
    CONFIG(3),
    DATA(4),
    LOCAL_DATA(5),
    DOCUMENT(6),
    DOWNLOAD(7),
    PICTURE(8),
    PUBLIC(9),
    VIDEO(10),
    RESOURCE(11),
    TEMP(12),
    APP_CONFIG(13),
    APP_DATA(14),
    APP_LOCAL_DATA(15),
    APP_CACHE(16),
    APP_LOG(17),
    DESKTOP(18),
    EXECUTABLE(19),
    FONT(20),
    HOME(21),
    RUNTIME(22),
    TEMPLATE(23)
}

class Commands(private val activity: Activity) {
    fun exitApp() {
        activity.finishAffinity()
        android.os.Process.killProcess(android.os.Process.myPid())
        //        // 关闭所有 Activity
        //        activity.finishAffinity()
        //        // 终止进程
        //        System.exit(0)
    }

    fun returnToHome() {
        val intent = Intent(Intent.ACTION_MAIN)
        intent.addCategory(Intent.CATEGORY_HOME)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        activity.startActivity(intent)
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
            activity.window?.decorView?.systemUiVisibility =
                (View.SYSTEM_UI_FLAG_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION)
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
            Settings.System.getInt(activity.contentResolver, Settings.System.SCREEN_BRIGHTNESS)
        } catch (e: Settings.SettingNotFoundException) {
            -1 // 返回-1表示获取失败
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
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume, 0)
            true
        } catch (e: SecurityException) {
            false // 无权限
        }
    }

    fun getAndroidId(): String {
        val androidId =
            Settings.Secure.getString(activity.contentResolver, Settings.Secure.ANDROID_ID)
        val buildInfo = "${Build.BRAND}-${Build.MODEL}-${Build.MANUFACTURER}-${Build.HARDWARE}"
        return "$androidId-${buildInfo}"
    }

    fun getDirectoryPath(
        directoryType: BaseDirectory,
        subPath: String = ""
    ): File? {
        return when (directoryType) {
            BaseDirectory.AUDIO ->
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC)

            BaseDirectory.CACHE -> activity.cacheDir
            BaseDirectory.CONFIG -> File(activity.filesDir, "config")
            BaseDirectory.DATA -> activity.filesDir
            BaseDirectory.LOCAL_DATA -> activity.filesDir
            BaseDirectory.DOCUMENT ->
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)

            BaseDirectory.DOWNLOAD ->
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)

            BaseDirectory.PICTURE ->
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)

            BaseDirectory.PUBLIC ->
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)

            BaseDirectory.VIDEO ->
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)

            BaseDirectory.RESOURCE -> activity.filesDir
            BaseDirectory.TEMP -> activity.cacheDir
            BaseDirectory.APP_CONFIG -> File(activity.filesDir, "config")
            BaseDirectory.APP_DATA -> activity.getExternalFilesDir(null) ?: activity.filesDir
            BaseDirectory.APP_LOCAL_DATA -> activity.filesDir
            BaseDirectory.APP_CACHE -> activity.externalCacheDir ?: activity.cacheDir
            BaseDirectory.APP_LOG -> File(activity.filesDir, "logs")
            BaseDirectory.DESKTOP ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    Environment.getExternalStoragePublicDirectory(
                        Environment.DIRECTORY_DOCUMENTS
                    )
                } else {
                    Environment.getExternalStorageDirectory()?.let { File(it, "Desktop") }
                }

            BaseDirectory.EXECUTABLE -> activity.filesDir
            BaseDirectory.FONT ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    File(activity.filesDir, "fonts")
                } else {
                    Environment.getExternalStorageDirectory()?.let { File(it, "Fonts") }
                }

            BaseDirectory.HOME -> activity.filesDir
            BaseDirectory.RUNTIME -> activity.filesDir
            BaseDirectory.TEMPLATE -> activity.filesDir
        }?.let { baseDir ->
            if (subPath.isNotEmpty()) {
                File(baseDir, subPath).also { it.mkdirs() }
            } else {
                baseDir
            }
        }
    }

    fun saveToDirectory(
        directoryType: BaseDirectory,
        fileName: String,
        content: ByteArray,
        subPath: String = ""
    ): File? {
        val file =
            getDirectoryPath(directoryType, subPath)?.let { dir ->
                File(dir, fileName).apply {
                    parentFile?.mkdirs()
                    writeBytes(content)
                }
            }
        return file
    }

    fun vibrate(duration: Long = 100L, amplitude: Int = VibrationEffect.DEFAULT_AMPLITUDE) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            activity.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration, amplitude))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(duration)
        }
    }

    fun vibratePattern(pattern: LongArray, repeat: Int = -1, amplitudes: IntArray? = null) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            activity.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = if (amplitudes != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                VibrationEffect.createWaveform(pattern, amplitudes, repeat)
            } else {
                VibrationEffect.createWaveform(pattern, repeat)
            }
            vibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, repeat)
        }
    }

    fun vibratePredefined(effectId: Int) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            activity.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val effect = when (effectId) {
                0 -> VibrationEffect.EFFECT_CLICK
                1 -> VibrationEffect.EFFECT_DOUBLE_CLICK
                2 -> VibrationEffect.EFFECT_HEAVY_CLICK
                3 -> VibrationEffect.EFFECT_TICK
                else -> VibrationEffect.EFFECT_CLICK
            }
            vibrator.vibrate(VibrationEffect.createPredefined(effect))
        } else {
            // 对于旧版本，使用默认震动
            vibrator.vibrate(100L)
        }
    }



}
