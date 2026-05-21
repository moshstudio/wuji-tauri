package tauri.plugin.cast

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.yinnho.upnpcast.DLNACast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

@InvokeArg
class DiscoverDevicesArgs {
    var timeoutMs: Long? = 10000
}

@InvokeArg
class CastMediaArgs {
    lateinit var deviceId: String
    lateinit var url: String
    var title: String? = null
    var deviceAddress: String? = null
}

@InvokeArg
class CastControlArgs {
    lateinit var action: String
    var value: Long? = null
}

@TauriPlugin
class CastPlugin(private val activity: Activity) : Plugin(activity) {
    private val tag = "CastPlugin"
    /** 单次 castToDevice 最长等待；超时后改由播放状态轮询判定 */
    private val castMediaTimeoutMs = 12_000L
    /** 投屏 + 状态确认总时长 */
    private val castVerifyTotalMs = 22_000L
    private val castVerifyPollMs = 600L
    private val castProgressQueryTimeoutMs = 3_500L
    /** cast 返回 false 后仍继续轮询，避免 SOAP 误报 */
    private val castVerifyAfterFalseMs = 4_000L
    /** 与 UPnPCast 官方示例一致：设备发现跑在主线程协程上，避免在 IO 线程调用其 suspend API 时偶发死锁导致前端一直「正在搜索」。 */
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val devices = ConcurrentHashMap<String, DLNACast.Device>()
    private var multicastLock: WifiManager.MulticastLock? = null
    /** 首次 SSDP 组播/socket 初始化较慢，预热后再次打开设备列表更稳定 */
    private val discoveryPrepared = AtomicBoolean(false)
    private var prepareJob: Job? = null
    /** 电视播完后 GetPositionInfo 常失败，保留最近一次有效进度供前端判断片尾 */
    private var lastKnownPositionMs = 0L
    private var lastKnownDurationMs = 0L

    override fun load(webView: android.webkit.WebView) {
        super.load(webView)
        initDlna()
        scheduleDiscoveryPrepare()
    }

    private fun scheduleDiscoveryPrepare() {
        prepareJob?.cancel()
        prepareJob = scope.launch {
            runDiscoveryPrepare()
        }
    }

    private suspend fun awaitDiscoveryPrepare() {
        if (discoveryPrepared.get()) {
            return
        }
        val job = prepareJob
        if (job != null && job.isActive) {
            job.join()
        }
        if (!discoveryPrepared.get()) {
            runDiscoveryPrepare()
        }
    }

    private suspend fun runDiscoveryPrepare() {
        if (discoveryPrepared.get()) {
            return
        }
        if (!isWifiConnected() || getLanIpAddress().isNullOrBlank()) {
            return
        }
        var lockHeld = false
        var networkBound = false
        try {
            networkBound = bindToWifiNetwork() != null
            lockHeld = acquireMulticastLock()
            initDlna()
            delay(700)
            withTimeout(7000L) {
                DLNACast.search(3500)
            }
            discoveryPrepared.set(true)
            Log.i(tag, "discovery prepare done")
        } catch (e: Exception) {
            Log.w(tag, "discovery prepare failed", e)
        } finally {
            if (lockHeld) {
                releaseMulticastLock()
            }
            if (networkBound) {
                unbindNetwork()
            }
        }
    }

    private fun initDlna() {
        DLNACast.init(activity.applicationContext)
    }

    private fun resetPlaybackProgressCache() {
        lastKnownPositionMs = 0L
        lastKnownDurationMs = 0L
    }

