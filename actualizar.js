const fs = require('fs');

async function actualizarDatos() {
    try {
        console.log('Iniciando proceso de actualización...');

        // Leemos el archivo datos.json actual
        let rawData = fs.readFileSync('datos.json');
        let data = JSON.parse(rawData);

        // Actualizamos la estampa de tiempo
        data.actualizado_el = new Date().toISOString();

        // Guardamos los cambios
        fs.writeFileSync('datos.json', JSON.stringify(data, null, 2), 'utf8');
        console.log('¡datos.json actualizado exitosamente!');

    } catch (error) {
        console.error('Error durante la actualización:', error);
        process.exit(1);
    }
}

actualizarDatos();
