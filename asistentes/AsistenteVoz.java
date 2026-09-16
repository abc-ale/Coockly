package com.cookly.asistentes;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import java.util.ArrayList;
import java.util.Locale;

/** Envoltorio ligero de SpeechRecognizer/TTS; la UI decide qué hacer con el texto. */
public class AsistenteVoz {
    private final SpeechRecognizer reconocimiento;
    private TextToSpeech lectura;

    public AsistenteVoz(Context contexto, Listener listener) {
        reconocimiento = SpeechRecognizer.createSpeechRecognizer(contexto);
        reconocimiento.setRecognitionListener(new RecognitionListener() {
            @Override public void onResults(Bundle resultados) {
                ArrayList<String> textos = resultados.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (textos != null && !textos.isEmpty()) listener.textoReconocido(textos.get(0));
            }
            @Override public void onError(int error) { listener.error("No entendí el audio. Inténtalo otra vez."); }
            @Override public void onReadyForSpeech(Bundle b) { }
            @Override public void onBeginningOfSpeech() { }
            @Override public void onRmsChanged(float v) { }
            @Override public void onBufferReceived(byte[] b) { }
            @Override public void onEndOfSpeech() { }
            @Override public void onPartialResults(Bundle b) { }
            @Override public void onEvent(int a, Bundle b) { }
        });
        lectura = new TextToSpeech(contexto, estado -> {
            if (estado == TextToSpeech.SUCCESS) lectura.setLanguage(new Locale("es", "ES"));
        });
    }

    public void escuchar() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES");
        reconocimiento.startListening(intent);
    }

    public void hablar(String texto) { if (lectura != null) lectura.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "cookly-respuesta"); }
    public void liberar() { reconocimiento.destroy(); if (lectura != null) lectura.shutdown(); }
    public interface Listener { void textoReconocido(String texto); void error(String mensaje); }
}