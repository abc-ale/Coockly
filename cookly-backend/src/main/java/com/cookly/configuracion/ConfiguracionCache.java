package com.cookly.configuracion;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

/**
 * Caché del panel administrativo: los archivos (js, css, fuentes, imágenes) se guardan 7 días en el navegador,
 * así que desde la segunda visita no se vuelven a descargar. Los js y css llevan ?v=N, por eso al cambiar
 * el número el navegador pide la versión nueva. El index.html nunca se guarda: siempre se revisa.
 */
@Configuration
public class ConfiguracionCache implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registro) {
        registro.addResourceHandler("/admin/*.html")
                .addResourceLocations("classpath:/static/admin/")
                .setCacheControl(CacheControl.noCache());
        registro.addResourceHandler("/admin/**")
                .addResourceLocations("classpath:/static/admin/")
                .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());
    }
}