package qa.dohatv.app

import android.annotation.SuppressLint
import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val qatarPrayerApiHost = "meiaservicesext.islam.gov.qa"
    private val qatarPrayerApiPath = "/ServicesBrokerGatewayAPI/api/PrayerTimes"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemUi()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(7, 19, 29))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.loadsImagesAutomatically = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                    val uri = request?.url ?: return null
                    if (uri.host == qatarPrayerApiHost && uri.path == qatarPrayerApiPath &&
                        request.method.equals("GET", ignoreCase = true)) {
                        return fetchQatarPrayerTimes(uri)
                    }
                    return assetLoader.shouldInterceptRequest(uri)
                }
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val host = request?.url?.host ?: return true
                    return host != "appassets.androidplatform.net" &&
                        host != "www.aljazeera.net" && host != "aljazeera.net" &&
                        host != "pixabay.com" && host != "www.pixabay.com"
                }
            }
            webChromeClient = WebChromeClient()
        }
        setContentView(webView)
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    private fun fetchQatarPrayerTimes(uri: Uri): WebResourceResponse {
        val headers = mapOf(
            "Access-Control-Allow-Origin" to "https://appassets.androidplatform.net",
            "Vary" to "Origin",
            "Cache-Control" to "no-store"
        )
        val connection = URL(uri.toString()).openConnection() as HttpURLConnection
        connection.connectTimeout = 10_000
        connection.readTimeout = 10_000
        connection.requestMethod = "GET"
        connection.setRequestProperty("Accept", "application/json")

        return try {
            val statusCode = connection.responseCode
            val bodyStream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
            val body = bodyStream?.use { it.readBytes() } ?: ByteArray(0)
            WebResourceResponse(
                "application/json",
                "UTF-8",
                statusCode,
                connection.responseMessage ?: "OK",
                headers,
                ByteArrayInputStream(body)
            )
        } catch (error: IOException) {
            WebResourceResponse(
                "application/json",
                "UTF-8",
                502,
                "Bad Gateway",
                headers,
                ByteArrayInputStream("""{"error":"Qatar Awqaf prayer service unavailable"}""".toByteArray())
            )
        } finally {
            connection.disconnect()
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_LEFT -> { sendKey("ArrowLeft"); return true }
                KeyEvent.KEYCODE_DPAD_RIGHT -> { sendKey("ArrowRight"); return true }
                KeyEvent.KEYCODE_DPAD_UP -> { sendKey("ArrowUp"); return true }
                KeyEvent.KEYCODE_DPAD_DOWN -> { sendKey("ArrowDown"); return true }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> { sendKey("Enter"); return true }
                KeyEvent.KEYCODE_BACK -> {
                    if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else sendKey("Escape")
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun sendKey(key: String) {
        webView.evaluateJavascript("document.dispatchEvent(new KeyboardEvent('keydown',{key:'$key',bubbles:true}))", null)
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
