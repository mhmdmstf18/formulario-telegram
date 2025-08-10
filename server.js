const express = require('express');
const multer = require('multer'); // Multer ya no es estrictamente necesario si solo se envía JSON
const XLSX = require('xlsx');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();
const fs = require('fs'); // Para asegurar que el directorio 'uploads' exista

const app = express();
app.use(cors());
app.use(express.json()); // Middleware para parsear el cuerpo de las solicitudes como JSON
app.use('/archivos', express.static('uploads'));

// Asegurarse de que el directorio 'uploads' exista
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Multer ya no es necesario si el cliente envía JSON directamente
// const upload = multer(); 

async function enviarTelegram(mensaje) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: mensaje,
                parse_mode: 'HTML' // Opcional: para permitir formato HTML en el mensaje
            })
        });
        const data = await response.json();
        if (!data.ok) {
            console.error('Error al enviar mensaje a Telegram:', data);
            throw new Error(`Telegram API error: ${data.description}`);
        }
    } catch (error) {
        console.error('Error en la función enviarTelegram:', error);
        throw error; // Re-lanzar el error para que sea manejado por el bloque catch principal
    }
}

app.post('/api/registro', async (req, res) => { // Se eliminó upload.none()
    try {
        const data = req.body; // Los datos ya vienen parseados como JSON
        
        // Generar la contraseña si es necesario (ejemplo)
        let password = '';
        if (data.dni && data.nombre && data.dni.length >= 8 && data.nombre.length >= 3) {
            const dniPart = data.dni.substring(0, 8);
            const namePart = data.nombre.substring(0, 3).toLowerCase();
            password = dniPart + namePart;
        }
        data.password = password; // Añadir la contraseña a los datos

        // Generar el archivo Excel
        const ws = XLSX.utils.json_to_sheet([data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inscripción");

        const fileName = `inscripcion_${Date.now()}.xlsx`;
        const filePath = `uploads/${fileName}`;
        XLSX.writeFile(wb, filePath);

        // Construir el mensaje para Telegram
        const mensajeTelegram = `
<b>📢 Nuevo Registro de Curso</b>

<b>Nombre:</b> ${data.nombre}
<b>Apellidos:</b> ${data.apellidos}
<b>DNI:</b> ${data.dni}
<b>Email:</b> ${data.email}
<b>Curso Seleccionado:</b> ${data.curso}
<b>Contraseña Generada:</b> ${data.password}
<b>Fecha de Registro:</b> ${data.fecha}

Puedes descargar el archivo Excel aquí: ${process.env.SERVER_URL}/archivos/${fileName}
        `.trim(); // .trim() para eliminar espacios en blanco al inicio/final

        await enviarTelegram(mensajeTelegram);

        res.json({ success: true, message: 'Registro procesado y notificación enviada.' });
    } catch (error) {
        console.error('Error al procesar el registro:', error);
        res.status(500).json({ success: false, error: 'Error al procesar la solicitud: ' + error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
