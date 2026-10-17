        const gastosLista = document.getElementById('gastosLista');
        const CATALOGO_GASTOS = [
            'Honorarios Agente Aduanal', 'Almacenaje Portuario', 'Transporte Interno',
            'Placas y Circulación', 'Comisión Bancaria', 'Imprevistos', 'Otro'
        ];

        function crearFilaGasto(nombre = '', monto = '') {
            const fila = document.createElement('div');
            fila.className = 'gasto-fila';
            const opciones = CATALOGO_GASTOS.map(c =>
                `<option value="${c}" ${c === nombre ? 'selected' : ''}>${c}</option>`
            ).join('');
            fila.innerHTML = `
                <select class="gasto-tipo">${opciones}</select>
                <input type="number" class="gasto-monto" placeholder="USD" min="0" step="0.01" value="${monto}">
                <button type="button" class="btn-quitar-gasto" title="Quitar"><i class="fa-solid fa-trash"></i></button>
            `;
            fila.querySelector('.btn-quitar-gasto').addEventListener('click', () => fila.remove());
            gastosLista.appendChild(fila);
        }

        document.getElementById('btnAgregarGasto').addEventListener('click', () => crearFilaGasto());
        crearFilaGasto('Honorarios Agente Aduanal', '');

        function obtenerGastosAdicionales() {
            return Array.from(gastosLista.querySelectorAll('.gasto-fila')).map(fila => ({
                tipo: fila.querySelector('.gasto-tipo').value,
                monto: parseFloat(fila.querySelector('.gasto-monto').value) || 0
            }));
        }

        let ultimoCalculo = null;

        document.getElementById('calcForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const marca = document.getElementById('marca').value.trim();
            const modelo = document.getElementById('modelo').value.trim();
            const anio = parseInt(document.getElementById('anio').value) || null;
            const cilindrada = parseInt(document.getElementById('cilindrada').value) || null;

            const precio = parseFloat(document.getElementById('precioVehiculo').value) || 0;
            const flete = parseFloat(document.getElementById('flete').value) || 0;
            const seguro = parseFloat(document.getElementById('seguro').value) || 0;
            const tasaCambio = parseFloat(document.getElementById('tasaCambio').value) || 7.80;

            const tasaDai = (parseFloat(document.getElementById('tasaDai').value) || 0) / 100;
            const tasaIva = (parseFloat(document.getElementById('tasaIva').value) || 0) / 100;
            const iprimaFijo = parseFloat(document.getElementById('iprimaFijo').value) || 0;

            const gastosAdicionales = obtenerGastosAdicionales();
            const totalGastosAdicionales = gastosAdicionales.reduce((sum, g) => sum + g.monto, 0);

            const precioVenta = parseFloat(document.getElementById('precioVenta').value) || 0;

            const valorCifUsd = precio + flete + seguro;
            const daiUsd = valorCifUsd * tasaDai;
            const ivaUsd = (valorCifUsd + daiUsd) * tasaIva;
            const ipPrimaUsd = iprimaFijo;
            const impuestosUsd = daiUsd + ivaUsd + ipPrimaUsd;

            const costoTotalUsd = valorCifUsd + impuestosUsd + totalGastosAdicionales;

            const valorCifGtq = valorCifUsd * tasaCambio;
            const impuestosGtq = impuestosUsd * tasaCambio;
            const gastosGtq = totalGastosAdicionales * tasaCambio;
            const costoTotalGtq = costoTotalUsd * tasaCambio;

            const margenUsd = precioVenta > 0 ? (precioVenta - costoTotalUsd) : null;
            const margenPct = (precioVenta > 0) ? (margenUsd / precioVenta) * 100 : null;

            document.getElementById('cifUsd').textContent = fmtUsd(valorCifUsd);
            document.getElementById('cifGtq').textContent = fmtGtq(valorCifGtq);
            document.getElementById('impUsd').textContent = fmtUsd(impuestosUsd);
            document.getElementById('impGtq').textContent = fmtGtq(impuestosGtq);
            document.getElementById('gastosUsd').textContent = fmtUsd(totalGastosAdicionales);
            document.getElementById('gastosGtq').textContent = fmtGtq(gastosGtq);
            document.getElementById('totalUsd').textContent = fmtUsd(costoTotalUsd);
            document.getElementById('totalGtq').textContent = fmtGtq(costoTotalGtq);
            document.getElementById('ventaUsd').textContent = fmtUsd(precioVenta);

            const filaMargenUsd = document.getElementById('filaMargenUsd');
            const filaMargenPct = document.getElementById('filaMargenPct');
            const alerta = document.getElementById('alertaMargen');

            if (precioVenta > 0) {
                document.getElementById('margenUsd').textContent = fmtUsd(margenUsd);
                document.getElementById('margenPct').textContent = margenPct.toFixed(2) + '%';
                filaMargenUsd.classList.toggle('margen-positivo', margenUsd >= 0);
                filaMargenUsd.classList.toggle('margen-negativo', margenUsd < 0);

                alerta.classList.add('visible');
                if (margenUsd < 0) {
                    alerta.className = 'alerta-margen visible riesgo';
                    alerta.textContent = 'Esta operación proyecta pérdida al precio de venta propuesto. Revise costos o el precio antes de aprobar.';
                } else if (margenPct < 10) {
                    alerta.className = 'alerta-margen visible riesgo';
                    alerta.textContent = 'Margen menor al 10% sobre venta: revise si cubre imprevistos y comisiones antes de aprobar.';
                } else {
                    alerta.className = 'alerta-margen visible ok';
                    alerta.textContent = 'Margen dentro de un rango saludable según el precio de venta propuesto.';
                }
            } else {
                document.getElementById('margenUsd').textContent = '—';
                document.getElementById('margenPct').textContent = '—';
                alerta.classList.remove('visible');
            }

            document.getElementById('panelResultados').style.display = 'block';
            document.getElementById('estadoGuardado').textContent = '';

            ultimoCalculo = {
                cliente_id: document.getElementById('clienteCotizacion')?.value || null,
                marca, modelo, anio,
                cilindrada_cc: cilindrada,
                precio_origen_usd: precio,
                flete_usd: flete,
                seguro_usd: seguro,
                otros_gastos_estimados_usd: totalGastosAdicionales,
                tasa_cambio_usada: tasaCambio,
                valor_cif_usd: valorCifUsd,
                dai_usd: daiUsd,
                iva_usd: ivaUsd,
                iprima_usd: ipPrimaUsd,
                costo_total_usd: costoTotalUsd,
                precio_venta_propuesto_usd: precioVenta || null,
                margen_bruto_usd: margenUsd,
                margen_porcentaje: margenPct
            };
        });

        function fmtUsd(v) { return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        function fmtGtq(v) { return 'Q' + v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

        document.getElementById('btnGuardar').addEventListener('click', async function () {
            if (!ultimoCalculo) return;

            const btn = this;
            const estado = document.getElementById('estadoGuardado');
            btn.disabled = true;
            estado.textContent = 'Guardando cotización...';
            estado.className = 'estado-guardado';

            try {
                const comoCliente = esSoloCliente();
                const cuerpo = comoCliente ? {
                    marca: ultimoCalculo.marca, modelo: ultimoCalculo.modelo, anio: ultimoCalculo.anio,
                    cilindrada_cc: ultimoCalculo.cilindrada_cc,
                    precio_origen_usd: ultimoCalculo.precio_origen_usd,
                    flete_usd: ultimoCalculo.flete_usd, seguro_usd: ultimoCalculo.seguro_usd,
                    tasa_cambio_usada: ultimoCalculo.tasa_cambio_usada
                } : ultimoCalculo;

                const respuesta = await fetch(comoCliente ? '/api/portal-cliente/cotizaciones' : '/api/cotizaciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(cuerpo)
                });
                const data = await respuesta.json().catch(() => ({}));

                if (!respuesta.ok) {
                    estado.textContent = data.error || ('No se pudo guardar (código ' + respuesta.status + ').');
                    estado.className = 'estado-guardado error';
                    return;
                }

                estado.textContent = comoCliente
                    ? 'Listo: guardamos tu cotización. Puedes verla en "Mis Vehículos".'
                    : 'Cotización guardada (#' + data.cotizacion_id + '). Queda pendiente de validación.';
                estado.className = 'estado-guardado ok';
            } catch (err) {
                console.error(err);
                estado.textContent = 'No se pudo conectar con el servidor.';
                estado.className = 'estado-guardado error';
            } finally {
                btn.disabled = false;
            }
        });

function esSoloCliente() {
    const roles = window.usuarioActual?.roles || [];
    return roles.length > 0 && roles.every(r => r === 'Cliente');
}

async function esperarUsuario() {
    let intentos = 0;
    while (!window.usuarioActual && intentos < 40) {
        await new Promise(r => setTimeout(r, 50));
        intentos++;
    }
}

async function adaptarSegunRol() {
    await esperarUsuario();
    if (!esSoloCliente()) return;

    document.querySelectorAll('[data-solo-personal]').forEach(el => { el.style.display = 'none'; });
    const grupoCliente = document.getElementById('grupoCliente');
    if (grupoCliente) grupoCliente.style.display = 'none';

    document.querySelector('#tituloCalc span').textContent = 'Calcula tu importación';
    document.getElementById('descCalc').textContent =
        'Estima cuánto costaría traer un vehículo a Guatemala (valor CIF + impuestos). Puedes guardar tus cálculos y consultarlos en tu portal.';
    document.getElementById('etiquetaTotal').textContent = 'Costo total estimado:';
    document.getElementById('textoBtnGuardar').textContent = 'Guardar mi cotización';
    document.getElementById('notaCalc').textContent =
        '* Estimación referencial basada en el valor CIF y los impuestos. El costo final lo confirma la importadora.';
}
adaptarSegunRol();

async function cargarTasasPorDefecto() {
    try {
        const res = await fetch('/api/catalogos/tasas', { credentials: 'include' });
        if (!res.ok) return;
        const t = await res.json();
        document.getElementById('tasaDai').value = t.dai_pct;
        document.getElementById('tasaIva').value = t.iva_pct;
        document.getElementById('iprimaFijo').value = t.iprima_usd;
    } catch (error) {
    }
}
cargarTasasPorDefecto();

let temporizadorSimilares = null;
async function buscarSimilares() {
    const caja = document.getElementById('similaresBox');
    if (!caja || esSoloCliente()) return;

    const marca = document.getElementById('marca').value.trim();
    const modelo = document.getElementById('modelo').value.trim();
    const anio = document.getElementById('anio').value;
    if (!marca || !modelo || !anio) { caja.textContent = ''; return; }

    try {
        const res = await fetch(
            `/api/cotizaciones/similares?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}&anio=${anio}`,
            { credentials: 'include' }
        );
        if (!res.ok) { caja.textContent = ''; return; }
        const filas = await res.json();
        if (filas.length === 0) {
            caja.textContent = 'Sin ventas anteriores similares registradas todavía.';
            return;
        }
        caja.innerHTML = '<strong>Ventas anteriores similares:</strong><br>' + filas.map(f => {
            const venta = parseFloat(f.Precio_Venta_Real_USD);
            const costo = parseFloat(f.Costo_Total_Importacion);
            const pct = venta > 0 ? ((venta - costo) / venta) * 100 : 0;
            return `${f.Marca} ${f.Modelo} ${f.Anio} — vendido ${fmtUsd(venta)} (costo ${fmtUsd(costo)}, margen ${pct.toFixed(1)}%)`;
        }).join('<br>');
    } catch (error) {
        caja.textContent = '';
    }
}
['marca', 'modelo', 'anio'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        clearTimeout(temporizadorSimilares);
        temporizadorSimilares = setTimeout(buscarSimilares, 500);
    });
});


async function cargarClientesCotizacion() {
    const grupo = document.getElementById('grupoCliente');
    const select = document.getElementById('clienteCotizacion');
    if (!select) return;
    try {
        const res = await fetch('/api/clientes', { credentials: 'include' });
        if (!res.ok) { grupo.style.display = 'none'; return; }
        const clientes = await res.json();
        select.innerHTML = '<option value="">Sin asignar (cotización interna)</option>' +
            clientes.map(c => `<option value="${c.CLIENTE_ID}">${c.Nombre_Completo}</option>`).join('');

        const pre = new URLSearchParams(window.location.search).get('cliente_id');
        if (pre) select.value = pre;
    } catch (error) {
        grupo.style.display = 'none';
    }
}
cargarClientesCotizacion();
