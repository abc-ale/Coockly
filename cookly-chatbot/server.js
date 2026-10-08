require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const INSTRUCCION_SISTEMA =
  'Eres el asistente de cocina de la app Cookly. Ayudas a los usuarios a decidir qué cocinar, sugieres recetas peruanas cuando sea posible, das consejos sobre sustitución de ingredientes y técnicas de cocina. Responde siempre en español, de forma breve, cálida y práctica (máximo 3-4 líneas). IMPORTANTE: nunca uses abreviaciones de medidas (como "cda", "cdta", "gr", "ml"); escribe siempre las palabras completas ("cucharada", "cucharadita", "gramos", "mililitros"), ya que tus respuestas se leen en voz alta. Usa un tono conversacional y cálido, como si hablaras con un amigo en la cocina.';

app.post('/chat', async (req, res) => {
  try {
    const { mensajes } = req.body;

    if (!mensajes || !Array.isArray(mensajes)) {
      return res.status(400).json({ error: 'Formato inválido, se espera { mensajes: [...] }' });
    }

    const messages = [
      { role: 'system', content: INSTRUCCION_SISTEMA },
      ...mensajes.map((m) => ({
        role: m.esUsuario ? 'user' : 'assistant',
        content: m.texto,
      })),
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const texto = data?.choices?.[0]?.message?.content;

    if (!texto) {
      console.log('RESPUESTA SIN TEXTO DE GROQ:', JSON.stringify(data));
      return res.status(502).json({ error: 'Groq no devolvió texto' });
    }

    res.json({ texto: texto.trim() });
  } catch (error) {
    console.log('ERROR EN /chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/', (req, res) => {
  res.send('Cookly backend funcionando ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));