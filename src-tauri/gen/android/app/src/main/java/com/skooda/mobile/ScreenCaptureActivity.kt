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
                    val serviceIntent = Intent(this, ScreenRecorderService::class.java)
                    serviceIntent.putExtra("resultCode", resultCode)
                    serviceIntent.putExtra("data", data)
                    serviceIntent.putExtra("callback", pendingCallback)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                } catch (e: Exception) {
                    Toast.makeText(this, "SCR ERR result: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
        finish()
    }

    companion object {
        private const val REQUEST_CODE = 9999
        var pendingCallback: String? = null
    }
}
