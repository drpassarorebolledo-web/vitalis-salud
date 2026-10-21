const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint para procesar el audio grabado
app.post('/api/process-audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se recibió ningún archivo de audio.' });
        }

        const audioBase64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'audio/webm';

        const prompt = `Eres un asistente médico experto que apoya al Dr. Anthony José Passaro Rebolledo en Medicina General y Familiar para Vitalis Salud.
Analiza la siguiente grabación de audio de la consulta médica:
1. Identifica y separa la voz del médico (Dr. Passaro) de la voz del paciente o acompañante.
2. Filtra comentarios irrelevantes o ruído de fondo.
3. Genera una Nota Clínica estructurada con el siguiente formato exacto:

[HISTORIA CLÍNICA - VITALIS SALUD]
• Motivo de consulta: ...
• Resumen de la consulta / Diálogo procesado:
  - Dr. Passaro: ...
  - Paciente: ...

[EXAMEN FÍSICO Y SÍNTOMAS]
• ...

[PLAN Y DIAGNÓSTICO]
• ...`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: audioBase64
                    }
                },
                { text: prompt }
            ]
        });

        res.json({ success: true, text: response.text });
    } catch (error) {
        console.error("Error procesando audio:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para dar formato a documentos (recetas, certificados, órdenes)
app.post('/api/format-doc', async (req, res) => {
    try {
        const { text, type, patient } = req.body;
        const prompt = `Eres un asistente para el Dr. Anthony José Passaro Rebolledo (Medicina General y Familiar) en Vitalis Salud.
Toma el siguiente dictado para un(a) ${type} del paciente ${patient}:
"${text}"

Estructúralo de forma profesional y limpia en español, corregido, formateado y listo para ser impreso en un documento oficial. Sin explicaciones adicionales, entrega solo el texto formateado.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        res.json({ success: true, text: response.text });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Vitalis Salud activo en puerto ${PORT}`);
});
