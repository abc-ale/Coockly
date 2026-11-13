require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// El asistente ya no solo conversa: además de responder, le dice a la app QUÉ HACER
// (buscar una receta con lo que hay en la nevera, ajustar porciones, enviar a la lista…).
// La app ejecuta esa acción con la base de datos de Cookly y arma la tarjeta de la receta.
const INSTRUCCION_SISTEMA = `Eres "Chef Cookly", el asistente de cocina de la app Cookly. Hablas en español, con un tono cálido y breve, como un amigo en la cocina (máximo 3 líneas). Nunca uses abreviaciones de medidas ("cda", "gr", "ml"): escribe "cucharada", "gramos", "mililitros", porque tus respuestas se leen en voz alta. No uses emojis.

Tu trabajo principal: el usuario te dice qué ingredientes tiene y la app le propone una receta de su base de datos. Tú NO inventes recetas ni cantidades: de eso se encarga la app. Tú entiendes lo que pide y devuelves SIEMPRE un JSON válido, sin texto fuera del JSON, con esta forma exacta:

{
  "texto": "respuesta corta y cálida para el usuario",
  "accion": "ninguna" | "buscar_receta" | "otra_receta" | "cambiar_ingrediente" | "porciones" | "enviar_lista",
  "ingredientes": [],
  "excluir": [],
  "porciones": null
}

Cuándo usar cada acción:
- "buscar_receta": el usuario dice qué ingredientes tiene o pide una receta con algo. Pon en "ingredientes" lo que tiene (nombres en minúscula y en singular: "pollo", "arroz", "zanahoria", "papa"). Si pide solo una idea general (por ejemplo "algo rápido" o "un postre") y no menciona ingredientes, deja "ingredientes" vacío y usa "ninguna" con una pregunta breve pidiéndole qué tiene.
- "otra_receta": quiere ver otra opción distinta a la propuesta.
- "cambiar_ingrediente": no tiene o no quiere un ingrediente, o quiere reemplazarlo. Pon en "excluir" lo que NO usará y en "ingredientes" lo que tiene en su lugar (si lo dijo).
- "porciones": quiere la receta para otro número de personas. Pon el número en "porciones".
- "enviar_lista": quiere mandar los ingredientes de la receta a su lista de compras.
- "ninguna": cualquier otra cosa (saludos, dudas de cocina, consejos, sustituciones). Ahí "texto" es tu respuesta completa.

REGLAS ESTRICTAS (muy importante):
- NUNCA escribas recetas, pasos, listas numeradas, cantidades ni ingredientes con medidas en "texto". Eso lo muestra la app con su tarjeta. Tu "texto" son como máximo 2 frases cortas (menos de 200 caracteres), sin saltos de línea.
- Si el usuario menciona ingredientes que tiene (aunque sea "tengo pollo y arroz"), la acción es SIEMPRE "buscar_receta" con esos ingredientes, nunca "ninguna".
- Si pide una receta completa o los pasos, responde con "buscar_receta" (o "otra_receta" si ya hay una propuesta) y dile que la verá en la tarjeta.
- Mantén esta forma de responder igual de breve durante TODA la conversación, aunque los mensajes anteriores sean largos.
- Responde SIEMPRE a lo que el usuario acaba de decir. No repitas el saludo ni vuelvas a presentarte después del primer mensaje.
- Si el contexto trae "Datos de la receta en pantalla" y el usuario pregunta por ella (cuánto tarda, qué lleva, cuántos pasos), contesta usando SOLO esos datos con acción "ninguna". Si el dato no está ahí, dile con honestidad que lo vea en la tarjeta con "Ver receta"; nunca lo inventes.
- Si no hay receta en pantalla y pregunta por "la receta", pídele que primero te cuente qué ingredientes tiene.
- Si el mensaje no tiene que ver con cocina, responde amable en una frase y vuelve a preguntarle qué tiene en la nevera.

Ejemplos (solo el JSON):
Usuario: "tengo huevo y papa" -> {"texto":"¡Qué buena combinación! Déjame buscarte algo rico.","accion":"buscar_receta","ingredientes":["huevo","papa"],"excluir":[],"porciones":null}
Usuario: "mejor sin cebolla, tengo pimiento" (con receta en pantalla) -> {"texto":"Listo, la cambio por pimiento.","accion":"cambiar_ingrediente","ingredientes":["pimiento"],"excluir":["cebolla"],"porciones":null}
Usuario: "ahora para 6" (con receta en pantalla) -> {"texto":"Perfecto, ajusto todo para seis personas.","accion":"porciones","ingredientes":[],"excluir":[],"porciones":6}
Usuario: "¿cuánto demora?" (con receta de 40 minutos en pantalla) -> {"texto":"Esta receta toma unos 40 minutos en total.","accion":"ninguna","ingredientes":[],"excluir":[],"porciones":null}

Para las acciones distintas de "ninguna", "texto" es solo una frase corta de acompañamiento; la app añadirá el nombre de la receta y los detalles. No menciones nombres de recetas concretas en "texto".`;

