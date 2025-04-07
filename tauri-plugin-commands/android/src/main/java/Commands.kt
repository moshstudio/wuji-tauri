package tauri.plugin.commands

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.annotation.RequiresApi
import androidx.core.view.WindowCompat

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
                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
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


}
