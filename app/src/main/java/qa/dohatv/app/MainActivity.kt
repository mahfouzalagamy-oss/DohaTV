package qa.dohatv.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
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
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var quranRadioPlayer: MediaPlayer? = null
    private val qatarPrayerApiHost = "meiaservicesext.islam.gov.qa"
    private val qatarPrayerApiPath = "/ServicesBrokerGatewayAPI/api/PrayerTimes"
    private val quranRadioStations = mapOf(
        "qatar" to ("قطر" to "https://live.kwikmotion.com/qmcquranradiolive/quranradio/playlist.m3u8"),
        "egypt" to ("مصر" to "https://stream.radiojar.com/8s5u5tpdtwzuv")
    )

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
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    if (url?.let { Uri.parse(it).host } == "appassets.androidplatform.net") {
                        view?.addJavascriptInterface(TvBridge(), "AndroidTV")
                    } else {
                        view?.removeJavascriptInterface("AndroidTV")
                    }
                }

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
                    if (host == "appassets.androidplatform.net") {
                        return false
                    }
                    view?.removeJavascriptInterface("AndroidTV")
                    return host != "www.aljazeera.net" && host != "aljazeera.net" &&
                        host != "pixabay.com" && host != "www.pixabay.com"
                }
            }
            webChromeClient = WebChromeClient()
            addJavascriptInterface(TvBridge(), "AndroidTV")
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
        releaseQuranRadioPlayer()
        webView.destroy()
        super.onDestroy()
    }

    override fun onStop() {
        if (!isChangingConfigurations && !isFinishing) {
            releaseQuranRadioPlayer()
            finish()
        }
        super.onStop()
    }

    private fun playQuranRadio(stationId: String) {
        runOnUiThread {
            val station = quranRadioStations[stationId]
            if (station == null) {
                notifyQuranRadioState(false, "محطة إذاعة القرآن الكريم غير معروفة.")
                return@runOnUiThread
            }
            releaseQuranRadioPlayer()
            val player = MediaPlayer()
            quranRadioPlayer = player
            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            player.setOnPreparedListener { preparedPlayer ->
                if (quranRadioPlayer === preparedPlayer) {
                    preparedPlayer.start()
                    notifyQuranRadioState(true, "إذاعة القرآن الكريم في ${station.first} تعمل.")
                }
            }
            player.setOnErrorListener { failedPlayer, _, _ ->
                if (quranRadioPlayer === failedPlayer) quranRadioPlayer = null
                failedPlayer.release()
                notifyQuranRadioState(false, "تعذر الاتصال بإذاعة القرآن الكريم في ${station.first}.")
                true
            }
            try {
                player.setDataSource(station.second)
                player.prepareAsync()
            } catch (error: IOException) {
                releaseQuranRadioPlayer()
                notifyQuranRadioState(false, "تعذر تحميل إذاعة القرآن الكريم في ${station.first}.")
            } catch (error: IllegalStateException) {
                releaseQuranRadioPlayer()
                notifyQuranRadioState(false, "تعذر بدء إذاعة القرآن الكريم في ${station.first}.")
            }
        }
    }

    private fun stopQuranRadio() {
        runOnUiThread {
            releaseQuranRadioPlayer()
            notifyQuranRadioState(false, "تم إيقاف إذاعة القرآن الكريم.")
        }
    }

    private fun releaseQuranRadioPlayer() {
        quranRadioPlayer?.release()
        quranRadioPlayer = null
    }

    private fun notifyQuranRadioState(isPlaying: Boolean, message: String) {
        if (!::webView.isInitialized) return
        val state = if (isPlaying) "true" else "false"
        val safeMessage = JSONObject.quote(message)
        webView.post {
            webView.evaluateJavascript(
                "window.updateQuranRadioState?.($state, $safeMessage)",
                null
            )
        }
    }

    private inner class TvBridge {
        @JavascriptInterface
        fun playQuranRadio(stationId: String) {
            this@MainActivity.playQuranRadio(stationId)
        }

        @JavascriptInterface
        fun stopQuranRadio() {
            this@MainActivity.stopQuranRadio()
        }
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        try {
            context.startActivity(launchIntent)
        } catch (error: SecurityException) {
            Log.w("DohaTV", "Android TV blocked automatic launch after boot", error)
        }
    }
}
