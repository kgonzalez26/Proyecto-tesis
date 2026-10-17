let catalogoEstados = [];
let datosFlota = [];

async function cargarCatalogoEstados() {
    const res = await fetch('/api/catalogos/estados-logisticos', { credentials: 'include' });
    catalogoEstados = await res.json();
}

function diasDesde(fechaIso) {
    if (!fechaIso) return null;
    const ms = Date.now() - new Date(fechaIso).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function cargarFlota() {
    const tbody = document.getElementById('tablaTrackingBody');
    try {
        const response = await fetch('/api/logistica', { credentials: 'include' });
        if (response.status === 401) { window.location.replace('login.html'); return; }
        if (response.status === 403) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#dc2626; padding:20px;">No tienes permisos para ver esta sección.</td></tr>';
            return;
        }
        if (!response.ok) throw new Error('Error al cargar la flota');

        datosFlota = await response.json();
        renderTabla();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#dc2626; padding:20px;">Error al conectar con la API.</td></tr>';
    }
}

function renderTabla() {
    const tbody = document.getElementById('tablaTrackingBody');
    const umbral = parseInt(document.getElementById('inputUmbral').value) || 10;

    if (datosFlota.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding:20px;">No hay vehículos activos.</td></tr>';
        actualizarKPIs([], umbral);
        return;
    }

    tbody.innerHTML = '';
    datosFlota.forEach(v => {
        const dias = diasDesde(v.Fecha_Ultimo_Cambio);
        const atrasado = dias !== null && dias >= umbral;

        const opciones = catalogoEstados.map(e =>
            `<option value="${e.ESTADO_ID}" ${e.Nombre_Estado === v.Estado_Actual ? 'selected' : ''}>${e.Nombre_Estado}</option>`
        ).join('');

        const fila = document.createElement('tr');
        fila.className = atrasado ? 'fila-alerta' : '';
        fila.innerHTML = `
            <td><strong>${v.VIN_Unidad}</strong></td>
            <td>${v.Marca} ${v.Modelo} (${v.Anio})</td>
            <td>${v.Cliente || 'Inventario propio'}</td>
            <td>${v.Estado_Actual}</td>
            <td><span class="dias-badge ${atrasado ? 'atrasado' : ''}">${atrasado ? '<i class="fa-solid fa-triangle-exclamation icono-alerta"></i>' : ''}${dias === null ? '—' : dias + ' d'}</span></td>
            <td>
                <div class="estado-control">
                    <select class="select-estado" data-vin="${v.VIN_Unidad}">${opciones}</select>
                    <button class="btn-actualizar" data-vin="${v.VIN_Unidad}" disabled><i class="fa-solid fa-check"></i></button>
                </div>
            </td>
            <td><a href="expediente.html?vin=${v.VIN_Unidad}" class="btn-ver-expediente">Ver expediente</a></td>
        `;
        tbody.appendChild(fila);
    });

    actualizarKPIs(datosFlota, umbral);
}

function actualizarKPIs(flota, umbral) {
    const dias = flota.map(v => diasDesde(v.Fecha_Ultimo_Cambio)).filter(d => d !== null);
    const atrasados = dias.filter(d => d >= umbral).length;
    const promedio = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0;

    document.getElementById('kpiTotal').textContent = flota.length;
    document.getElementById('kpiAtrasados').textContent = atrasados;
    document.getElementById('kpiPromedio').textContent = promedio;
}

document.getElementById('inputUmbral').addEventListener('input', renderTabla);

document.getElementById('tablaTrackingBody').addEventListener('change', (e) => {
    if (!e.target.classList.contains('select-estado')) return;
    const vin = e.target.dataset.vin;
    const btn = document.querySelector(`.btn-actualizar[data-vin="${vin}"]`);
    btn.disabled = false;
    btn.style.backgroundColor = 'var(--color-exito)';
});

document.getElementById('tablaTrackingBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-actualizar');
    if (!btn) return;
    const vin = btn.dataset.vin;
    const select = document.querySelector(`.select-estado[data-vin="${vin}"]`);
    const estado_id = select.value;

    try {
        const res = await fetch(`/api/logistica/${vin}/estado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ estado_id })
        });
        const data = await res.json();
        if (res.ok) {
            cargarFlota();
        } else {
            alert(data.error || 'Ocurrió un error al actualizar el estado.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
});

(async function inicializar() {
    await cargarCatalogoEstados();
    await cargarFlota();
})();