function extraerJson(crudo) {
  if (!crudo) return null;
  try {
    return JSON.parse(crudo);
  } catch (_) {
    const m = crudo.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (_) {}
    }
  }
  return null;
}

/** Deja una respuesta corta: sin saltos de línea ni pasos numerados, máximo `max` caracteres (cortando en una frase). */
function resumirTexto(t, max = 220) {
  let limpio = String(t || '').replace(/\s*\n+\s*/g, ' ').replace(/\s+\d+\.\s+.*/, '').trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max);
  const punto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  return (punto > 40 ? corte.slice(0, punto + 1) : corte.replace(/\s+\S*$/, '') + '…').trim();
}

// Se puede cambiar sin tocar el código: en Render > Environment > GROQ_MODEL.
const MODELO = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const ACCIONES = ['ninguna', 'buscar_receta', 'otra_receta', 'cambiar_ingrediente', 'porciones', 'enviar_lista'];
const lista = (x) => (Array.isArray(x) ? x.map((s) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 15) : []);

app.post('/chat', async (req, res) => {
  try {
    const { mensajes, contexto } = req.body;

    if (!mensajes || !Array.isArray(mensajes)) {
      return res.status(400).json({ error: 'Formato inválido, se espera { mensajes: [...] }' });
    }

    // Lo que la app ya sabe de la conversación (para entender "otra", "para 8", "sin zanahoria"…).
    let ctx = '';
    if (contexto && typeof contexto === 'object') {
      const partes = [];
      if (contexto.receta) partes.push(`Receta propuesta ahora: ${contexto.receta}`);
      if (contexto.personas) partes.push(`Cantidades para ${contexto.personas} personas`);
      if (Array.isArray(contexto.ingredientes) && contexto.ingredientes.length) partes.push(`Ingredientes que dijo tener: ${contexto.ingredientes.join(', ')}`);
      if (Array.isArray(contexto.noTiene) && contexto.noTiene.length) partes.push(`Ingredientes que NO tiene (nunca los propongas): ${contexto.noTiene.join(', ')}`);
      const d = contexto.detalle;
      if (d && typeof d === 'object') {
        const datos = [];
        if (d.minutos) datos.push(`tiempo: ${d.minutos} minutos`);
        if (d.pasos) datos.push(`${d.pasos} pasos`);
        if (Array.isArray(d.ingredientes) && d.ingredientes.length) datos.push(`ingredientes: ${d.ingredientes.slice(0, 25).map((x) => String(x).slice(0, 40)).join(', ')}`);
        if (datos.length) partes.push(`Datos de la receta en pantalla (${datos.join('; ')})`);
      }
      if (partes.length) ctx = `\n\nContexto de la conversación: ${partes.join('. ')}.`;
    }

    const messages = [
      { role: 'system', content: INSTRUCCION_SISTEMA + ctx },
      // Solo lo reciente, y las respuestas largas del asistente se recortan para que no "contagien" el estilo.
      ...mensajes.slice(-6).map((m) => ({
        role: m.esUsuario ? 'user' : 'assistant',
        content: m.esUsuario ? String(m.texto ?? '').slice(0, 400) : resumirTexto(String(m.texto ?? ''), 160),
      })),
    ];

    if (!process.env.GROQ_API_KEY) {
      console.log('FALTA GROQ_API_KEY en las variables de entorno');
      return res.status(500).json({ error: 'Chatbot sin configurar' });
    }

    // Si Groq tarda demasiado, se corta y la app usa su plan B en vez de dejar al usuario esperando.
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), 12000);
    let response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: corte.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODELO,
          messages,
          temperature: 0.2,
          max_tokens: 700,
          reasoning_effort: 'low',
          response_format: { type: 'json_object' },
        }),
      });
    } finally {
      clearTimeout(reloj);
    }

    const data = await response.json();
    const crudo = data?.choices?.[0]?.message?.content;

    if (!crudo) {
      console.log('RESPUESTA SIN TEXTO DE GROQ:', JSON.stringify(data));
      return res.status(502).json({ error: 'Groq no devolvió texto' });
    }

    const json = extraerJson(crudo);
    if (!json) {
      // Si no vino JSON, se devuelve como charla normal.
      return res.json({ texto: resumirTexto(crudo), accion: 'ninguna', ingredientes: [], excluir: [], porciones: null });
    }

    const porciones = Number(json.porciones);
    res.json({
      texto: resumirTexto(json.texto),
      accion: ACCIONES.includes(json.accion) ? json.accion : 'ninguna',
      ingredientes: lista(json.ingredientes),
      excluir: lista(json.excluir),
      porciones: Number.isFinite(porciones) && porciones > 0 ? Math.round(porciones) : null,
    });
  } catch (error) {
    console.log('ERROR EN /chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/salud', (req, res) => {
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.send('Cookly chatbot funcionando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));