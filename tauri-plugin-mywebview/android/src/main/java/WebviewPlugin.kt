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
    var timeout: Long? = null
    var waitForResources: String? = null
}

@TauriPlugin
class WebviewPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun ping(invoke: Invoke) {
        Log.e("ping", "ping")
        val args = invoke.parseArgs(PingArgs::class.java)
        val ret = app.tauri.plugin.JSObject()
        if (args.value != null) {
            ret.put("value", args.value)
        }
        invoke.resolve(ret)
    }

    @Command
    fun fetch(invoke: Invoke) {
        val args = invoke.parseArgs(FetchArgs::class.java)
        Log.e("WujiWebView", "[fetch] url=${args.url}, timeout=${args.timeout}, waitForResources=${args.waitForResources}")
        if (args.url == null) {
            val ret = JSObject()
            ret.put("error", "URL is required")
            invoke.resolve(ret)
        } else {
            val backstageWebView = BackstageWebView(
                activity, 
                args.url, 
                timeout = args.timeout ?: 20000L, 
                waitForResources = args.waitForResources
            )
            backstageWebView.getStrResponse(
                onResult = { response ->
                    Log.e("WujiWebView", "[fetch onResult] content length=${response.content?.length ?: 0}, title=${response.title}, url=${response.url}, resources count=${response.resources?.length() ?: 0}")
                    Log.e("WujiWebView", "[fetch onResult] content first200=${response.content?.take(200)}")
                    val ret = app.tauri.plugin.JSObject()
                    ret.put("content", response.content ?: "")
                    ret.put("cookie", response.cookie ?: "")
                    ret.put("url", response.url ?: "")
                    ret.put("title", response.title ?: "")
                    
                    val resourcesArray = app.tauri.plugin.JSArray()
                    response.resources?.let { resMap ->
                        for (i in 0 until resMap.length()) {
                            val item = resMap.optJSONObject(i)
                            if (item != null) {
                                val jsItem = app.tauri.plugin.JSObject()
                                val keys = item.keys()
                                while (keys.hasNext()) {
                                    val key = keys.next()
                                    // JS 脚本已同时输出 type 和 resourceType，直接透传
                                    if (!item.isNull(key)) {
                                        jsItem.put(key, item.get(key))
                                    }
                                }
                                resourcesArray.put(jsItem)
                            }
                        }
                    }
                    ret.put("resources", resourcesArray)
                    Log.e("WujiWebView", "[fetch] resolving with resources count=${resourcesArray.length()}")
                    invoke.resolve(ret)
                },
                onError = { error ->
                    Log.e("WujiWebView", "[fetch onError] ${error.message}", error)
                    val ret = app.tauri.plugin.JSObject()
                    ret.put("content", "")
                    ret.put("cookie", "")
                    ret.put("url", "")
                    ret.put("title", "")
                    ret.put("resources", app.tauri.plugin.JSArray())
                    invoke.resolve(ret)
                }
            )
//            val response = backstageWebView.getStrResponse()

        }

    }
}
