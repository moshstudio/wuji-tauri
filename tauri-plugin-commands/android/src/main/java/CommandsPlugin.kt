package tauri.plugin.commands

import android.app.Activity
import android.content.ComponentCallbacks2
import android.content.Intent
import android.content.res.Configuration
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class SetStatusBarArgs {
    lateinit var bg: String;
    var text: String? = null;
}


@InvokeArg
class HideStatusBarArgs(
    var hide: Boolean? = null
)


@TauriPlugin
class CommandsPlugin(private val activity: Activity) : Plugin(activity) {
    private val implementation = Commands(activity)
    private val registerNames = ArrayList<String>()

    private val orientationListener = object : ComponentCallbacks2 {
        override fun onConfigurationChanged(newConfig: Configuration) {
            when (newConfig.orientation) {
                Configuration.ORIENTATION_UNDEFINED -> orientationChanged("auto")
                Configuration.ORIENTATION_LANDSCAPE -> orientationChanged("landscape")
                Configuration.ORIENTATION_PORTRAIT -> orientationChanged("portrait")
                else -> Log.e("Orientation", "Undefined orientation: ${newConfig.orientation}")
            }
        }

        private fun orientationChanged(orientation: String) {
            val ret = JSObject()
            ret.put("orientation", orientation)
            trigger("orientationChanged", ret)
        }

        override fun onLowMemory() {}
        override fun onTrimMemory(level: Int) {}
    }

    override fun registerListener(invoke: Invoke) {
        super.registerListener(invoke)
        val eventName = invoke.getArgs().getString("event")
        if (eventName.equals("orientationChanged", ignoreCase = true)) {
            synchronized(registerNames) {
                if (registerNames.add("orientationChanged")) {
                    activity?.registerComponentCallbacks(orientationListener)
                }
            }
        }
        Log.d("CommandsPlugin", "registerListener, ${invoke.getRawArgs()}")
    }


    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
    }

    @Command
    fun setStatusBar(invoke: Invoke) {
        val args = invoke.parseArgs(SetStatusBarArgs::class.java)
        var res = implementation.setStatusBar(args.bg, args.text)

        val ret = JSObject()
        ret.put("res", res)
        invoke.resolve(ret)
    }

    @Command
    fun hideStatusBar(invoke: Invoke) {
        val args = invoke.parseArgs(HideStatusBarArgs::class.java)
        var res = implementation.hideStatusBar(args.hide ?: true)

        val ret = JSObject()
        ret.put("res", res)
        invoke.resolve(ret)
    }

    @Command
    fun getSystemFontScale(invoke: Invoke) {
        activity.apply {
            val configuration: Configuration = this.resources.configuration
            val ret = JSObject()
            ret.put("value", configuration.fontScale)
            invoke.resolve(ret)
        }
    }

    @Command
    fun getScreenOrientation(invoke: Invoke) {
        val orientation = implementation.getScreenOrientation()
        val ret = JSObject()
        ret.put("orientation", orientation)
        invoke.resolve(ret)
    }

    @Command
    fun setScreenOrientation(invoke: Invoke) {
        val args = invoke.getArgs()
        val orientation = args.getString("orientation")
        val res = implementation.setScreenOrientation(orientation)
        val ret = JSObject()
        ret.put("res", res)
        invoke.resolve(ret)
    }

    @Command
    fun getBrightness(invoke: Invoke) {
        val brightness = implementation.getBrightness()
        val ret = JSObject()
        ret.put("value", brightness)
        invoke.resolve(ret)
    }

    @Command
    fun getSystemBrightness(invoke: Invoke) {
        val brightness = implementation.getSystemBrightness()
        val ret = JSObject()
        ret.put("value", brightness)
        invoke.resolve(ret)
    }

    @Command
    fun setBrightness(invoke: Invoke) {
        val args = invoke.getArgs()
        val brightness = args.getDouble("brightness")
        val result = implementation.setBrightness(brightness.toFloat())
        val ret = JSObject()
        ret.put("res", result)
        invoke.resolve(ret)
    }

    @Command
    fun getVolume(invoke: Invoke) {
        val volume = implementation.getVolume()
        Log.e("CommandsPlugin", "getVolume: $volume")
        val ret = JSObject()
        ret.put("value", volume)
        invoke.resolve(ret)
    }

    @Command
    fun setVolume(invoke: Invoke) {
        val args = invoke.getArgs()
        val volume = args.getInt("volume")
        val result = implementation.setVolume(volume)
        val ret = JSObject()
        ret.put("res", result)
        invoke.resolve(ret)
    }

    @Command
    fun exitApp(invoke: Invoke) {
        implementation.exit_app()
        val ret = JSObject()
        invoke.resolve(ret)
    }
}
