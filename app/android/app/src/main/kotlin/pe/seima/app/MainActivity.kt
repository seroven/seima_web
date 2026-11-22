package pe.seima.app

import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterFragmentActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "pe.seima.app/video")
            .setMethodCallHandler { call, result ->
                if (call.method != "recortar") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val ruta = call.argument<String>("ruta")
                val inicio = call.argument<Number>("inicioMs")?.toLong()
                val fin = call.argument<Number>("finMs")?.toLong()
                if (ruta.isNullOrEmpty() || inicio == null || fin == null || fin <= inicio) {
                    result.error("recorte", "El tramo no es válido.", null)
                    return@setMethodCallHandler
                }
                recortar(ruta, inicio, fin, result)
            }
    }

    @OptIn(UnstableApi::class)
    private fun recortar(ruta: String, inicio: Long, fin: Long, result: MethodChannel.Result) {
        val salida = File(cacheDir, "recorte-${System.currentTimeMillis()}.mp4")
        val item = MediaItem.Builder()
            .setUri(Uri.fromFile(File(ruta)))
            .setClippingConfiguration(
                MediaItem.ClippingConfiguration.Builder()
                    .setStartPositionMs(inicio)
                    .setEndPositionMs(fin)
                    .build(),
            )
            .build()
        val editado = EditedMediaItem.Builder(item)
            .setEffects(Effects(listOf(), listOf(Presentation.createForHeight(1080))))
            .build()
        var respondido = false
        val transformer = Transformer.Builder(this)
            .setVideoMimeType(MimeTypes.VIDEO_H264)
            .setAudioMimeType(MimeTypes.AUDIO_AAC)
            .addListener(object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    if (respondido) return
                    respondido = true
                    result.success(mapOf("ruta" to salida.absolutePath, "duracionMs" to (fin - inicio).toInt()))
                }

                override fun onError(
                    composition: Composition,
                    exportResult: ExportResult,
                    exportException: ExportException,
                ) {
                    if (respondido) return
                    respondido = true
                    salida.delete()
                    result.error("recorte", "No se pudo recortar el video.", null)
                }
            })
            .build()
        try {
            transformer.start(editado, salida.absolutePath)
        } catch (_: Exception) {
            if (!respondido) {
                respondido = true
                salida.delete()
                result.error("recorte", "No se pudo recortar el video.", null)
            }
        }
    }
}
