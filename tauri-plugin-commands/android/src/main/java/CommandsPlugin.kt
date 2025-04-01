package tauri.plugin.commands

import android.app.Activity
import android.content.res.Configuration
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
    fun setScreenOrientation(invoke: Invoke) {
        val args = invoke.getArgs()
        val orientation = args.getString("orientation")
        val res = implementation.setScreenOrientation(orientation)
        val ret = JSObject()
        ret.put("res", res)
        invoke.resolve(ret)
    }

    @Command
    fun exitApp(invoke: Invoke) {
        implementation.exit_app()
        val ret = JSObject()
        invoke.resolve(ret)
    }
}
