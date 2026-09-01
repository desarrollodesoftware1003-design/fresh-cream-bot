require('dotenv').config();
const express = require('express');
const { sendMessage } = require('./whatsapp');
const { procesarMensaje } = require('./conversaciones');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const mensajesProcesados = new Set();

app.get('/', (req, res) => {
    res.send('Fresh Cream Bot está funcionando 🍓');
});

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('Webhook verificado correctamente ✅');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', (req, res) => {
    res.sendStatus(200);

    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message && message.type === 'text') {
        // Identificador del cliente: puede venir como número (from) o,
        // si el cliente activó "nombre de usuario" en WhatsApp, como BSUID (from_user_id)
        const identificador = message.from || message.from_user_id;
        const esBSUID = !message.from && !!message.from_user_id;
        const texto = message.text.body;
        const messageId = message.id;

        if (mensajesProcesados.has(messageId)) {
            console.log('Mensaje duplicado ignorado');
            return;
        }
        mensajesProcesados.add(messageId);

        console.log(`Mensaje de ${identificador} (${esBSUID ? 'BSUID' : 'numero'}): ${texto}`);

        Promise.resolve(procesarMensaje(identificador, texto)).then(respuesta => {
            sendMessage(identificador, respuesta, esBSUID);
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});