require('dotenv').config();

const express = require('express');
const { sendMessage } = require('./whatsapp');
const { procesarMensaje } = require('./conversaciones');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Evita procesar dos veces el mismo mensaje
const mensajesProcesados = new Set();

/**
 * Ruta principal
 */
app.get('/', (req, res) => {
    res.status(200).send('Fresh Cream Bot está funcionando 🍓');
});

/**
 * Healthcheck para Railway
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        ok: true,
        servicio: 'Fresh Cream Bot',
        timestamp: new Date().toISOString()
    });
});

/**
 * Verificación del webhook de WhatsApp
 */
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('VERIFICACION META:', {
        mode,
        hayToken: !!token,
        tokenCoincide: token === process.env.VERIFY_TOKEN,
        hayChallenge: !!challenge
    });

    if (
        mode === 'subscribe' &&
        token === process.env.VERIFY_TOKEN
    ) {
        console.log('Webhook verificado correctamente ✅');
        return res.status(200).send(challenge);
    }

    console.log('Error verificando webhook ❌');
    return res.sendStatus(403);
});

/**
 * Recepción de mensajes de WhatsApp
 */
app.post('/webhook', (req, res) => {
    // Respondemos inmediatamente a WhatsApp
    res.sendStatus(200);

    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];

        if (!message || message.type !== 'text') {
            return;
        }

        // Puede venir como número o como BSUID
        const identificador = message.from || message.from_user_id;
        const esBSUID = !message.from && !!message.from_user_id;

        const texto = message.text?.body;
        const messageId = message.id;

        if (!identificador || !texto || !messageId) {
            console.log('Mensaje recibido sin datos suficientes');
            return;
        }

        // Evita procesar mensajes duplicados
        if (mensajesProcesados.has(messageId)) {
            console.log('Mensaje duplicado ignorado');
            return;
        }

        mensajesProcesados.add(messageId);

        console.log(
            `Mensaje de ${identificador} (${esBSUID ? 'BSUID' : 'numero'}): ${texto}`
        );

        Promise.resolve(
            procesarMensaje(identificador, texto)
        )
            .then(respuesta => {
                return sendMessage(
                    identificador,
                    respuesta,
                    esBSUID
                );
            })
            .catch(error => {
                console.error(
                    'Error procesando o respondiendo mensaje:',
                    error
                );
            });

    } catch (error) {
        console.error('Error procesando webhook:', error);
    }
});

/**
 * Iniciar servidor
 */
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});