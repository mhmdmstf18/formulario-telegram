const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/archivos', express.static('uploads'));

const upload = multer();

async function enviarTelegram(mensaje) {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: mensaje
        })
    });
}

app.post('/api/registro', upload.none(), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data);
        const ws = XLSX.utils.json_to_sheet([data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inscripción");

        const fileName = `inscripcion_${Date.now()}.xlsx`;
        const filePath = `uploads/${fileName}`;
        XLSX.writeFile(wb, filePath);

        const enlace = `${process.env.SERVER_URL}/archivos/${fileName}`;
        await enviarTelegram(`📢 Nuevo registro:\n${enlace}`);

        res.json({ success: true, enlace });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al procesar' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
