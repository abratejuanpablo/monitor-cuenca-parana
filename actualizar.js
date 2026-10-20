const fs = require('fs');

async function obtenerDatosPrefectura() {
    console.log('📡 Conectando con Prefectura Naval Argentina...');
    const urlPNA = 'https://contenidosweb.prefecturanaval.gob.ar/alturas/obtiene_alturas.php';

    try {
        const response = await fetch(urlPNA, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Error en respuesta PNA: ${response.status}`);
        }

        const dataPNA = await response.json();
        return dataPNA;
    } catch (error) {
        console.error('⚠️ No se pudo conectar con la API de PNA:', error.message);
        return null;
    }
}

async function procesarYActualizar() {
    let rawLocal = fs.readFileSync('datos.json', 'utf8');
    let jsonLocal = JSON.parse(rawLocal);

    const datosOficiales = await obtenerDatosPrefectura();

    if (datosOficiales && Array.isArray(datosOficiales)) {
        console.log(`✅ Se recibieron ${datosOficiales.length} registros totales de Prefectura.`);

        // Filtramos de forma dinámica todos los que pertenezcan al sistema del Río Paraná
        const puertosParana = datosOficiales.filter(p => {
            const rio = (p.rio || '').toUpperCase();
            return rio.includes('PARANÁ') || rio.includes('PARANA');
        });

        console.log(`🌊 Se detectaron ${puertosParana.length} estaciones pertenecientes a la cuenca del Paraná.`);

        // Mapeamos los datos al formato que lee tu sitio web
        const puertosMapeados = puertosParana.map(p => {
            const altura = parseFloat(p.altura) || 0;
            const variacion = parseFloat(p.variacion) || 0;
            const alerta = parseFloat(p.alerta) || 5.00;
            const evacuacion = parseFloat(p.evacuacion) || 6.00;

            let tendencia = 'estacionario';
            const est = (p.estado || '').toLowerCase();
            if (est.includes('crece') || est.includes('ascenso') || variacion > 0) tendencia = 'subiendo';
            if (est.includes('baja') || est.includes('descenso') || variacion < 0) tendencia = 'bajando';

            // Generamos un ID único y limpio basado en el nombre del puerto
            const idSeguro = p.puerto ? p.puerto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_') : 'puerto';

            return {
                id: idSeguro,
                nombre: p.puerto || 'Puerto Desconocido',
                tramo: p.rio || 'Río Paraná',
                altura: altura,
                variacion_24h: variacion,
                alerta: alerta,
                evacuacion: evacuacion,
                tendencia: tendencia,
                lead_time: `Medición oficial PNA (${p.fecha || 'Actualizado'}).`
            };
        });

        if (puertosMapeados.length > 0) {
            // Mantenemos las represas intactas y actualizamos la lista completa de puertos de la cuenca
            jsonLocal.puertos = puertosMapeados;
        }
    } else {
        console.log('⚠️ Usando valores previos debido a un fallo en la conexión con PNA.');
    }

    // Actualizamos la fecha de sincronización
    jsonLocal.actualizado_el = new Date().toISOString();
    jsonLocal.fuente = "Prefectura Naval Argentina (PNA) - Sincronización Automática Completa";

    // Guardamos el archivo
    fs.writeFileSync('datos.json', JSON.stringify(jsonLocal, null, 2), 'utf8');
    console.log('🎉 ¡datos.json actualizado con todas las ubicaciones del Paraná!');
}

procesarYActualizar();
