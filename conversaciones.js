const menu = require('./menu');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ARCHIVO_PEDIDOS = path.join(DATA_DIR, 'pedidos.xlsx');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sesiones = {};

function obtenerSesion(numero) {
    if (!sesiones[numero]) {
        sesiones[numero] = { paso: 'inicio', pedido: {} };
    }
    return sesiones[numero];
}

function resetSesion(numero) {
    sesiones[numero] = { paso: 'inicio', pedido: {} };
}

function procesarMensaje(numero, texto) {
    const sesion = obtenerSesion(numero);
    const msg = texto.trim().toLowerCase();

    const enMenuPrincipal = ['inicio', 'menu_principal', 'menu_mostrado', 'faq', 'humano'].includes(sesion.paso);

    if (msg === 'menu' || msg === 'menú') {
        sesion.paso = 'menu_mostrado';
        return mostrarMenu();
    }

    if (enMenuPrincipal) {
        if (msg === 'pedido' || msg === '1') {
            sesion.paso = 'pedido_tamano';
            sesion.pedido = {};
            return '¿Qué tamaño quieres?\n' + listaTamanos();
        }
        if (msg === 'ayuda' || msg === '3') {
            sesion.paso = 'faq';
            return mostrarFAQ();
        }
        if (msg === 'persona' || msg === '4') {
            sesion.paso = 'humano';
            return 'Claro, en un momento alguien de nuestro equipo te atiende personalmente 🙋‍♀️';
        }
    }

    switch (sesion.paso) {
        case 'inicio':
            sesion.paso = 'menu_principal';
            return bienvenida();

        case 'menu_principal':
            return manejarMenuPrincipal(msg, sesion);

        case 'menu_mostrado':
            sesion.paso = 'menu_principal';
            return manejarMenuPrincipal(msg, sesion);

        case 'pedido_tamano':
            return manejarTamano(msg, sesion);

        case 'pedido_toppings':
            return manejarToppings(texto, sesion);

        case 'pedido_cantidad':
            return manejarCantidad(msg, sesion);

        case 'pedido_entrega':
            return manejarEntrega(msg, sesion);

        case 'pedido_direccion':
            return manejarDireccion(texto, sesion);

        case 'pedido_pago':
            return manejarPago(msg, sesion);

        case 'pedido_confirmar':
            return manejarConfirmacion(msg, sesion, numero);

        case 'faq':
            return manejarFAQ(msg, sesion);

        default:
            sesion.paso = 'menu_principal';
            return bienvenida();
    }
}

function bienvenida() {
    return `¡Hola! 🍓 Bienvenido(a) a Fresh Cream.\nSoy tu asistente virtual. ¿Qué te gustaría hacer?\n\n1️⃣ Hacer un pedido\n2️⃣ Ver el menú y precios\n3️⃣ Preguntas frecuentes\n4️⃣ Hablar con una persona`;
}

function mostrarMenu() {
    let texto = `🍓 Nuestro producto base: Fresas con crema\n\nTamaños:\n`;
    texto += listaTamanos();
    texto += `\n\nToppings disponibles:\n${menu.toppings.map(t => '🍓 ' + t).join('\n')}\n\n`;
    texto += `Escribe "pedido" cuando quieras ordenar.`;
    return texto;
}

function listaTamanos() {
    return Object.entries(menu.tamanos).map(([k, v]) => `${k}️⃣ ${v.nombre} - $${v.precio}`).join('\n');
}

function manejarMenuPrincipal(msg, sesion) {
    if (msg === '2') {
        sesion.paso = 'menu_mostrado';
        return mostrarMenu();
    }
    return 'No entendí esa opción 🤔\n\n' + bienvenida();
}

function manejarTamano(msg, sesion) {
    const opcion = menu.tamanos[msg];
    if (!opcion) {
        return 'Por favor elige una opción válida:\n' + listaTamanos();
    }
    sesion.pedido.tamano = opcion.nombre;
    sesion.pedido.precioBase = opcion.precio;
    sesion.paso = 'pedido_toppings';
    return `Genial. ¿Qué toppings le pones? (escribe los que quieras, separados por coma)\n\n${menu.toppings.map(t => '🍓 ' + t).join('\n')}`;
}

function manejarToppings(texto, sesion) {
    sesion.pedido.toppings = texto.split(',').map(t => t.trim()).filter(Boolean);
    sesion.paso = 'pedido_cantidad';
    return '¿Cuántas porciones de este tipo quieres?';
}

function manejarCantidad(msg, sesion) {
    const cantidad = parseInt(msg);
    if (!cantidad || cantidad <= 0) {
        return 'Por favor escribe un número válido de porciones.';
    }
    sesion.pedido.cantidad = cantidad;
    sesion.paso = 'pedido_entrega';
    return `Ya casi terminamos 📝\n\n¿Es para recoger o para entregar?\n1️⃣ Recoger en ${menu.direccionLocal}\n2️⃣ Entrega a domicilio (envío $${menu.envio} en zona ${menu.zona})`;
}

function manejarEntrega(msg, sesion) {
    if (msg === '1') {
        sesion.pedido.entrega = 'Recoger en local';
        sesion.paso = 'pedido_pago';
        return preguntaPago();
    }
    if (msg === '2') {
        sesion.pedido.entrega = 'Domicilio';
        sesion.paso = 'pedido_direccion';
        return 'Perfecto, ¿cuál es tu dirección completa y una referencia?';
    }
    return 'Elige una opción válida:\n1️⃣ Recoger\n2️⃣ Domicilio';
}

