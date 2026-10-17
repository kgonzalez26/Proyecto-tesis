let clientesCache = [];
let clienteSeleccionado = null;
let cotizacionesDelCliente = [];
let solicitudesPorCliente = {};

function etiquetaEstado(c) {
    return c.Estado === 'Solicitada' ? 'Solicitud de cliente' : c.Estado.replace('_', ' ');
}

async function cargarSolicitudesPendientes() {
    try {
        const res = await fetch('/api/cotizaciones?estado=Solicitada', { credentials: 'include' });
        const filas = res.ok ? await res.json() : [];
        solicitudesPorCliente = {};
        filas.forEach(f => { solicitudesPorCliente[f.Cliente_ID] = (solicitudesPorCliente[f.Cliente_ID] || 0) + 1; });
    } catch (error) {
        solicitudesPorCliente = {};
    }
}

function fmtUsd(v) { return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtFecha(f) { return f ? new Date(f).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }

async function cargarClientes() {
    const cont = document.getElementById('listaClientes');
    try {
        const res = await fetch('/api/clientes', { credentials: 'include' });
        if (res.status === 401) { window.location.replace('login.html'); return; }
        clientesCache = await res.json();
        await cargarSolicitudesPendientes();
        renderClientes(clientesCache);
    } catch (error) {
        console.error(error);
        cont.innerHTML = '<div style="padding:16px; color:#dc2626; font-size:0.85rem;">Error al cargar clientes.</div>';
    }
}

function renderClientes(lista) {
    const cont = document.getElementById('listaClientes');
    if (lista.length === 0) {
        cont.innerHTML = '<div style="padding:16px; text-align:center; color:#888; font-size:0.85rem;">Sin clientes registrados.</div>';
        return;
    }
    cont.innerHTML = lista.map(c => `
        <div class="item-lista ${clienteSeleccionado === c.CLIENTE_ID ? 'active' : ''}" data-id="${c.CLIENTE_ID}" data-nombre="${c.Nombre_Completo}">
            <div class="item-titulo">${c.Nombre_Completo}${solicitudesPorCliente[c.CLIENTE_ID] ? `<span class="badge-solicitudes" title="Solicitudes de cliente por atender">${solicitudesPorCliente[c.CLIENTE_ID]}</span>` : ''}</div>
            <div class="item-subtitulo">${c.Email}</div>
            <button type="button" class="btn-icon btn-editar-cliente" data-editar="${c.CLIENTE_ID}" title="Editar datos del cliente"><i class="fa-solid fa-pen"></i></button>
        </div>
    `).join('');
}

document.getElementById('inputBuscarCliente').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderClientes(clientesCache.filter(c => c.Nombre_Completo.toLowerCase().includes(q) || c.Email.toLowerCase().includes(q)));
});

document.getElementById('listaClientes').addEventListener('click', (e) => {
    const lapiz = e.target.closest('.btn-editar-cliente');
    if (lapiz) {
        abrirModalCliente(clientesCache.find(c => String(c.CLIENTE_ID) === lapiz.dataset.editar));
        return;
    }
    const item = e.target.closest('.item-lista');
    if (!item) return;
    clienteSeleccionado = parseInt(item.dataset.id);
    document.getElementById('subtituloCotizaciones').textContent = item.dataset.nombre;
    const link = document.getElementById('linkNuevaCotizacion');
    link.href = `calculadoraCostos.html?cliente_id=${clienteSeleccionado}`;
    link.style.display = 'inline-block';
    renderClientes(clientesCache);
    cargarCotizacionesDelCliente();
    mostrarDetalleVacio();
});

async function cargarCotizacionesDelCliente() {
    const cont = document.getElementById('listaCotizaciones');
    cont.innerHTML = '<div style="padding:16px; text-align:center; color:#888; font-size:0.85rem;">Cargando...</div>';
    try {
        const res = await fetch(`/api/cotizaciones?cliente_id=${clienteSeleccionado}`, { credentials: 'include' });
        cotizacionesDelCliente = res.ok ? await res.json() : [];
        renderCotizaciones();
    } catch (error) {
        console.error(error);
        cont.innerHTML = '<div style="padding:16px; color:#dc2626; font-size:0.85rem;">Error al cargar cotizaciones.</div>';
    }
}

