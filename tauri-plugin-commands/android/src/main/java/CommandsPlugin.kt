package tauri.plugin.commands

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg data class SetStatusBarArgs(val value: String)

@TauriPlugin
class CommandsPlugin(private val activity: Activity) : Plugin(activity) {
  private val implementation = Commands(activity)

  @Command
  fun set_status_bar(invoke: Invoke) {
    val args = invoke.getArgs()
    val color = args.getString("value")
    var res = implementation.set_status_bar(color)

    val ret = JSObject()
    ret.put("res", res)
    invoke.resolve(ret)
  }
  @Command
  fun exit_app(invoke: Invoke) {
    implementation.exit_app()

    val ret = JSObject()

    invoke.resolve(ret)
  }
}
