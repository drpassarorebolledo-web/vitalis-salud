const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar la API de Gemini con la clave de entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint para procesar las consultas clínicas
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "Eres un asistente médico experto en medicina general y familiar, apoyando al Dr. Anthony José Passaro Rebolledo en la plataforma Vitalis Salud."
            }
        });

        res.json({ success: true, text: response.text });
    } catch (error) {
        console.error("Error al procesar con Gemini:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Configuración del puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Vitalis Salud activo en puerto ${PORT}`);
});
