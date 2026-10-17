document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel-reporte').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.panel).classList.add('active');
    });
});

function fmtUsd(v) { return '$' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtGtq(v) { return 'Q' + (Number(v) || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDobleMoneda(usd, gtq) {
    return `<span class="importe-dual">${fmtUsd(usd)}<small>${fmtGtq(gtq)} aprox.</small></span>`;
}
function convertirAGtq(usd, tasa) { return (Number(usd) || 0) * (Number(tasa) || 0); }
function fechaHoyTexto() { return `Generado el ${new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })}`; }

document.getElementById('fechaGeneracionInv').textContent = fechaHoyTexto();
document.getElementById('fechaGeneracionDoc').textContent = fechaHoyTexto();

let ventasCache = null;

async function obtenerVentas() {
    if (ventasCache) return ventasCache;
    const res = await fetch('/api/ventas/margenes', { credentials: 'include' });
    if (res.status === 401) { window.location.replace('login.html'); return []; }
    if (res.status === 403) { return null; }
    if (!res.ok) return [];
    ventasCache = await res.json();
    return ventasCache;
}

function filtrarPorFecha(ventas, desde, hasta) {
    return ventas.filter(v => {
        const f = v.Fecha_Venta ? v.Fecha_Venta.split('T')[0] : null;
        if (!f) return false;
        if (desde && f < desde) return false;
        if (hasta && f > hasta) return false;
        return true;
    });
}

async function renderFinanciero() {
    const desde = document.getElementById('finDesde').value;
    const hasta = document.getElementById('finHasta').value;
    document.getElementById('rangoFechaTextoFin').textContent =
        (desde || hasta) ? `Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'} — ${fechaHoyTexto()}` : fechaHoyTexto();

    const todas = await obtenerVentas();
    if (todas === null) {
        document.querySelector('#panelFinanciero .kpi-grid-reporte').innerHTML =
            '<p style="color:#dc2626;">No tienes permisos para ver información financiera.</p>';
        return;
    }

    const ventas = filtrarPorFecha(todas, desde, hasta);
    const inversion = ventas.reduce((s, v) => s + parseFloat(v.Costo_Total_Importacion || 0), 0);
    const totalVentas = ventas.reduce((s, v) => s + parseFloat(v.Precio_Venta_Real_USD || 0), 0);
    const inversionGtq = ventas.reduce((s, v) => s + convertirAGtq(v.Costo_Total_Importacion, v.Tasa_Cambio_Usada), 0);
    const ventasGtq = ventas.reduce((s, v) => s + convertirAGtq(v.Precio_Venta_Real_USD, v.Tasa_Cambio_Usada), 0);
    const margen = totalVentas - inversion;
    const margenGtq = ventasGtq - inversionGtq;
    const margenPct = totalVentas > 0 ? (margen / totalVentas) * 100 : 0;

    document.getElementById('finUnidades').textContent = ventas.length;
    document.getElementById('finInversion').innerHTML = fmtDobleMoneda(inversion, inversionGtq);
    document.getElementById('finVentas').innerHTML = fmtDobleMoneda(totalVentas, ventasGtq);
    const elMargen = document.getElementById('finMargen');
    elMargen.innerHTML = fmtDobleMoneda(margen, margenGtq);
    elMargen.className = 'valor ' + (margen >= 0 ? 'positivo' : 'negativo');
    document.getElementById('finMargenPct').textContent = margenPct.toFixed(1) + '%';
}

async function renderVentasDetalle() {
    const desde = document.getElementById('venDesde').value;
    const hasta = document.getElementById('venHasta').value;
    document.getElementById('rangoFechaTextoVen').textContent =
        `${(desde || hasta) ? `Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'} — ` : ''}${fechaHoyTexto()} · Equivalentes en Q calculados con la tasa de cambio de la cotización vinculada.`;

    const todas = await obtenerVentas();
    const tbody = document.getElementById('tablaVentas');

    if (todas === null) {
        tbody.innerHTML = '<tr><td colspan="7" style="color:#dc2626;">No tienes permisos para ver esta información.</td></tr>';
        return;
    }

    const ventas = filtrarPorFecha(todas, desde, hasta);
    tbody.innerHTML = ventas.length === 0
        ? '<tr><td colspan="7" style="text-align:center; color:#888;">Sin ventas en el periodo.</td></tr>'
        : ventas.map(v => `
            <tr>
                <td>${v.VIN_Unidad}</td>
                <td>${v.Marca} ${v.Modelo}</td>
                <td>${fmtDobleMoneda(v.Costo_Total_Importacion, convertirAGtq(v.Costo_Total_Importacion, v.Tasa_Cambio_Usada))}</td>
                <td>${fmtDobleMoneda(v.Precio_Venta_Real_USD, convertirAGtq(v.Precio_Venta_Real_USD, v.Tasa_Cambio_Usada))}</td>
                <td>${fmtDobleMoneda(v.Margen_Real_USD, convertirAGtq(v.Margen_Real_USD, v.Tasa_Cambio_Usada))}</td>
                <td>${parseFloat(v.Margen_Real_Pct || 0).toFixed(1)}%</td>
                <td>${v.Fecha_Venta ? v.Fecha_Venta.split('T')[0] : ''}</td>
            </tr>
        `).join('');

    const totCosto = ventas.reduce((s, v) => s + parseFloat(v.Costo_Total_Importacion || 0), 0);
    const totVenta = ventas.reduce((s, v) => s + parseFloat(v.Precio_Venta_Real_USD || 0), 0);
    const totCostoGtq = ventas.reduce((s, v) => s + convertirAGtq(v.Costo_Total_Importacion, v.Tasa_Cambio_Usada), 0);
    const totVentaGtq = ventas.reduce((s, v) => s + convertirAGtq(v.Precio_Venta_Real_USD, v.Tasa_Cambio_Usada), 0);
    document.getElementById('totCosto').innerHTML = fmtDobleMoneda(totCosto, totCostoGtq);
    document.getElementById('totVenta').innerHTML = fmtDobleMoneda(totVenta, totVentaGtq);
    document.getElementById('totMargen').innerHTML = fmtDobleMoneda(totVenta - totCosto, totVentaGtq - totCostoGtq);
}

document.getElementById('btnFiltrarFinanciero').addEventListener('click', renderFinanciero);
document.getElementById('btnFiltrarVentas').addEventListener('click', renderVentasDetalle);

async function renderInventario() {
    const [resVeh, resEstados] = await Promise.all([
        fetch('/api/vehiculos', { credentials: 'include' }),
        fetch('/api/catalogos/estados-logisticos', { credentials: 'include' })
    ]);
    if (resVeh.status === 401) { window.location.replace('login.html'); return; }

    const vehiculos = await resVeh.json();
    const estados = await resEstados.json();

    const conteo = {};
    estados.forEach(e => conteo[e.Nombre_Estado] = 0);
    vehiculos.forEach(v => { if (conteo[v.Estado_Actual] !== undefined) conteo[v.Estado_Actual]++; });

    const tbody = document.getElementById('tablaInventario');
    tbody.innerHTML = estados.map(e => `<tr><td>${e.Nombre_Estado}</td><td>${conteo[e.Nombre_Estado]}</td></tr>`).join('');
    document.getElementById('totalInventario').textContent = vehiculos.length;
}

async function renderDocumentosPendientes() {
    const res = await fetch('/api/expedientes/pendientes', { credentials: 'include' });
    if (res.status === 401) { window.location.replace('login.html'); return; }

    const pendientes = await res.json();
    const tbody = document.getElementById('tablaDocumentos');
    tbody.innerHTML = pendientes.length === 0
        ? '<tr><td colspan="5" style="text-align:center; color:#16a34a;">Sin pendientes — todo el archivo digital está al día.</td></tr>'
        : pendientes.map(p => `
            <tr>
                <td>${p.VIN_Unidad}</td>
                <td>${p.Marca} ${p.Modelo}</td>
                <td>${p.Nombre_Requisito}</td>
                <td>${p.Estado}</td>
                <td>${p.Fecha_Vencimiento ? p.Fecha_Vencimiento.split('T')[0] : '—'}</td>
            </tr>
        `).join('');
}

async function imprimirYRegistrar(nombreReporte) {
    try {
        await fetch('/api/logs/exportacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reporte: nombreReporte })
        });
    } catch (error) {
        console.error('No se pudo registrar la exportación (se imprime de todas formas):', error);
    }
    window.print();
}

document.getElementById('btnImprimirFinanciero').addEventListener('click', () => imprimirYRegistrar('Resumen Financiero'));
document.getElementById('btnImprimirInventario').addEventListener('click', () => imprimirYRegistrar('Inventario por Etapa'));
document.getElementById('btnImprimirDocumentos').addEventListener('click', () => imprimirYRegistrar('Documentos Pendientes'));
document.getElementById('btnImprimirVentas').addEventListener('click', () => imprimirYRegistrar('Detalle de Ventas'));

renderFinanciero();
renderInventario();
renderDocumentosPendientes();
renderVentasDetalle();
