document.addEventListener('DOMContentLoaded', () => {
    let datosGlobales = null;
    let tramoFiltro = 'todos';

    async function cargarDatos() {
        const statusBadge = document.getElementById('status-badge');
        
        try {
            const res = await fetch('datos.json');
            if (!res.ok) throw new Error('Error al conectar con la fuente de datos');
            
            datosGlobales = await res.json();
            
            if (statusBadge) {
                statusBadge.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span class="text-slate-300 font-medium">Sincronizado PNA & INA</span>
                `;
            }

            if (datosGlobales.represas) renderizarRepresas(datosGlobales.represas);
            if (datosGlobales.puertos) renderizarPuertos(datosGlobales.puertos);

        } catch (error) {
            console.warn('Usando modo de respaldo offline:', error);
            if (statusBadge) {
                statusBadge.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span class="text-slate-300 font-medium">Modo Respaldo</span>
                `;
            }
        }
    }

    function renderizarRepresas(represas) {
        const container = document.getElementById('represas-container');
        if (!container) return;

        container.innerHTML = represas.map(r => {
            const porcentajeCompuertas = Math.round((r.compuertas_abiertas / r.compuertas_totales) * 100);
            const badgeClasses = r.estado_color === 'amber' 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            
            return `
                <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400">${r.tramo}</span>
                            <h3 class="text-xl font-bold text-white">${r.nombre}</h3>
                            <p class="text-xs text-slate-400">${r.ubicacion}</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClasses}">
                            ${r.estado_badge}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                            <span class="text-[11px] text-slate-400 block mb-0.5">Caudal Entrante</span>
                            <span class="text-lg font-bold text-slate-200">${r.caudal_entrada.toLocaleString()} <span class="text-xs font-normal text-slate-400">m³/s</span></span>
                        </div>
                        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                            <span class="text-[11px] text-slate-400 block mb-0.5">Caudal Erogado</span>
                            <span class="text-lg font-bold text-amber-400">${r.caudal_salida.toLocaleString()} <span class="text-xs font-normal text-slate-400">m³/s</span></span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex justify-between text-xs">
                            <span class="text-slate-400">Compuertas del Vertedero: <strong class="text-slate-200">${r.compuertas_abiertas} de ${r.compuertas_totales} abiertas</strong></span>
                            <span class="text-amber-400 font-medium">${porcentajeCompuertas}%</span>
                        </div>
                        <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full bg-amber-500 rounded-full" style="width: ${porcentajeCompuertas}%;"></div>
                        </div>
                    </div>

                    <div class="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                        ⏱️ <strong class="text-slate-300">Tiempo de tránsito:</strong> ${r.tiempo_transito}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderizarPuertos(puertos) {
        const container = document.getElementById('puertos-container');
        const buscador = document.getElementById('buscador');
        const query = buscador ? buscador.value.toLowerCase() : '';

        if (!container) return;

        const filtrados = puertos.filter(p => {
            const coincideTramo = tramoFiltro === 'todos' || p.tramo.toLowerCase().includes(tramoFiltro.toLowerCase());
            const coincideNombre = p.nombre.toLowerCase().includes(query);
            return coincideTramo && coincideNombre;
        });

        if (filtrados.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 text-sm">No se encontraron puertos con ese criterio.</div>`;
            return;
        }

        container.innerHTML = filtrados.map(p => {
            const porcentaje = Math.min(100, Math.round((p.altura / p.alerta) * 100));
            const distanciaAlerta = (p.alerta - p.altura).toFixed(2);
            const esCreciente = p.variacion_24h > 0;
            
            let barraColor = 'bg-emerald-500';
            if (p.altura >= p.evacuacion) {
                barraColor = 'bg-rose-500';
            } else if (p.altura >= p.alerta) {
                barraColor = 'bg-amber-500';
            }

            return `
                <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400">${p.tramo}</span>
                            <h3 class="text-xl font-bold text-white">${p.nombre}</h3>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-medium ${esCreciente ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}">
                            ${esCreciente ? '↗️ +' : '➡️ '}${(p.variacion_24h * 100).toFixed(0)} cm / 24h
                        </span>
                    </div>

                    <div class="bg-slate-950 p-3.5 rounded-xl flex justify-between items-baseline border border-slate-800/80">
                        <div>
                            <span class="text-xs text-slate-400">Altura Actual</span>
                            <div class="text-2xl font-extrabold text-slate-100">${p.altura.toFixed(2)} <span class="text-sm font-normal text-slate-400">m</span></div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs text-slate-400">Nivel Alerta</span>
                            <div class="text-sm font-bold text-amber-400">${p.alerta.toFixed(2)} m</div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <div class="flex justify-between text-xs">
                            <span class="text-slate-400">Margen a nivel de alerta</span>
                            <span class="text-slate-200 font-semibold">${distanciaAlerta > 0 ? `A ${distanciaAlerta} m` : 'Superado'}</span>
                        </div>
                        <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full ${barraColor} rounded-full" style="width: ${porcentaje}%;"></div>
                        </div>
                    </div>

                    <div class="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                        ⏱️ <strong class="text-slate-300">Observación:</strong> ${p.lead_time}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Manejo de botones de filtro
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filtro-btn').forEach(b => {
                b.classList.remove('active', 'bg-blue-600', 'text-white');
                b.classList.add('bg-slate-900', 'border', 'border-slate-800', 'text-slate-300');
            });
            e.target.classList.remove('bg-slate-900', 'border', 'border-slate-800', 'text-slate-300');
            e.target.classList.add('active', 'bg-blue-600', 'text-white');
            
            tramoFiltro = e.target.dataset.tramo;
            if (datosGlobales && datosGlobales.puertos) renderizarPuertos(datosGlobales.puertos);
        });
    });

    // Manejo del buscador en tiempo real
    document.getElementById('buscador')?.addEventListener('input', () => {
        if (datosGlobales && datosGlobales.puertos) renderizarPuertos(datosGlobales.puertos);
    });

    cargarDatos();
});
