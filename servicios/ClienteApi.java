package com.cookly.servicios;
import android.content.Context;
import com.cookly.BuildConfig;
import com.cookly.almacenamiento.AlmacenToken;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ClienteApi {
    public static ServicioApi crear(Context contexto) {
        AlmacenToken almacen = new AlmacenToken(contexto);

        OkHttpClient cliente = new OkHttpClient.Builder()
                // El backend gratuito de Render se "duerme" tras 15 min sin uso y
                // puede tardar 30-60s en responder la primera petición (cold start).
                // Los timeouts por defecto de OkHttp son de solo 10s, por eso fallaba.
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .addInterceptor(cadena -> {
                    Request.Builder solicitud = cadena.request().newBuilder();
                    String token = almacen.obtener();

                    if (token != null) {
                        solicitud.header("Authorization", "Bearer " + token);
                    }

                    return cadena.proceed(solicitud.build());
                })
                .build();

        return new Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(cliente)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ServicioApi.class);
    }
}