package com.wuji_app.app

import android.util.Log
import android.view.KeyEvent
import android.webkit.WebView

class MainActivity : TauriActivity() {
  private var wv: WebView? = null;

  override fun onWebViewCreate(webView: WebView) {
    wv = webView
//    startWebViewCheck() // 不管用
  }

//  private fun startWebViewCheck() {
//    //  不管用 使用 Handler 定期检查 WebView 状态
//    val handler = android.os.Handler(mainLooper)
//    val checkInterval = 5000L // 5 秒
//
//    val checkRunnable = object : Runnable {
//      override fun run() {
//        Log.w("WebView", "Checking WebView status")
//        if (!wv!!.isActivated) {
//          Log.e("WebView", "WebView is not activated onResume")
//          wv!!.onResume()
//        }
//        handler.postDelayed(this, checkInterval)
//      }
//    }
//
//    handler.post(checkRunnable)
//  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_BACK && event?.repeatCount == 0) {
      if (wv == null) {
        return super.onKeyDown(keyCode, event)
      }

      wv?.evaluateJavascript(
        """
                try {
                  window.androidBackCallback() ? "true" : "false"
                } catch (_) {
                  "false"
                }
                """.trimIndent()
      ) { _ -> }
      return false
    }
    return super.onKeyDown(keyCode, event)
  }
}
