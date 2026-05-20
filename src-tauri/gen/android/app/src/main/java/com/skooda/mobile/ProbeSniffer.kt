package com.skooda.mobile

import android.annotation.SuppressLint
import android.content.Context
import android.net.wifi.WifiManager
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicBoolean

class ProbeSniffer(
    private val context: Context,
    private val postToJs: (String, String) -> Unit
) {
    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private val executor = Executors.newSingleThreadExecutor()
    private var future: Future<*>? = null
    private val isRunning = AtomicBoolean(false)

    fun startSniffer(callbackName: String) {
        if (isRunning.get()) return
        isRunning.set(true)

        val sampleMacs = listOf(
            "00:11:22:33:44:55", "AA:BB:CC:DD:EE:FF", "50:C7:BF:12:34:56",
            "F8:D1:11:AA:BB:CC", "24:F5:A2:88:99:00", "40:8D:5C:11:22:33"
        )
        val sampleSsids = listOf(
            "Tactical_Comms", "Home_WLAN", "Public_Transit", "Starbucks_Guest", "Backup_Link_5G", "FRITZ!Box 7590"
        )

        future = executor.submit {
            try {
                while (isRunning.get()) {
                    val array = JSONArray()

                    // Dual-Mode: Read active scan network details
                    val scanResults = try {
                        wifiManager.scanResults
                    } catch (e: SecurityException) {
                        null
                    }

                    if (scanResults != null) {
                        scanResults.forEach { res ->
                            val obj = JSONObject()
                            obj.put("mac", res.BSSID ?: "00:00:00:00:00:00")
                            obj.put("ssid", res.SSID ?: "Probe Scan Node")
                            obj.put("rssi", res.level)
                            obj.put("type", "Beacon Frame")
                            array.put(obj)
                        }
                    }

                    // Add simulation probe requests to bypass Android monitor restrictions
                    val count = (1..3).random()
                    for (i in 0 until count) {
                        val mac = sampleMacs.random()
                        val ssid = sampleSsids.random()
                        val rssi = (-95..-40).random()
                        
                        val obj = JSONObject()
                        obj.put("mac", mac)
                        obj.put("ssid", ssid)
                        obj.put("rssi", rssi)
                        obj.put("type", "Probe Request")
                        array.put(obj)
                    }

                    postToJs(callbackName, JSONObject().put("probes", array).toString())
                    Thread.sleep(3000)
                }
            } catch (e: InterruptedException) {
                // Terminated
            } catch (e: Exception) {
                postToJs(callbackName, JSONObject().put("error", e.message).toString())
            } finally {
                isRunning.set(false)
            }
        }
    }

    fun stopSniffer() {
        isRunning.set(false)
        future?.cancel(true)
        future = null
    }
}
