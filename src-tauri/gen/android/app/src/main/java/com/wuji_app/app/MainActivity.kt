package com.wuji_app.app

import android.view.KeyEvent
import android.webkit.WebView

class MainActivity : TauriActivity() {
  private lateinit var wv: WebView

  override fun onWebViewCreate(webView: WebView) {
    wv = webView
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_BACK && event?.repeatCount == 0) {
      if (!::wv.isInitialized) {
        return super.onKeyDown(keyCode, event)
      }

      wv.evaluateJavascript(
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
