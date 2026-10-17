function ordenAPaso(orden) {
    if (orden <= 1) return 1;
    if (orden <= 3) return 2;
    if (orden <= 8) return 3;
    return 4;
}

async function cargarMisVehiculos() {
    const select = document.getElementById('selectMiVehiculo');
    try {
        const res = await fetch('/api/portal-cliente/vehiculos', { credentials: 'include' });
        if (res.status === 401) { window.location.replace('login.html'); return; }
        if (!res.ok) {
            document.getElementById('estadoVacio').style.display = 'block';
            document.getElementById('estadoVacio').textContent = (await res.json()).error || 'No se pudo cargar tu información.';
            document.querySelector('.selector-card').style.display = 'none';
            return;
        }

        const vehiculos = await res.json();
        if (vehiculos.length === 0) {
            document.querySelector('.selector-card').style.display = 'none';
            document.getElementById('estadoVacio').style.display = 'block';
            return;
        }

        select.innerHTML = vehiculos.map(v =>
            `<option value="${v.VIN_Unidad}">${v.Marca} ${v.Modelo} (${v.Anio}) — ${v.Estado_Actual}</option>`
        ).join('');

        cargarDetalleVehiculo(vehiculos[0].VIN_Unidad);
    } catch (error) {
        console.error(error);
    }
}

document.getElementById('selectMiVehiculo').addEventListener('change', (e) => {
    if (e.target.value) cargarDetalleVehiculo(e.target.value);
});

async function cargarDetalleVehiculo(vin) {
    try {
        const res = await fetch(`/api/portal-cliente/vehiculos/${vin}`, { credentials: 'include' });
        if (!res.ok) return;
        const v = await res.json();

        document.getElementById('tarjetaTracking').style.display = 'block';
        document.getElementById('vinTitulo').textContent = vin;
        document.getElementById('vinSubtitulo').textContent = `${v.Marca} ${v.Modelo} ${v.Anio} — Estado: ${v.Estado_Actual}`;
        document.getElementById('ultimaActualizacionTexto').textContent = v.Fecha_Ultimo_Cambio
            ? new Date(v.Fecha_Ultimo_Cambio).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Sin movimientos registrados';

        const pasoActual = ordenAPaso(v.Orden_Secuencia);
        document.querySelectorAll('.step').forEach(step => {
            const paso = parseInt(step.dataset.paso);
            step.classList.remove('completed', 'active');
            if (paso < pasoActual) step.classList.add('completed');
            else if (paso === pasoActual) step.classList.add('active');
        });

        cargarMisDocumentos(vin);
    } catch (error) {
        console.error(error);
    }
}

async function cargarMisDocumentos(vin) {
    const cont = document.getElementById('docsGrid');
    try {
        const res = await fetch(`/api/portal-cliente/vehiculos/${vin}/documentos`, { credentials: 'include' });
        const docs = res.ok ? await res.json() : [];

        cont.innerHTML = docs.map(d => {
            const entregado = d.Estado === 'Entregado' && d.DOC_ID;
            return `
                <div class="doc-item">
                    <div class="doc-info">
                        <i class="fa-solid ${entregado ? 'fa-file-pdf' : 'fa-hourglass-half'} doc-icon"></i>
                        <div>
                            <span class="doc-name">${d.Nombre_Requisito}</span>
                            <span class="doc-status ${entregado ? '' : 'pendiente'}">
                                <i class="fa-solid ${entregado ? 'fa-check' : 'fa-clock'}"></i> ${entregado ? 'Disponible' : 'En trámite'}
                            </span>
                        </div>
                    </div>
                    ${entregado ? `<a href="/api/archivos/documento/${d.DOC_ID}" target="_blank" class="doc-download" title="Descargar"><i class="fa-solid fa-download"></i></a>` : ''}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error(error);
    }
}

cargarMisVehiculos();


const fmtUsd = (v) => '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGtq = (v) => 'Q' + (parseFloat(v) || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function cargarMisCotizaciones() {
    const tbody = document.getElementById('tablaMisCotizaciones');
    try {
        const res = await fetch('/api/portal-cliente/cotizaciones', { credentials: 'include' });
        if (res.status === 401) { window.location.replace('login.html'); return; }
        const cotizaciones = res.ok ? await res.json() : [];

        if (cotizaciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888; padding:14px;">Aún no has guardado cotizaciones. Usa la calculadora y pulsa "Guardar mi cotización".</td></tr>';
            return;
        }

        tbody.innerHTML = cotizaciones.map(c => {
            const total = parseFloat(c.Costo_Total_USD);
            const tasa = parseFloat(c.Tasa_Cambio_Usada);
            const atendida = c.Estado === 'Atendida';
            return `
                <tr>
                    <td><strong>${c.Marca} ${c.Modelo}</strong> (${c.Anio})</td>
                    <td>${new Date(c.Fecha_Creacion).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td>${fmtUsd(c.Valor_CIF_USD)}</td>
                    <td>${fmtUsd(c.Impuestos_USD)}</td>
                    <td><strong>${fmtUsd(total)}</strong><br><small style="color:#64748b;">${fmtGtq(total * tasa)}</small></td>
                    <td><span class="cot-estado ${atendida ? 'atendida' : ''}">${atendida ? 'Atendida' : 'Recibida por la importadora'}</span></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#dc2626;">No se pudieron cargar tus cotizaciones.</td></tr>';
    }
}
cargarMisCotizaciones();
