package com.skooda.mobile

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast

class ScreenCaptureActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            val mpManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            @Suppress("DEPRECATION")
            startActivityForResult(mpManager.createScreenCaptureIntent(), REQUEST_CODE)
        } catch (e: Exception) {
            Toast.makeText(this, "SCR ERR onCreate: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                try {
                    val mpManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                    val projection = mpManager.getMediaProjection(resultCode, data)
                    if (projection == null) {
                        Toast.makeText(this, "SCR ERR: projection is null", Toast.LENGTH_LONG).show()
                        finish()
                        return
                    }
                    ScreenRecorderService.mediaProjection = projection
                    val serviceIntent = Intent(this, ScreenRecorderService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                    Toast.makeText(this, "SCR: Service gestartet", Toast.LENGTH_SHORT).show()
                    pendingCallback?.let { cb ->
                        ScreenRecorderService.jsCallback = cb
                    }
                } catch (e: Exception) {
                    Toast.makeText(this, "SCR ERR result: ${e.message}", Toast.LENGTH_LONG).show()
                }
            } else {
                Toast.makeText(this, "SCR: Abgelehnt (code=$resultCode)", Toast.LENGTH_SHORT).show()
            }
        }
        finish()
    }

    companion object {
        private const val REQUEST_CODE = 9999
        var pendingCallback: String? = null
    }
}
