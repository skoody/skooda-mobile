package com.skooda.mobile

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.*

@SuppressLint("MissingPermission")
class MeshtasticBleManager(
    private val context: Context,
    private val postToJs: (String, String) -> Unit
) {
    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private var bluetoothGatt: BluetoothGatt? = null
    private val handler = Handler(Looper.getMainLooper())

    private val SERVICE_UUID = UUID.fromString("c51f183e-de03-11e5-b86d-9a79f06e947f")
    private val CHAR_TO_RADIO = UUID.fromString("f75c34e2-78a3-48b2-a0b5-779020f188d3")
    private val CHAR_FROM_RADIO = UUID.fromString("8ba2a70b-0075-4d54-bb5c-329ddec7e135")
    private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    private var txCharacteristic: BluetoothGattCharacteristic? = null
    private var rxCharacteristic: BluetoothGattCharacteristic? = null

    private var scanCallback: ScanCallback? = null

    fun startScan(callbackName: String) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            postToJs(callbackName, JSONObject().put("error", "Bluetooth disabled or unavailable").toString())
            return
        }

        val scanner = bluetoothAdapter.bluetoothLeScanner
        if (scanner == null) {
            postToJs(callbackName, JSONObject().put("error", "LE Scanner unavailable").toString())
            return
        }

        stopScan()

        val foundDevices = mutableSetOf<String>()
        val resultsArray = JSONArray()

        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val device = result.device
                val name = device.name ?: "Unknown Device"
                val address = device.address
                if (foundDevices.add(address)) {
                    val obj = JSONObject().put("name", name).put("address", address)
                    resultsArray.put(obj)
                    postToJs(callbackName, JSONObject().put("devices", resultsArray).toString())
                }
            }

            override fun onScanFailed(errorCode: Int) {
                postToJs(callbackName, JSONObject().put("error", "Scan failed: $errorCode").toString())
            }
        }

        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        scanner.startScan(listOf(filter), settings, scanCallback)

        handler.postDelayed({
            stopScan()
        }, 15000)
    }

    fun stopScan() {
        val scanner = bluetoothAdapter?.bluetoothLeScanner
        if (scanner != null && scanCallback != null) {
            scanner.stopScan(scanCallback)
            scanCallback = null
        }
    }

    fun connect(address: String, callbackName: String) {
        if (bluetoothAdapter == null) return
        val device = bluetoothAdapter.getRemoteDevice(address) ?: return

        disconnect()

        bluetoothGatt = device.connectGatt(context, false, object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    postToJs(callbackName, JSONObject().put("status", "connected").toString())
                    gatt.discoverServices()
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    postToJs(callbackName, JSONObject().put("status", "disconnected").toString())
                    txCharacteristic = null
                    rxCharacteristic = null
                    bluetoothGatt = null
                }
            }

            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    val service = gatt.getService(SERVICE_UUID)
                    if (service != null) {
                        txCharacteristic = service.getCharacteristic(CHAR_TO_RADIO)
                        rxCharacteristic = service.getCharacteristic(CHAR_FROM_RADIO)

                        if (rxCharacteristic != null) {
                            gatt.setCharacteristicNotification(rxCharacteristic, true)
                            val descriptor = rxCharacteristic!!.getDescriptor(CCCD_UUID)
                            if (descriptor != null) {
                                descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                                gatt.writeDescriptor(descriptor)
                            }
                        }
                        postToJs(callbackName, JSONObject().put("status", "ready").toString())
                    } else {
                        postToJs(callbackName, JSONObject().put("error", "Meshtastic service not found").toString())
                    }
                }
            }

            override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
                if (characteristic.uuid == CHAR_FROM_RADIO) {
                    val bytes = characteristic.value
                    if (bytes != null && bytes.isNotEmpty()) {
                        val hex = bytes.joinToString("") { String.format("%02x", it) }
                        val text = try {
                            val printable = bytes.filter { it in 32..126 }.toByteArray()
                            String(printable)
                        } catch (e: Exception) { "" }

                        postToJs(callbackName, JSONObject().put("message", hex).put("text", text).toString())
                    }
                }
            }
        })
    }

    fun disconnect() {
        bluetoothGatt?.disconnect()
        bluetoothGatt?.close()
        bluetoothGatt = null
        txCharacteristic = null
        rxCharacteristic = null
    }

    fun sendMessage(hexPayload: String, callbackName: String) {
        val gatt = bluetoothGatt
        val char = txCharacteristic
        if (gatt == null || char == null) {
            postToJs(callbackName, JSONObject().put("error", "Not connected to LoRa node").toString())
            return
        }

        val bytes = try {
            hexPayload.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        } catch (e: Exception) {
            hexPayload.toByteArray()
        }

        char.value = bytes
        char.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        val success = gatt.writeCharacteristic(char)
        if (!success) {
            postToJs(callbackName, JSONObject().put("error", "Write failed").toString())
        } else {
            postToJs(callbackName, JSONObject().put("sent", true).toString())
        }
    }
}
