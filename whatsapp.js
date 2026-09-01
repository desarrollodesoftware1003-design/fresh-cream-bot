const axios = require('axios');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

async function sendMessage(destinatario, text, esBSUID = false) {
    const payload = {
        messaging_product: 'whatsapp',
        type: 'text',
        text: { body: text }
    };

    // Si el cliente tiene nombre de usuario activado, no hay número de teléfono,
    // se manda usando el identificador BSUID en el campo "recipient".
    // Si sí hay número normal, se usa el campo "to" de siempre.
    if (esBSUID) {
        payload.recipient = destinatario;
    } else {
        payload.to = destinatario;
    }

    try {
        await axios.post(
            `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Mensaje enviado ✅');
    } catch (error) {
        console.error('Error al enviar mensaje:', error.response?.data || error.message);

        // Si falla el envío por BSUID (porque tu cuenta aún no tiene esa función habilitada
        // en tu país), lo avisamos claramente en consola para saberlo rápido.
        if (esBSUID) {
            console.error('⚠️ El envío por BSUID pudo fallar porque tu cuenta de WhatsApp Business aún no tiene habilitado el envío a usuarios con nombre de usuario (función en despliegue gradual de Meta).');
        }
    }
}

module.exports = { sendMessage };