function renderCotizaciones() {
    const cont = document.getElementById('listaCotizaciones');
    if (cotizacionesDelCliente.length === 0) {
        cont.innerHTML = '<div style="padding:16px; text-align:center; color:#888; font-size:0.85rem;">Este cliente aún no tiene cotizaciones. Créalas desde la Calculadora.</div>';
        return;
    }
    cont.innerHTML = cotizacionesDelCliente.map(c => `
        <div class="item-lista" data-id="${c.COTIZACION_ID}">
            <div class="item-titulo">${c.Marca} ${c.Modelo} (${c.Anio})</div>
            <div class="item-subtitulo">${fmtUsd(c.Costo_Total_USD)} · ${fmtFecha(c.Fecha_Creacion)}</div>
            <span class="badge-estado badge-${c.Estado}">${etiquetaEstado(c)}</span>
        </div>
    `).join('');
}

document.getElementById('listaCotizaciones').addEventListener('click', (e) => {
    const item = e.target.closest('.item-lista');
    if (!item) return;
    cargarDetalleCotizacion(item.dataset.id);
});

function mostrarDetalleVacio() {
    document.getElementById('headerDetalle').innerHTML = '<h3>Selecciona una cotización</h3>';
    document.getElementById('contenidoDetalle').outerHTML = `
        <div id="contenidoDetalle" class="detalle-vacio">
            Elige una de las cotizaciones guardadas de este cliente para ver el desglose.
        </div>`;
}

async function cargarDetalleCotizacion(id) {
    try {
        const res = await fetch(`/api/cotizaciones/${id}`, { credentials: 'include' });
        if (!res.ok) { alert('No se pudo cargar la cotización.'); return; }
        renderDetalle(await res.json());
    } catch (error) {
        console.error(error);
    }
}

