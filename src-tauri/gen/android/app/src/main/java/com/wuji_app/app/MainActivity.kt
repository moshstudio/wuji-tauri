package com.wuji_app.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebView


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