    private fun isWifiConnected(): Boolean {
        val cm = activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    /**
     * Android 接收 SSDP 组播响应必须持有 MulticastLock，否则常见「同网段但搜不到设备」。
     */
    private fun acquireMulticastLock(): Boolean {
        val wifi = activity.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            ?: return false
        return try {
            releaseMulticastLock()
            multicastLock = wifi.createMulticastLock("wuji_dlna_cast").apply {
                setReferenceCounted(false)
                acquire()
            }
            Log.i(tag, "MulticastLock acquired")
            true
        } catch (e: Exception) {
            Log.e(tag, "acquireMulticastLock failed", e)
            false
        }
    }

    private fun releaseMulticastLock() {
        try {
            multicastLock?.let { lock ->
                if (lock.isHeld) {
                    lock.release()
                }
            }
        } catch (e: Exception) {
            Log.w(tag, "releaseMulticastLock failed", e)
        } finally {
            multicastLock = null
        }
    }

    @SuppressLint("MissingPermission")
    private fun bindToWifiNetwork(): Network? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return null
        }
        val cm = activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return null
        for (network in cm.allNetworks) {
            val caps = cm.getNetworkCapabilities(network) ?: continue
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                if (cm.bindProcessToNetwork(network)) {
                    Log.i(tag, "bound process to Wi-Fi network")
                    return network
                }
            }
        }
        return null
    }

    private fun unbindNetwork() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val cm = activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            cm?.bindProcessToNetwork(null)
        }
    }

    @Command
    fun discoverDevices(invoke: Invoke) {
        val args = invoke.parseArgs(DiscoverDevicesArgs::class.java)
        val timeout = (args.timeoutMs ?: 10000L).coerceIn(6000L, 20000L)

        val wifiOnTransport = isWifiConnected()
        val lanIp = getLanIpAddress()
        if (lanIp.isNullOrBlank()) {
            val err = if (!wifiOnTransport) {
                "请连接 Wi-Fi，并确保手机与电视在同一局域网"
            } else {
                "无法获取本机局域网 IP，请检查 Wi-Fi 连接"
            }
            resolveDiscover(invoke, emptyList(), null, err)
            return
        }

        scope.launch {
            var lockHeld = false
            var networkBound = false
            try {
                val wasPreparedBefore = discoveryPrepared.get()
                awaitDiscoveryPrepare()

                networkBound = bindToWifiNetwork() != null
                lockHeld = acquireMulticastLock()

                // 切勿在搜索前调用 DLNACast.cleanup()：会永久取消 UPnPCast 内部 ScopeManager。
                initDlna()
                val coldStart = !wasPreparedBefore
                delay(if (coldStart) 800 else 250)

                suspend fun searchOnce(waitMs: Long): List<DLNACast.Device> {
                    val capMs = waitMs + 5000L
                    return try {
                        withTimeout(capMs) {
                            DLNACast.search(waitMs)
                        }
                    } catch (e: TimeoutCancellationException) {
                        Log.w(tag, "DLNACast.search timed out (wait=${waitMs}ms)")
                        emptyList()
                    } catch (e: Exception) {
                        Log.e(tag, "DLNACast.search failed", e)
                        emptyList()
                    }
                }

                var found = searchOnce(timeout)
                if (found.isEmpty()) {
                    delay(1200)
                    found = searchOnce(timeout.coerceAtMost(12000L))
                }
                // 冷启动：首轮常为空，补一次短搜唤醒 NOTIFY 后再正式搜
                if (found.isEmpty() && coldStart) {
                    Log.i(tag, "cold start empty, warmup SSDP then search again")
                    searchOnce(3500)
                    delay(1200)
                    found = searchOnce(timeout.coerceAtMost(12000L))
                }

                found = dedupeDevicesByAddress(filterCastableDevices(found))
                if (found.isNotEmpty()) {
                    discoveryPrepared.set(true)
                }

                devices.clear()
                for (device in found) {
                    rememberDevice(device)
                }
                Log.i(tag, "discoverDevices done, count=${found.size}")
                resolveDiscover(invoke, found, lanIp, null)
            } catch (e: Exception) {
                Log.e(tag, "discoverDevices failed", e)
                resolveDiscover(invoke, emptyList(), lanIp, e.message ?: "discover devices failed")
            } finally {
                if (lockHeld) {
                    releaseMulticastLock()
                }
                if (networkBound) {
                    unbindNetwork()
                }
            }
        }
    }

    /**
     * 过滤路由器、WPS 网关等非 DLNA 投屏目标（如 Linksys 10.80.1.1）。
     */
    private fun rememberDevice(device: DLNACast.Device) {
        devices[device.id] = device
        if (device.address.isNotBlank()) {
            devices["addr:${device.address}"] = device
        }
    }

    private fun resolveDevice(deviceId: String, address: String?): DLNACast.Device? {
        devices[deviceId]?.let { return it }
        if (!address.isNullOrBlank()) {
            devices["addr:$address"]?.let { return it }
            devices.values.firstOrNull { it.address == address }?.let { return it }
        }
        return devices.values.firstOrNull { it.id == deviceId }
    }

    private fun deviceNameScore(device: DLNACast.Device): Int {
        val name = device.name.trim().lowercase()
        if (name.isEmpty() || name == "dlna device" || name == "unknown") {
            return if (device.isTV) 10 else 0
        }
        var score = name.length
        if (device.isTV) {
            score += 200
        }
        return score
    }

    /** 同一 IP 可能先返回占位名再返回友好名，保留名称更完整的一条 */
    private fun dedupeDevicesByAddress(list: List<DLNACast.Device>): List<DLNACast.Device> {
        val byAddress = linkedMapOf<String, DLNACast.Device>()
        for (device in list) {
            val key = device.address.ifBlank { device.id }
            val existing = byAddress[key]
            if (existing == null || deviceNameScore(device) > deviceNameScore(existing)) {
                byAddress[key] = device
            }
        }
        return byAddress.values.toList()
    }

    private fun filterCastableDevices(list: List<DLNACast.Device>): List<DLNACast.Device> {
        val excludeIdKeywords = listOf(
            "wps_device",
            "internetgatewaydevice",
            "internetgateway",
            "wandevice",
            "landevice",
            "wirelessaccesspoint",
            "printer",
            "scanner",
            "bridge",
            "urn:schemas-wifialliance-org",
        )
        val excludeNameKeywords = listOf(
            "linksys",
            "netgear",
            "tp-link",
            "tplink",
            "asus",
            "router",
            "gateway",
            "openwrt",
        )

        return list.filter { device ->
            val id = device.id.lowercase()
            val name = device.name.lowercase()

            if (excludeIdKeywords.any { id.contains(it) }) {
                return@filter false
            }
            if (!device.isTV && excludeNameKeywords.any { name.contains(it) }) {
                return@filter false
            }
            if (device.isTV) {
                return@filter true
            }
            if (id.contains("mediarenderer") || id.contains("media_renderer")) {
                return@filter true
            }
            // 音箱等非电视 DMR：保留标准 description，排除网关 .1
            if (id.contains("description.xml") && !device.address.endsWith(".1")) {
                return@filter true
            }
            if (!device.isTV && device.address.endsWith(".1")) {
                return@filter false
            }
            false
        }
    }

    private fun resolveDiscover(
        invoke: Invoke,
        found: List<DLNACast.Device>,
        lanIp: String?,
        error: String?,
    ) {
        val arr = app.tauri.plugin.JSArray()
        for (device in found) {
            val item = JSObject()
            item.put("id", device.id)
            item.put("name", device.name)
            item.put("address", device.address)
            item.put("isTv", device.isTV)
            arr.put(item)
        }
        invoke.resolve(JSObject().apply {
            put("devices", arr)
            put("lanIp", lanIp)
            if (error != null) {
                put("error", error)
            }
        })
    }

    @Command
    fun castMedia(invoke: Invoke) {
        val args = invoke.parseArgs(CastMediaArgs::class.java)

        scope.launch {
            var lockHeld = false
            var networkBound = false
            try {
                networkBound = bindToWifiNetwork() != null
                lockHeld = acquireMulticastLock()
                initDlna()

                var device = resolveDevice(args.deviceId, args.deviceAddress)
                if (device == null) {
                    Log.w(tag, "device not in cache, quick SSDP search")
                    val found = try {
                        withTimeout(8000L) {
                            DLNACast.search(5000)
                        }
                    } catch (e: TimeoutCancellationException) {
                        Log.w(tag, "quick search timed out", e)
                        emptyList()
                    }
                    val candidates = dedupeDevicesByAddress(filterCastableDevices(found))
                    device = candidates.find { it.id == args.deviceId }
                        ?: candidates.find {
                            !args.deviceAddress.isNullOrBlank() && it.address == args.deviceAddress
                        }
                        ?: candidates.maxByOrNull { deviceNameScore(it) }
                    if (device != null) {
                        rememberDevice(device)
                    }
                }

                if (device == null) {
                    resolveCastMedia(invoke, false, "设备未找到，请重新搜索后再试")
                    return@launch
                }

                resetPlaybackProgressCache()
                val success = castToDeviceWithVerification(device, args.url, args.title)
                resolveCastMedia(
                    invoke,
                    success,
                    if (success) {
                        null
                    } else {
                        "电视未开始播放，请确认电视已开机、息屏可唤醒，且与手机在同一 Wi-Fi"
                    },
                )
            } catch (e: Exception) {
                Log.e(tag, "castMedia failed", e)
                resolveCastMedia(invoke, false, e.message ?: "cast failed")
            } finally {
                if (lockHeld) {
                    releaseMulticastLock()
                }
                if (networkBound) {
                    unbindNetwork()
                }
            }
        }
    }

    /**
     * 并行发起投屏并轮询 GetPositionInfo（getProgressRealtime）。
     * 息屏时 castToDevice 可能挂起，但电视已开始播；以进度/时长为准，不盲目超时判成功。
     */
    private suspend fun castToDeviceWithVerification(
        device: DLNACast.Device,
        url: String,
        title: String?,
    ): Boolean = coroutineScope {
        val castDeferred: Deferred<Boolean?> = async(Dispatchers.IO) {
            try {
                withTimeout(castMediaTimeoutMs) {
                    DLNACast.castToDevice(device, url, title)
                }
            } catch (e: TimeoutCancellationException) {
                Log.w(tag, "castToDevice timed out, verifying playback via GetPositionInfo", e)
                null
            } catch (e: Exception) {
                Log.w(tag, "castToDevice failed, will still verify playback", e)
                null
            }
        }

        val deadline = System.currentTimeMillis() + castVerifyTotalMs
        var castReturnedFalseAt = 0L

        while (System.currentTimeMillis() < deadline) {
            if (isPlaybackActive()) {
                Log.i(tag, "cast verified: playback active")
                castDeferred.cancel()
                return@coroutineScope true
            }

            if (castDeferred.isCompleted) {
                val castResult = try {
                    if (castDeferred.isCancelled) {
                        null
                    } else {
                        castDeferred.await()
                    }
                } catch (_: Exception) {
                    null
                }
                when (castResult) {
                    true -> {
                        Log.i(tag, "castToDevice returned true")
                        return@coroutineScope true
                    }
                    false -> {
                        if (castReturnedFalseAt == 0L) {
                            castReturnedFalseAt = System.currentTimeMillis()
                            Log.w(tag, "castToDevice returned false, keep polling progress")
                        } else if (System.currentTimeMillis() - castReturnedFalseAt > castVerifyAfterFalseMs) {
                            return@coroutineScope false
                        }
                    }
                    null -> { /* 超时/异常：继续轮询 */ }
                }
            }

            delay(castVerifyPollMs)
        }

        val lastCheck = isPlaybackActive()
        if (lastCheck) {
            Log.i(tag, "cast verified at deadline: playback active")
        }
        lastCheck
    }

    /** 向电视查询当前进度/总时长，用于确认是否真正开始播放 */
    private suspend fun isPlaybackActive(): Boolean {
        return try {
            withContext(Dispatchers.IO) {
                withTimeout(castProgressQueryTimeoutMs) {
                    val progress = DLNACast.getProgressRealtime()
                    if (progress != null) {
                        val (currentMs, totalMs) = progress
                        val active = totalMs > 0L || currentMs > 500L
                        if (active) {
                            Log.d(tag, "playback probe: current=${currentMs}ms total=${totalMs}ms")
                        }
                        active
                    } else {
                        false
                    }
                }
            }
        } catch (e: Exception) {
            Log.d(tag, "playback probe failed: ${e.message}")
            false
        }
    }

    private fun resolveCastMedia(
        invoke: Invoke,
        success: Boolean,
        error: String?,
    ) {
        invoke.resolve(JSObject().apply {
            put("success", success)
            if (error != null) {
                put("error", error)
            }
        })
    }

    @Command
    fun castControl(invoke: Invoke) {
        val args = invoke.parseArgs(CastControlArgs::class.java)
        scope.launch {
            try {
                val success = withContext(Dispatchers.IO) {
                    when (args.action) {
                        "play" -> DLNACast.play()
                        "pause" -> DLNACast.pause()
                        "stop" -> DLNACast.stop()
                        "seek" -> DLNACast.seek(args.value ?: 0L)
                        "setVolume" -> DLNACast.setVolume((args.value ?: 50L).toInt())
                        "mute" -> DLNACast.setMute((args.value ?: 1L) != 0L)
                        else -> false
                    }
                }
                invoke.resolve(JSObject().apply {
                    put("success", success)
                })
            } catch (e: Exception) {
                Log.e(tag, "castControl failed", e)
                invoke.reject(e.message ?: "cast control failed")
            }
        }
    }

    @Command
    fun getCastState(invoke: Invoke) {
        scope.launch {
            try {
                val state = DLNACast.getState()
                val progress = withContext(Dispatchers.IO) {
                    try {
                        withTimeout(castProgressQueryTimeoutMs) {
                            DLNACast.getProgressRealtime()
                        }
                    } catch (_: Exception) {
                        null
                    }
                }
                var positionMs = 0L
                var durationMs = 0L
                var isPlaying = false
                var hasFinished = false
                if (progress != null) {
                    positionMs = progress.first
                    durationMs = progress.second
                    if (durationMs > 0L) {
                        lastKnownPositionMs = positionMs
                        lastKnownDurationMs = durationMs
                        isPlaying = positionMs in 1_000 until (durationMs - 2_500)
                        hasFinished = positionMs >= durationMs - 2_500
                    }
                } else if (lastKnownDurationMs > 0L) {
                    positionMs = lastKnownPositionMs
                    durationMs = lastKnownDurationMs
                    hasFinished = lastKnownPositionMs >= lastKnownDurationMs - 2_500
                    isPlaying = false
                    Log.d(
                        tag,
                        "getCastState: using cached progress pos=$positionMs dur=$durationMs finished=$hasFinished",
                    )
                }
                val playbackState = when {
                    !state.isConnected -> "stopped"
                    hasFinished -> "stopped"
                    isPlaying -> "playing"
                    durationMs > 0L && positionMs == 0L -> "stopped"
                    else -> state.playbackState.name.lowercase()
                }
                invoke.resolve(JSObject().apply {
                    put("isConnected", state.isConnected)
                    put("deviceId", state.currentDevice?.id)
                    put("deviceName", state.currentDevice?.name)
                    put("playbackState", playbackState)
                    put("positionMs", positionMs)
                    put("durationMs", durationMs)
                    put("isPlaying", isPlaying)
                    put("hasFinished", hasFinished)
                })
            } catch (e: Exception) {
                Log.e(tag, "getCastState failed", e)
                invoke.reject(e.message ?: "get cast state failed")
            }
        }
    }

    @Command
    fun stopCast(invoke: Invoke) {
        scope.launch {
            try {
                val success = withContext(Dispatchers.IO) {
                    DLNACast.stop()
                }
                resetPlaybackProgressCache()
                DLNACast.clearProgressCache()
                invoke.resolve(JSObject().apply {
                    put("success", success)
                })
            } catch (e: Exception) {
                Log.e(tag, "stopCast failed", e)
                invoke.reject(e.message ?: "stop cast failed")
            }
        }
    }

    @Command
    fun getLanIp(invoke: Invoke) {
        try {
            val ip = getLanIpAddress()
            invoke.resolve(JSObject().apply {
                put("ip", ip)
            })
        } catch (e: Exception) {
            Log.e(tag, "getLanIp failed", e)
            invoke.reject(e.message ?: "get lan ip failed")
        }
    }

    private fun getLanIpAddress(): String? {
        val wifiManager =
            activity.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val dhcpIp = wifiManager?.connectionInfo?.ipAddress ?: 0
            if (dhcpIp != 0) {
                return String.format(
                    "%d.%d.%d.%d",
                    dhcpIp and 0xff,
                    dhcpIp shr 8 and 0xff,
                    dhcpIp shr 16 and 0xff,
                    dhcpIp shr 24 and 0xff,
                )
            }
        }

        val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
        for (networkInterface in interfaces) {
            if (!networkInterface.isUp || networkInterface.isLoopback) continue
            val name = networkInterface.name.lowercase()
            if (name.startsWith("wlan") || name.startsWith("wifi") || name.startsWith("eth")) {
                for (address in networkInterface.inetAddresses) {
                    if (address is Inet4Address && !address.isLoopbackAddress) {
                        val host = address.hostAddress
                        if (!host.isNullOrBlank() && !host.startsWith("169.254.")) {
                            return host
                        }
                    }
                }
            }
        }

        for (networkInterface in interfaces) {
            if (!networkInterface.isUp || networkInterface.isLoopback) continue
            for (address in networkInterface.inetAddresses) {
                if (address is Inet4Address && !address.isLoopbackAddress) {
                    val host = address.hostAddress
                    if (!host.isNullOrBlank() && !host.startsWith("169.254.")) {
                        return host
                    }
                }
            }
        }
        return null
    }
}
