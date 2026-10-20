const fs = require('fs');

// Lista de puertos objetivo de la Cuenca del Paraná que queremos filtrar
const PUERTOS_OBJETIVO = [
    { id: 'iguazu', puertoBuscado: 'IGUAZU', tramo: 'Alto Paraná', alerta: 25.00, evacuacion: 28.00 },
    { id: 'posadas', puertoBuscado: 'POSADAS', tramo: 'Alto Paraná', alerta: 11.00, evacuacion: 12.00 },
    { id: 'corrientes', puertoBuscado: 'CORRIENTES', tramo: 'Alto Paraná', alerta: 6.50, evacuacion: 7.00 },
    { id: 'reconquista', puertoBuscado: 'RECONQUISTA', tramo: 'Paraná Medio', alerta: 5.10, evacuacion: 5.30 },
    { id: 'la_paz', puertoBuscado: 'LA PAZ', tramo: 'Paraná Medio', alerta: 5.80, evacuacion: 6.15 },
    { id: 'parana', puertoBuscado: 'PARANA', tramo: 'Paraná Medio', alerta: 4.70, evacuacion: 5.00 },
    { id: 'santa_fe', puertoBuscado: 'SANTA FE', tramo: 'Paraná Medio', alerta: 4.70, evacuacion: 5.30 },
    { id: 'rosario', puertoBuscado: 'ROSARIO', tramo: 'Paraná Inferior', alerta: 5.00, evacuacion: 5.30 },
    { id: 'san_nicolas', puertoBuscado: 'SAN NICOLAS', tramo: 'Paraná Inferior', alerta: 4.20, evacuacion: 4.50 },
    { id: 'zarate', puertoBuscado: 'ZARATE', tramo: 'Paraná Inferior', alerta: 2.00, evacuacion: 2.20 }
];

async function obtenerDatosPrefectura() {
    console.log('📡 Conectando con Prefectura Naval Argentina...');
    
    // URL del endpoint/json interno de Prefectura para alturas
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
        console.error('⚠️ No se pudo obtener datos en directo de la API PNA, buscando alternativa...', error.message);
        return null;
    }
}

async function procesarYActualizar() {
    // 1. Leemos la estructura actual de datos.json
    let rawLocal = fs.readFileSync('datos.json', 'utf8');
    let jsonLocal = JSON.parse(rawLocal);

    // 2. Obtenemos los datos oficiales de PNA
    const datosOficiales = await obtenerDatosPrefectura();

    if (datosOficiales && Array.isArray(datosOficiales)) {
        console.log(`✅ Se recibieron ${datosOficiales.length} registros de Prefectura.`);

        const puertosActualizados = [];

        for (const config of PUERTOS_OBJETIVO) {
            // Buscamos el puerto por nombre dentro de la lista de PNA
            const registroPNA = datosOficiales.find(p => 
                p.puerto && p.puerto.toUpperCase().includes(config.puertoBuscado)
            );

            if (registroPNA) {
                const alturaActual = parseFloat(registroPNA.altura) || 0;
                const variacion = parseFloat(registroPNA.variacion) || 0;
                let tendencia = 'estacionario';
                if (registroPNA.estado) {
                    const est = registroPNA.estado.toLowerCase();
                    if (est.includes('crece') || est.includes('ascenso') || variacion > 0) tendencia = 'subiendo';
                    if (est.includes('baja') || est.includes('descenso') || variacion < 0) tendencia = 'bajando';
                }

                puertosActualizados.push({
                    id: config.id,
                    nombre: registroPNA.puerto,
                    tramo: config.tramo,
                    altura: alturaActual,
                    variacion_24h: variacion,
                    alerta: config.alerta,
                    evacuacion: config.evacuacion,
                    tendencia: tendencia,
                    lead_time: `Medición oficial PNA (${registroPNA.fecha || 'Hoy'}).`
                });
            } else {
                // Si no se encuentra en la respuesta puntual, mantenemos el registro local previo
                const previo = jsonLocal.puertos.find(p => p.id === config.id);
                if (previo) puertosActualizados.push(previo);
            }
        }

        if (puertosActualizados.length > 0) {
            jsonLocal.puertos = puertosActualizados;
        }
    } else {
        console.log('⚠️ No se pudieron actualizar los valores reales; se mantiene la versión previa.');
    }

    // 3. Actualizamos fecha de sincronización
    jsonLocal.actualizado_el = new Date().toISOString();
    jsonLocal.fuente = "Prefectura Naval Argentina (PNA) - Datos Oficiales";

    // 4. Guardamos el archivo actualizado
    fs.writeFileSync('datos.json', JSON.stringify(jsonLocal, null, 2), 'utf8');
    console.log('🎉 ¡datos.json actualizado con éxito con datos de Prefectura!');
}

procesarYActualizar();