function renderDetalle(c) {
    document.getElementById('headerDetalle').innerHTML = `
        <h3>${c.Marca} ${c.Modelo} (${c.Anio})</h3>
        <p>Cotización #${c.COTIZACION_ID} — <span class="badge-estado badge-${c.Estado}">${etiquetaEstado(c)}</span></p>
    `;

    const margen = parseFloat(c.Margen_Bruto_USD || 0);
    const esDeCliente = c.Origen === 'Cliente';

    let acciones = '';
    if (c.Estado === 'Pendiente_Validacion') {
        acciones = `
            <div class="acciones-cotizacion">
                <button class="btn-accion btn-validar" id="btnValidar"><i class="fa-solid fa-check"></i> Validar</button>
                <button class="btn-accion btn-rechazar" id="btnRechazar"><i class="fa-solid fa-xmark"></i> Rechazar</button>
            </div>
            <p class="nota-envio">Validar requiere rol Administrador.</p>
        `;
    } else if (c.Estado === 'Aprobada') {
        acciones = `
            <div class="acciones-cotizacion">
                <button class="btn-accion btn-enviar" id="btnImprimirCotizacion"><i class="fa-solid fa-file-pdf"></i> Imprimir cotización</button>
            </div>
            <p class="nota-envio">Abre una versión para el cliente. Desde el diálogo de impresión puedes imprimirla o guardarla como PDF.</p>
        `;
    } else if (c.Estado === 'Enviada') {
        acciones = `
            <div class="acciones-cotizacion">
                <button class="btn-accion btn-enviar" id="btnImprimirCotizacion"><i class="fa-solid fa-file-pdf"></i> Imprimir cotización</button>
            </div>
            <p class="nota-envio">Esta cotización conserva el estado histórico "Enviada". Puedes volver a imprimirla o guardarla como PDF.</p>
        `;
    } else if (c.Estado === 'Rechazada') {
        acciones = `<p class="nota-envio"><i class="fa-solid fa-circle-xmark" style="color:var(--rojo-error);"></i> Rechazada el ${fmtFecha(c.Fecha_Validacion)}.</p>`;
    } else if (c.Estado === 'Solicitada') {
        acciones = `
            <div class="acciones-cotizacion">
                <button class="btn-accion btn-enviar" id="btnAtender"><i class="fa-solid fa-check-double"></i> Marcar como atendida</button>
            </div>
            <p class="nota-envio">El cliente guardó esta estimación desde su portal. Márcala como atendida cuando le hayas dado seguimiento.</p>
        `;
    } else if (c.Estado === 'Atendida') {
        acciones = `<p class="nota-envio"><i class="fa-solid fa-circle-check" style="color:var(--verde-exito);"></i> Atendida el ${fmtFecha(c.Fecha_Validacion)}.</p>`;
    }

    let bloqueVenta = '';
    if (!esDeCliente && ['Aprobada', 'Enviada'].includes(c.Estado)) {
        const precioVendido = c.venta ? parseFloat(c.venta.Precio_Venta_Real_USD) : 0;
        const margenReal = precioVendido - parseFloat(c.Costo_Total_USD);
        const pctReal = precioVendido > 0 ? (margenReal / precioVendido) * 100 : 0;
        bloqueVenta = `
            <div class="cierre-venta">
                <h5><i class="fa-solid fa-handshake"></i> Cierre de venta</h5>
                ${c.venta
                    ? `<div class="venta-registrada">Registrada: ${c.venta.Marca} ${c.venta.Modelo} (${c.venta.VIN_Unidad}) — vendido ${fmtUsd(precioVendido)} · margen real ${fmtUsd(margenReal)} (${pctReal.toFixed(1)}%)</div>`
                    : '<p class="nota-envio" style="margin-top:0; margin-bottom:8px;">Aún no se ha registrado el precio final de venta.</p>'}
                <div class="fila-venta">
                    <select id="selectVinVenta"><option value="">Cargando vehículos...</option></select>
                    <input type="number" id="inputPrecioFinal" min="0" step="0.01" placeholder="Precio final (USD)" ${c.venta ? `value="${precioVendido}"` : ''}>
                    <button class="btn-accion btn-enviar" id="btnRegistrarVenta">${c.venta ? 'Corregir' : 'Registrar'}</button>
                </div>
                <p class="nota-envio">Margen real = precio final − costo de esta cotización (${fmtUsd(c.Costo_Total_USD)}). No cambia el estado logístico del vehículo.</p>
            </div>
        `;
    }

    const contenedorViejo = document.getElementById('contenidoDetalle');
    const nuevo = document.createElement('div');
    nuevo.id = 'contenidoDetalle';
    nuevo.className = 'detalle-body';
    nuevo.innerHTML = `
        <div class="desglose">
            <div class="fila-desglose"><span>Precio en origen</span><span>${fmtUsd(c.Precio_Origen_USD)}</span></div>
            <div class="fila-desglose"><span>Flete</span><span>${fmtUsd(c.Flete_USD)}</span></div>
            <div class="fila-desglose"><span>Seguro</span><span>${fmtUsd(c.Seguro_USD)}</span></div>
            <div class="fila-desglose"><span>Valor CIF</span><span>${fmtUsd(c.Valor_CIF_USD)}</span></div>
            <div class="fila-desglose"><span>Impuestos (DAI+IVA+IPRIMA)</span><span>${fmtUsd(parseFloat(c.DAI_USD) + parseFloat(c.IVA_USD) + parseFloat(c.IPRIMA_USD))}</span></div>
            <div class="fila-desglose"><span>Otros gastos</span><span>${fmtUsd(c.Otros_Gastos_Estimados_USD)}</span></div>
            <div class="fila-desglose total"><span>${esDeCliente ? 'Total estimado por el cliente' : 'Costo Total'}</span><span>${fmtUsd(c.Costo_Total_USD)}</span></div>
            ${esDeCliente ? '' : `
            <div class="fila-desglose"><span>Precio de venta propuesto</span><span>${fmtUsd(c.Precio_Venta_Propuesto_USD)}</span></div>
            <div class="fila-desglose ${margen >= 0 ? 'margen-positivo' : 'margen-negativo'}"><span>Margen proyectado</span><span>${fmtUsd(margen)} (${parseFloat(c.Margen_Porcentaje || 0).toFixed(1)}%)</span></div>`}
        </div>
        <div class="meta-info">
            Creada: ${fmtFecha(c.Fecha_Creacion)}<br>
            ${c.Fecha_Validacion ? `Validada: ${fmtFecha(c.Fecha_Validacion)}<br>` : ''}
        </div>
        ${acciones}
        ${bloqueVenta}
    `;
    contenedorViejo.replaceWith(nuevo);

    document.getElementById('btnValidar')?.addEventListener('click', () => accionCotizacion(c.COTIZACION_ID, 'validar'));
    document.getElementById('btnRechazar')?.addEventListener('click', () => accionCotizacion(c.COTIZACION_ID, 'rechazar'));
    document.getElementById('btnImprimirCotizacion')?.addEventListener('click', () => imprimirCotizacion(c));
    document.getElementById('btnAtender')?.addEventListener('click', () => accionCotizacion(c.COTIZACION_ID, 'atender'));

    if (bloqueVenta) {
        cargarVehiculosParaVenta(c);
        document.getElementById('btnRegistrarVenta').addEventListener('click', () => registrarVenta(c));
    }
}

