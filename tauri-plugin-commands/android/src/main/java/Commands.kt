package tauri.plugin.commands

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.view.WindowManager

class Commands(private val activity: Activity) {
  fun exit_app() {
    // 关闭所有 Activity
    activity.finishAffinity()

    // // 终止进程
    // System.exit(0)
  }
  fun set_status_bar(color: String): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      activity.window?.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
      activity.window?.setStatusBarColor(Color.parseColor(color))
      return true
    }
    return false
  }
}
