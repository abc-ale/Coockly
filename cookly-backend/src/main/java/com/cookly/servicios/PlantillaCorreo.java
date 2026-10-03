package com.cookly.servicios;

/**
 * Plantilla HTML del correo de recuperación de contraseña.
 * Usa tablas y estilos en línea para compatibilidad con clientes de correo.
 */
public final class PlantillaCorreo {

    private PlantillaCorreo() {}

    public static String recuperacion(String nombre, String enlace) {
        String primero = primerNombre(nombre);
        String saludo = primero.isEmpty()
                ? "Hola,"
                : "Hola <strong>" + esc(primero) + "</strong>,";

        return RECUPERACION
                .replace("{{SALUDO}}", saludo)
                .replace("{{ENLACE}}", esc(enlace));
    }

    private static String primerNombre(String nombre) {
        if (nombre == null) return "";

        String limpio = nombre.trim();

        if (limpio.isEmpty() || limpio.contains("@")) {
            return "";
        }

        return limpio.split("\\s+")[0];
    }

    private static String esc(String texto) {
        return texto
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private static final String RECUPERACION = """
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Restablece tu contraseña</title>
</head>
<body style="margin:0;padding:0;background-color:#FFF8F9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF8F9;padding:24px 12px;">
<tr><td align="center">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:#FFFFFF;border:1px solid #F3D6DD;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

  <tr><td align="center" style="background-color:#C25B70;padding:28px 24px;">
    <div style="font-size:28px;font-weight:bold;color:#FFFFFF;letter-spacing:0.5px;">Cookly</div>
    <div style="font-size:13px;color:#FBE4EA;margin-top:8px;line-height:1.5;">Calculamos por ti. T&uacute; solo preoc&uacute;pate de cocinar.</div>
  </td></tr>

  <tr><td style="padding:32px 30px 8px 30px;color:#2E2024;">
    <h1 style="margin:0 0 18px 0;font-size:24px;line-height:1.3;color:#2E2024;">Restablece tu contrase&ntilde;a</h1>
    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">{{SALUDO}}</p>
    <p style="margin:0 0 26px 0;font-size:16px;line-height:1.6;">Recibimos una solicitud para cambiar la contrase&ntilde;a de tu cuenta de Cookly. Pulsa el bot&oacute;n para elegir una nueva.</p>
  </td></tr>

  <tr><td align="center" style="padding:0 30px 28px 30px;">
    <a href="{{ENLACE}}" style="display:inline-block;background-color:#C25B70;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:bold;padding:15px 40px;border-radius:999px;">Cambiar contrase&ntilde;a</a>
  </td></tr>

  <tr><td style="padding:0 30px 24px 30px;">
    <div style="background-color:#FFF6E5;border:1px solid #F5D9A8;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:#8A4B00;">
      <strong>Este enlace vence en 15 minutos</strong> y solo se puede usar una vez. Si vence, solicita uno nuevo desde la pantalla de inicio de sesi&oacute;n.
    </div>
  </td></tr>

  <tr><td style="padding:0 30px 24px 30px;font-size:13px;line-height:1.6;color:#8C7378;">
    &iquest;El bot&oacute;n no funciona? Copia y pega este enlace en tu navegador:<br>
    <a href="{{ENLACE}}" style="color:#C25B70;word-break:break-all;">{{ENLACE}}</a>
  </td></tr>

  <tr><td style="padding:0 30px;"><div style="border-top:1px solid #F3D6DD;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

  <tr><td style="padding:22px 30px 30px 30px;font-size:14px;line-height:1.6;color:#2E2024;">
    <strong>&iquest;No fuiste t&uacute;?</strong> Ignora este mensaje. Tu contrase&ntilde;a seguir&aacute; siendo la misma y nadie podr&aacute; cambiarla sin este enlace.
  </td></tr>

  <tr><td align="center" style="background-color:#FFF8F9;padding:18px 24px;font-size:12px;line-height:1.6;color:#8C7378;">
    Este es un mensaje autom&aacute;tico, por favor no respondas a este correo.<br>
    &copy; Cookly
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>
""";
}