async function cargarVehiculosParaVenta(c) {
    const select = document.getElementById('selectVinVenta');
    if (!select) return;
    try {
        const res = await fetch('/api/vehiculos', { credentials: 'include' });
        const todos = res.ok ? await res.json() : [];
        const candidatos = c.Cliente_ID ? todos.filter(v => v.Cliente_ID === c.Cliente_ID) : todos;
        if (candidatos.length === 0) {
            select.innerHTML = '<option value="">No hay vehículos registrados para este cliente</option>';
            return;
        }
        select.innerHTML = '<option value="">Selecciona el vehículo vendido...</option>' +
            candidatos.map(v => `<option value="${v.VIN_Unidad}">${v.Marca} ${v.Modelo} (${v.Anio}) — ${v.VIN_Unidad}</option>`).join('');
        if (c.venta) select.value = c.venta.VIN_Unidad;
    } catch (error) {
        select.innerHTML = '<option value="">No se pudieron cargar los vehículos</option>';
    }
}

async function registrarVenta(c) {
    const vin = document.getElementById('selectVinVenta').value;
    const precio = parseFloat(document.getElementById('inputPrecioFinal').value);
    if (!vin) { alert('Selecciona el vehículo vendido.'); return; }
    if (!(precio > 0)) { alert('Ingresa un precio final mayor a cero.'); return; }

    const cuerpo = { vin_unidad: vin, cotizacion_id: c.COTIZACION_ID, precio_venta_real_usd: precio };
    if (!c.venta) {
        const h = new Date();
        cuerpo.fecha_venta = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
    }

    try {
        const res = await fetch('/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(cuerpo)
        });
        const data = await res.json();
        if (res.ok) {
            await cargarDetalleCotizacion(c.COTIZACION_ID);
        } else {
            alert(data.error || 'No se pudo registrar la venta.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caracter]);
}

function imprimirCotizacion(c) {
    const ventana = window.open('', '_blank');
    if (!ventana) {
        alert('Permite las ventanas emergentes para generar la cotización imprimible.');
        return;
    }

    const cliente = clientesCache.find(item => Number(item.CLIENTE_ID) === Number(c.Cliente_ID));
    const nombreCliente = cliente?.Nombre_Completo || 'Cliente';
    const gastos = parseFloat(c.Otros_Gastos_Estimados_USD) || 0;
    const tipoCambio = parseFloat(c.Tasa_Cambio_Usada) || 0;
    const equivalenteGtq = (parseFloat(c.Costo_Total_USD) || 0) * tipoCambio;
    const filas = [
        ['Precio del vehículo en origen', c.Precio_Origen_USD],
        ['Flete marítimo', c.Flete_USD],
        ['Seguro de transporte', c.Seguro_USD],
        ['Valor CIF', c.Valor_CIF_USD],
        ['DAI', c.DAI_USD],
        ['IVA', c.IVA_USD],
        ['IPRIMA estimado', c.IPRIMA_USD],
        ['Gastos operativos estimados', gastos]
    ];
    const filasHtml = filas.map(([etiqueta, monto]) => `
        <tr><td>${escaparHtml(etiqueta)}</td><td>${fmtUsd(parseFloat(monto) || 0)}</td></tr>
    `).join('');
    const fecha = new Date().toLocaleDateString('es-GT', { dateStyle: 'long' });

    ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización #${escaparHtml(c.COTIZACION_ID)}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 32px; color: #263746; font-family: Arial, sans-serif; }
        @page { size: letter; margin: 0; }
        .documento { max-width: 760px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #6a89a7; padding-bottom: 18px; }
        h1 { margin: 0 0 6px; font-size: 24px; }
        p { margin: 5px 0; color: #586878; }
        .folio { text-align: right; }
        h2 { margin: 26px 0 10px; font-size: 17px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 11px 10px; border-bottom: 1px solid #dce3e8; text-align: left; }
        th:last-child, td:last-child { text-align: right; white-space: nowrap; }
        th { background: #f0f4f7; font-size: 12px; text-transform: uppercase; }
        .total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; padding: 16px; background: #edf3f7; border-left: 4px solid #6a89a7; font-size: 18px; font-weight: 700; }
        .conversion { text-align: right; margin-top: 8px; }
        .nota { margin-top: 24px; font-size: 12px; line-height: 1.5; }
        .acciones { margin-top: 24px; text-align: center; }
        button { padding: 10px 18px; border: 0; border-radius: 4px; background: #56718a; color: white; font-size: 14px; font-weight: 700; cursor: pointer; }
        @media print { body { padding: 16mm; } .acciones { display: none; } }
        @media (max-width: 560px) { body { padding: 20px 14px; } header { flex-direction: column; } .folio { text-align: left; } }
    </style>
</head>
<body>
    <main class="documento">
        <header>
            <div><h1>Importadora Los Gemelos</h1><p>Cotización de importación de vehículo</p></div>
            <div class="folio"><strong>Cotización #${escaparHtml(c.COTIZACION_ID)}</strong><p>${escaparHtml(fecha)}</p></div>
        </header>
        <h2>Dirigida a</h2>
        <p>${escaparHtml(nombreCliente)}</p>
        <h2>Vehículo</h2>
        <p>${escaparHtml(c.Marca)} ${escaparHtml(c.Modelo)} (${escaparHtml(c.Anio)})${c.Cilindrada_CC ? ` · ${escaparHtml(c.Cilindrada_CC)} cc` : ''}</p>
        <h2>Desglose estimado</h2>
        <table><thead><tr><th>Concepto</th><th>Monto (USD)</th></tr></thead><tbody>${filasHtml}</tbody></table>
        <div class="total"><span>Total estimado</span><span>${fmtUsd(parseFloat(c.Costo_Total_USD) || 0)}</span></div>
        ${tipoCambio ? `<p class="conversion">Equivalente aproximado: Q${equivalenteGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Tasa utilizada: Q${tipoCambio.toFixed(3)} por USD 1.00</p>` : ''}
        <p class="nota">Esta cotización es una estimación sujeta a cambios en tasas, impuestos, gastos aduanales y costos de transporte. Los montos finales se confirmarán al completar el proceso de importación.</p>
        <div class="acciones"><button type="button" id="btnImprimirDocumento">Imprimir o guardar como PDF</button></div>
    </main>
</body>
</html>`);
    ventana.document.close();
    ventana.document.getElementById('btnImprimirDocumento').addEventListener('click', () => {
        ventana.focus();
        ventana.print();
    });
}

async function accionCotizacion(id, accion) {
    const metodos = { validar: 'PATCH', rechazar: 'PATCH', atender: 'PATCH' };
    const rutas = { validar: `/api/cotizaciones/${id}/validar`, rechazar: `/api/cotizaciones/${id}/rechazar`, atender: `/api/cotizaciones/${id}/atender` };

    if (accion === 'rechazar' && !confirm('¿Rechazar esta cotización?')) return;

    try {
        const res = await fetch(rutas[accion], { method: metodos[accion], credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            await cargarCotizacionesDelCliente();
            await cargarDetalleCotizacion(id);
            await cargarSolicitudesPendientes();
            renderClientes(clientesCache);
        } else {
            alert(data.error || 'Ocurrió un error.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

const modalCliente = document.getElementById('modalNuevoCliente');
let clienteEnEdicion = null;

function abrirModalCliente(cliente = null) {
    clienteEnEdicion = cliente ? cliente.CLIENTE_ID : null;
    document.getElementById('tituloModalCliente').textContent = cliente ? 'Editar cliente' : 'Nuevo Cliente';
    document.getElementById('clienteNombre').value = cliente?.Nombre_Completo || '';
    document.getElementById('clienteEmail').value = cliente?.Email || '';
    document.getElementById('clienteTelefono').value = cliente?.Telefono || '';
    document.getElementById('clienteNit').value = cliente?.NIT || '';
    modalCliente.classList.add('active');
}
function cerrarModalCliente() {
    modalCliente.classList.remove('active');
    clienteEnEdicion = null;
    document.getElementById('formNuevoCliente').reset();
}

document.getElementById('btnNuevoCliente').addEventListener('click', () => abrirModalCliente());
document.getElementById('btnCerrarModalCliente').addEventListener('click', cerrarModalCliente);
document.getElementById('btnCancelarCliente').addEventListener('click', cerrarModalCliente);

document.getElementById('formNuevoCliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombre_completo: document.getElementById('clienteNombre').value.trim(),
        email: document.getElementById('clienteEmail').value.trim(),
        telefono: document.getElementById('clienteTelefono').value.trim() || null,
        nit: document.getElementById('clienteNit').value.trim() || null
    };
    const editando = clienteEnEdicion !== null;

    try {
        const res = await fetch(editando ? `/api/clientes/${clienteEnEdicion}` : '/api/clientes', {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            if (editando && clienteSeleccionado === clienteEnEdicion) {
                document.getElementById('subtituloCotizaciones').textContent = payload.nombre_completo;
            }
            cerrarModalCliente();
            cargarClientes();
        } else {
            alert(data.error || (editando ? 'No se pudo actualizar el cliente.' : 'No se pudo crear el cliente.'));
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
});

cargarClientes();
