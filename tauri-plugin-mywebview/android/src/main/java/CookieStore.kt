import android.content.Context
import android.webkit.CookieManager
import java.net.URL
import androidx.core.content.edit

class CookieStore private constructor() {

    companion object {
        private const val PREFS_NAME = "cookie_prefs"

        // 从URL提取domain
        private fun extractDomain(url: String): String {
            return try {
                URL(url).host
            } catch (e: Exception) {
                // 如果URL解析失败，使用整个URL作为fallback
                url
            }
        }

        // 保存Cookie（自动提取domain作为key）
        fun saveCookie(context: Context, url: String) {
            val cookie = CookieManager.getInstance().getCookie(url)
            cookie?.let {
                val domain = extractDomain(url)
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit { putString(domain, it) }

                // 可选：同时保存原始URL到domain的映射
                saveUrlMapping(context, url, domain)
            }
        }

        // 根据URL获取Cookie（自动提取domain）
        fun getCookieByUrl(context: Context, url: String): String? {
            val domain = extractDomain(url)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(domain, null)
        }

        // 根据domain直接获取Cookie
        fun getCookieByDomain(context: Context, domain: String): String? {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(domain, null)
        }

        // 获取所有保存的Cookie（按domain）
        fun getAllCookies(context: Context): Map<String, String> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.all
                .filterValues { it is String }
                .mapValues { it.value as String }
        }

        // 清除特定domain的Cookie
        fun clearCookieForDomain(context: Context, domain: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit { remove(domain) }
            clearUrlMappingForDomain(context, domain)
        }

        // 清除所有Cookie
        fun clearAllCookies(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit { clear() }
            clearAllUrlMappings(context)
        }

        // 保存URL到domain的映射（可选，用于反向查找）
        private fun saveUrlMapping(context: Context, url: String, domain: String) {
            val mappingPrefs = context.getSharedPreferences("cookie_mapping", Context.MODE_PRIVATE)
            mappingPrefs.edit { putString(domain, url) }
        }

        private fun clearUrlMappingForDomain(context: Context, domain: String) {
            val mappingPrefs = context.getSharedPreferences("cookie_mapping", Context.MODE_PRIVATE)
            mappingPrefs.edit { remove(domain) }
        }

        private fun clearAllUrlMappings(context: Context) {
            val mappingPrefs = context.getSharedPreferences("cookie_mapping", Context.MODE_PRIVATE)
            mappingPrefs.edit { clear() }
        }
    }
}