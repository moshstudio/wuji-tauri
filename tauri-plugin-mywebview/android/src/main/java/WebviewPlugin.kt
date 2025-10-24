package wuji.plugin.mywebview

import android.app.Activity
import android.util.Log
import android.webkit.WebView
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class PingArgs {
    var value: String? = null
}

@InvokeArg
class FetchArgs {
    var url: String? = null
}

@TauriPlugin
class WebviewPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun ping(invoke: Invoke) {
        Log.e("ping", "ping")
        val ret = JSObject()
        ret.put("value", "")
        invoke.resolve(ret)
    }

    @Command
    fun fetch(invoke: Invoke) {
        val args = invoke.parseArgs(FetchArgs::class.java)
        if (args.url == null) {
            val ret = JSObject()
            ret.put("error", "URL is required")
            invoke.resolve(ret)
        } else {
            val backstageWebView = BackstageWebView(activity, args.url)
            backstageWebView.getStrResponse(
                onResult = { response ->
                    val ret = JSObject()
                    ret.put("value", response.content ?: "")
                    invoke.resolve(ret)
                },
                onError = { error ->
                    val ret = JSObject()
                    ret.put("value", "")
                    invoke.resolve(ret)
                }
            )
//            val response = backstageWebView.getStrResponse()

        }

    }
}