function manejarDireccion(texto, sesion) {
    sesion.pedido.direccion = texto;
    sesion.paso = 'pedido_pago';
    return preguntaPago();
}

function preguntaPago() {
    return '¿Cómo prefieres pagar?\n1️⃣ Efectivo al recibir/recoger\n2️⃣ Transferencia';
}

function manejarPago(msg, sesion) {
    if (msg === '1') {
        sesion.pedido.pago = 'Efectivo';
    } else if (msg === '2') {
        sesion.pedido.pago = 'Transferencia';
    } else {
        return preguntaPago();
    }
    sesion.paso = 'pedido_confirmar';
    return resumenPedido(sesion.pedido);
}

function resumenPedido(pedido) {
    const totalToppings = pedido.toppings?.join(', ') || 'ninguno';
    const total = pedido.precioBase * pedido.cantidad + (pedido.entrega === 'Domicilio' ? menu.envio : 0);
    pedido.total = total;
    let texto = `📋 Resumen de tu pedido:\n- ${pedido.tamano} con ${totalToppings} x ${pedido.cantidad}\n`;
    texto += `- Entrega: ${pedido.entrega}${pedido.direccion ? ' (' + pedido.direccion + ')' : ''}\n`;
    texto += `- Pago: ${pedido.pago}\n- Total: $${total}\n\n¿Confirmas tu pedido? (Sí/No)`;
    return texto;
}

async function manejarConfirmacion(msg, sesion, numero) {
    if (msg === 'si' || msg === 'sí') {
        const pedidoFinal = { ...sesion.pedido, numero, fecha: new Date().toISOString() };
        console.log('✅ PEDIDO CONFIRMADO:', pedidoFinal);
        await guardarPedidoExcel(pedidoFinal);
        await notificarHermana(pedidoFinal);
        resetSesion(numero);
        return '¡Pedido confirmado! 🎉\nTe avisamos cuando esté listo.\n\n¡Gracias por tu compra! 🍓';
    }
    if (msg === 'no') {
        resetSesion(numero);
        return 'Sin problema, cancelé el pedido. Escribe "pedido" cuando quieras empezar de nuevo.';
    }
    return '¿Confirmas tu pedido? Responde Sí o No.';
}

async function guardarPedidoExcel(pedido) {
    const workbook = new ExcelJS.Workbook();
    let worksheet;

    if (fs.existsSync(ARCHIVO_PEDIDOS)) {
        await workbook.xlsx.readFile(ARCHIVO_PEDIDOS);
        worksheet = workbook.getWorksheet('Pedidos');
    } else {
        worksheet = workbook.addWorksheet('Pedidos');
        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 12 },
            { header: 'Número', key: 'numero', width: 18 },
            { header: 'Tamaño', key: 'tamano', width: 12 },
            { header: 'Toppings', key: 'toppings', width: 30 },
            { header: 'Cantidad', key: 'cantidad', width: 10 },
            { header: 'Entrega', key: 'entrega', width: 15 },
            { header: 'Dirección', key: 'direccion', width: 25 },
            { header: 'Pago', key: 'pago', width: 14 },
            { header: 'Total', key: 'total', width: 12 }
        ];

        const filaEncabezado = worksheet.getRow(1);
        filaEncabezado.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE91E63' } };
            cell.alignment = { horizontal: 'center' };
        });
    }

    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();

    const fila = worksheet.addRow({
        fecha: `${dia}/${mes}/${anio}`,
        numero: pedido.numero,
        tamano: pedido.tamano,
        toppings: (pedido.toppings || []).join(', '),
        cantidad: pedido.cantidad,
        entrega: pedido.entrega,
        direccion: pedido.direccion || '-',
        pago: pedido.pago,
        total: pedido.total
    });

    fila.getCell('total').numFmt = '$#,##0';
    fila.alignment = { vertical: 'middle' };

    await workbook.xlsx.writeFile(ARCHIVO_PEDIDOS);
}

async function notificarHermana(pedido) {
    const { sendMessage } = require('./whatsapp');
    const numeroHermana = process.env.NUMERO_HERMANA;
    if (!numeroHermana) return;

    const totalToppings = pedido.toppings?.join(', ') || 'ninguno';
    const texto = `🍓 ¡Nuevo pedido!\n\n` +
        `Cliente: ${pedido.numero}\n` +
        `- ${pedido.tamano} con ${totalToppings} x ${pedido.cantidad}\n` +
        `- Entrega: ${pedido.entrega}${pedido.direccion ? ' (' + pedido.direccion + ')' : ''}\n` +
        `- Pago: ${pedido.pago}\n` +
        `- Total: $${pedido.total}`;

    await sendMessage(numeroHermana, texto);
}

function mostrarFAQ() {
    return `Elige tu duda:\n1️⃣ Horarios\n2️⃣ Zonas de entrega\n3️⃣ Formas de pago\n4️⃣ Tiempo de preparación\n\nO escribe "menu" para volver al inicio.`;
}

function manejarFAQ(msg, sesion) {
    const respuestas = {
        '1': `Atendemos: ${menu.horario} 🕐`,
        '2': `Entregamos en ${menu.zona}.`,
        '3': 'Aceptamos efectivo y transferencia bancaria.',
        '4': 'Tu pedido está listo en aproximadamente 20-30 minutos.'
    };
    if (respuestas[msg]) {
        return respuestas[msg] + '\n\nEscribe "menu" para volver al inicio.';
    }
    return mostrarFAQ();
}

module.exports = { procesarMensaje };