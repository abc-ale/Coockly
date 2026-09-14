package com.cookly.servicios;

import android.content.Context;

import com.cookly.BuildConfig;
import com.cookly.almacenamiento.AlmacenToken;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ClienteApi {
    public static ServicioApi crear(Context contexto) {
        AlmacenToken almacen = new AlmacenToken(contexto);

        OkHttpClient cliente = new OkHttpClient.Builder()
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
