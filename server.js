const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(contents) {
    const modelName = 'gemini-2.5-flash';
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: contents
            });
            return response.text;
        } catch (err) {
            attempts++;
            console.warn(`Intento ${attempts} fallido. Reintentando...`);
            if (attempts >= maxAttempts) throw err;
            await delay(1500);
        }
    }
}

// Endpoint para procesar el audio de la consulta médica
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
2. Filtra comentarios irrelevantes o ruido de fondo.
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

        const contents = [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: audioBase64
                }
            },
            { text: prompt }
        ];

        const textResult = await generateWithRetry(contents);
        res.json({ success: true, text: textResult });
    } catch (error) {
        console.error("Error procesando audio:", error);
        res.status(500).json({ 
            success: false, 
            error: "La API está experimentando tráfico alto. Por favor, reintente en unos segundos." 
        });
    }
});

// Endpoint para estructurar y desglosar documentos médicos en formato HTML limpio
app.post('/api/format-doc', async (req, res) => {
    try {
        const { text, type, patient } = req.body;
        const prompt = `Eres un asistente médico profesional para el Dr. Anthony José Passaro Rebolledo (Medicina General y Familiar) en Vitalis Salud.
Toma el siguiente dictado o texto sobre un(a) ${type} del paciente ${patient}:
"${text}"

REGLAS DE FORMATEO OBLIGATORIAS:
1. Desglosa cada elemento (medicamento, dosis, frecuencia, indicación o examen) en una línea separada y numerada o con viñeta.
2. Si se trata de una receta, escribe el nombre del medicamento en negrita (ej: **Paracetamol 500 mg**) y las indicaciones abajo o al lado claramente visibles.
3. Si en el dictado vino el nombre o RUT del paciente dentro del texto, elimínalo de las indicaciones (solo deja el contenido propio del documento).
4. Separa cada ítem con un espacio visual claro (<br><br> o párrafos HTML separadas).
5. Devuelve directamente el resultado estructurado en HTML sin rodeos ni saludos.`;

        const textResult = await generateWithRetry(prompt);
        res.json({ success: true, text: textResult });
    } catch (error) {
        console.error("Error formateando documento:", error);
        res.status(500).json({ success: false, error: error.message || error.toString() });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Vitalis Salud activo en puerto ${PORT}`);
});
