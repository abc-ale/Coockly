import { Webhook } from "npm:standardwebhooks@1.0.0";

const hook = new Webhook(
  Deno.env.get("SEND_EMAIL_HOOK_SECRET")!.replace("v1,whsec_", "")
);

const asuntos: Record<string, string> = {
  signup: "Confirma tu correo en Coockly",
  recovery: "Restablece tu contraseña de Coockly",
  magiclink: "Tu enlace de acceso a Coockly",
  email_change: "Confirma tu nuevo correo en Coockly",
  invite: "Te invitaron a Coockly",
};

const textos: Record<string, string> = {
  signup: "Bienvenido a Coockly. Confirma tu correo para activar tu cuenta.",
  recovery: "Recibimos una solicitud para restablecer tu contraseña.",
  magiclink: "Usa este enlace para iniciar sesión.",
  email_change: "Confirma el cambio de tu correo.",
  invite: "Te invitaron a unirte a Coockly.",
};

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  try {
    const { user, email_data } = hook.verify(payload, headers) as any;
    const tipo: string = email_data.email_action_type;

    const link =
      `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify` +
      `?token=${email_data.token_hash}` +
      `&type=${tipo}` +
      `&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": Deno.env.get("BREVO_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Coockly",
          email: Deno.env.get("BREVO_SENDER_EMAIL")!,
        },
        to: [{ email: user.email }],
        subject: asuntos[tipo] ?? "Notificación de Coockly",
        htmlContent:
          `<p>${textos[tipo] ?? "Sigue este enlace para continuar."}</p>` +
          `<p><a href="${link}">Continuar</a></p>`,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: String(e) } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});