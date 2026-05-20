package com.skooda.mobile

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONObject
import java.io.File
import java.lang.Exception

class IntegrityManager(private val context: Context) {

    fun checkIntegrity(): String {
        val rootPaths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/working/bin/su",
            "/system/bin/failsafe/su",
            "/system/bin/write_properties"
        )

        var suBinaryFound = false
        for (path in rootPaths) {
            if (File(path).exists()) {
                suBinaryFound = true
                break
            }
        }

        val buildTags = Build.TAGS
        val isTestKeys = buildTags != null && buildTags.contains("test-keys")

        var suExecSuccess = false
        var process: Process? = null
        try {
            process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
            val exitCode = process.waitFor()
            if (exitCode == 0) suExecSuccess = true
        } catch (e: Exception) {
            try {
                process = Runtime.getRuntime().exec("su")
                suExecSuccess = true
            } catch (e2: Exception) {}
        } finally {
            process?.destroy()
        }

        var xposedDetected = false
        try {
            Class.forName("de.robv.android.xposed.XposedBridge")
            xposedDetected = true
        } catch (e: Exception) {}

        var magiskDetected = false
        val magiskPaths = arrayOf(
            "/data/adb/magisk",
            "/data/adb/magisk.db"
        )
        for (path in magiskPaths) {
            if (File(path).exists()) {
                magiskDetected = true
                break
            }
        }

        val isRooted = suBinaryFound || isTestKeys || suExecSuccess || xposedDetected || magiskDetected

        val response = JSONObject()
        response.put("rooted", isRooted)
        response.put("su_binary", suBinaryFound)
        response.put("test_keys", isTestKeys)
        response.put("su_exec", suExecSuccess)
        response.put("xposed", xposedDetected)
        response.put("magisk", magiskDetected)

        return response.toString()
    }
}
