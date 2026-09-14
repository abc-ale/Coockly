# Retrofit/Gson necesitan conservar los modelos que llegan en JSON.
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.cookly.modelos.** { *; }
-keep interface com.cookly.servicios.ServicioApi { *; }
-dontwarn okhttp3.**
-dontwarn javax.annotation.**