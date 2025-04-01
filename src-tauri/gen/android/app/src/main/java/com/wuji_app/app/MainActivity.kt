package com.wuji_app.app

import com.wuji_app.app.RustWebChromeClient
import android.R
import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.MenuItem
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient


class MainActivity : TauriActivity() {
  private var wv: WebView? = null;

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
  }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onWebViewCreate(webView: WebView) {
    wv = webView
    wv!!.settings.setSupportMultipleWindows(true)
    wv!!.settings.javaScriptEnabled = true
//    wv!!.webChromeClient = MyChromeClient(this)
  }

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
