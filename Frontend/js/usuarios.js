let modoEdicion = false;
let idUsuarioActual = null;
let idResetTarget = null;

async function cargarRoles() {
    const select = document.getElementById('rol');
    try {
        const res = await fetch('/api/roles', { credentials: 'include' });
        const roles = await res.json();
        select.innerHTML = '<option value="">Seleccione un rol...</option>' +
            roles.map(r => `<option value="${r.Nombre_Rol}">${r.Nombre_Rol}</option>`).join('');
    } catch (error) {
        console.error('Error al cargar roles:', error);
        select.innerHTML = '<option value="">No se pudieron cargar los roles</option>';
    }
}

async function cargarUsuarios() {
    const tbody = document.getElementById('tablaUsuarios');
    try {
        const res = await fetch('/api/usuarios', { credentials: 'include' });
        if (res.status === 401) { window.location.replace('login.html'); return; }
        if (res.status === 403) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#dc2626; padding:20px;">No tienes permisos para ver esta sección.</td></tr>';
            return;
        }
        if (!res.ok) throw new Error('Error al listar usuarios');

        const usuarios = await res.json();
        tbody.innerHTML = '';
        poblarFiltroUsuariosLog(usuarios);

        usuarios.forEach(user => {
            const roles = user.Roles || 'Sin rol';
            const activo = user.Estado_Cuenta === 1;
            const esCliente = roles.split(',').includes('Cliente');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.USER_ID}</td>
                <td><strong>${user.Nombre_Usuario}</strong><br><small style="color:#666;">${user.Email}</small></td>
                <td>
                    <span class="badge">${roles}</span>
                    ${activo ? '' : '<span class="badge badge-inactivo">Inactivo</span>'}
                    ${esCliente ? `<div style="font-size:0.75rem; margin-top:4px; color:${user.Cliente_Vinculado ? '#166534' : '#b45309'};">${user.Cliente_Vinculado ? 'Vinculado a: ' + user.Cliente_Vinculado : 'Sin vincular a un cliente'}</div>` : ''}
                </td>
                <td>
                    <div class="actions-btns">
                        <button class="btn-action btn-edit" title="Editar"
                            data-id="${user.USER_ID}" data-nombre="${user.Nombre_Usuario}" data-email="${user.Email}" data-rol="${(roles.split(',')[0] || '')}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-action btn-reset" title="Restablecer Contraseña" data-id="${user.USER_ID}" data-email="${user.Email}">
                            <i class="fa-solid fa-key"></i>
                        </button>
                        ${esCliente ? `<button class="btn-action btn-link" title="Vincular con un cliente" data-id="${user.USER_ID}" data-email="${user.Email}" data-cliente="${user.Cliente_Vinculado_ID || ''}"><i class="fa-solid fa-link"></i></button>` : ''}
                        <button class="btn-action btn-toggle" title="${activo ? 'Desactivar' : 'Reactivar'}" data-id="${user.USER_ID}" data-activo="${activo}">
                            <i class="fa-solid ${activo ? 'fa-ban' : 'fa-rotate-left'}"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#dc2626; padding:20px;">Error al conectar con la API.</td></tr>';
    }
}

document.getElementById('usuarioForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const rol = document.getElementById('rol').value;

    if (!rol) { alert('Selecciona un rol.'); return; }

    try {
        let res;
        if (modoEdicion) {
            res = await fetch(`/api/usuarios/${idUsuarioActual}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nombre, email, rol })
            });
        } else {
            const contrasena = document.getElementById('contrasena').value;
            if (!contrasena || contrasena.length < 8) { alert('La contraseña inicial debe tener al menos 8 caracteres.'); return; }
            res = await fetch('/api/auth/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nombre, email, contrasena, rol })
            });
        }

        const data = await res.json();
        if (res.ok) {
            if (data.mensaje && /vinculada/.test(data.mensaje)) alert(data.mensaje);
            cancelarEdicion();
            cargarUsuarios();
        } else {
            alert(data.error || 'Ocurrió un error.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
});

function prepararEdicion(id, nombre, email, rol) {
    modoEdicion = true;
    idUsuarioActual = id;
    document.getElementById('nombre').value = nombre;
    document.getElementById('email').value = email;
    document.getElementById('rol').value = rol;
    document.getElementById('passContainer').style.display = 'none';

    document.getElementById('formCard').classList.add('modo-edicion');
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-save"></i> Guardar Datos';
    document.getElementById('btnCancel').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
    modoEdicion = false;
    idUsuarioActual = null;
    document.getElementById('usuarioForm').reset();
    document.getElementById('passContainer').style.display = 'flex';
    document.getElementById('formCard').classList.remove('modo-edicion');
    document.getElementById('btnSubmit').innerHTML = '<i class="fa-solid fa-plus"></i> Registrar Usuario';
    document.getElementById('btnCancel').style.display = 'none';
}
document.getElementById('btnCancel').addEventListener('click', cancelarEdicion);

function abrirModalReset(id, email) {
    idResetTarget = id;
    document.getElementById('resetUserText').innerText = `Restablecer clave para: ${email}`;
    document.getElementById('modalReset').style.display = 'flex';
}
function cerrarModalReset() {
    document.getElementById('modalReset').style.display = 'none';
    document.getElementById('nuevaContrasena').value = '';
}
document.getElementById('btnCerrarModalReset').addEventListener('click', cerrarModalReset);

document.getElementById('btnEjecutarReset').addEventListener('click', async () => {
    const nueva = document.getElementById('nuevaContrasena').value;
    if (!nueva || nueva.length < 8) { alert('Mínimo 8 caracteres.'); return; }

    try {
        const res = await fetch(`/api/usuarios/${idResetTarget}/reset-password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nueva_contrasena: nueva })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Contraseña restablecida exitosamente.');
            cerrarModalReset();
        } else {
            alert(data.error || 'Error al restablecer la contraseña.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
});

async function toggleEstadoUsuario(id, activo) {
    const confirmacion = activo
        ? '¿Desactivar a este usuario? No podrá iniciar sesión hasta reactivarlo.'
        : '¿Reactivar a este usuario?';
    if (!confirm(confirmacion)) return;

    try {
        const res = await fetch(`/api/usuarios/${id}/estado`, { method: 'PATCH', credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            cargarUsuarios();
        } else {
            alert(data.error || 'Error al cambiar el estado del usuario.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

document.getElementById('tablaUsuarios').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
        prepararEdicion(editBtn.dataset.id, editBtn.dataset.nombre, editBtn.dataset.email, editBtn.dataset.rol);
        return;
    }
    const resetBtn = e.target.closest('.btn-reset');
    if (resetBtn) {
        abrirModalReset(resetBtn.dataset.id, resetBtn.dataset.email);
        return;
    }
    const linkBtn = e.target.closest('.btn-link');
    if (linkBtn) {
        abrirModalVincular(linkBtn.dataset.id, linkBtn.dataset.email, linkBtn.dataset.cliente);
        return;
    }
    const toggleBtn = e.target.closest('.btn-toggle');
    if (toggleBtn) {
        toggleEstadoUsuario(toggleBtn.dataset.id, toggleBtn.dataset.activo === 'true');
    }
});

const ACCIONES_CONOCIDAS = [
    'login', 'crear_vehiculo', 'editar_vehiculo', 'cambiar_estado', 'editar_datos_aduaneros', 'editar_requisito',
    'subir_documento', 'subir_foto', 'eliminar_foto',
    'crear_cotizacion', 'validar_cotizacion', 'rechazar_cotizacion', 'enviar_cotizacion',
    'registrar_venta', 'cotizacion_cliente', 'atender_solicitud', 'crear_cliente', 'editar_cliente', 'desactivar_cliente',
    'editar_usuario', 'vincular_cliente', 'registro_cliente', 'reset_password', 'cambiar_estado_usuario', 'exportar_reporte'
];

function poblarFiltroAcciones() {
    const select = document.getElementById('filtroLogAccion');
    select.innerHTML = '<option value="">Todas</option>' +
        ACCIONES_CONOCIDAS.map(a => `<option value="${a}">${a.replace(/_/g, ' ')}</option>`).join('');
}

async function poblarFiltroUsuariosLog(usuarios) {
    const select = document.getElementById('filtroLogUsuario');
    select.innerHTML = '<option value="">Todos</option>' +
        usuarios.map(u => `<option value="${u.USER_ID}">${u.Nombre_Usuario}</option>`).join('');
}

async function cargarLogs() {
    const tbody = document.getElementById('tablaLogs');
    const params = new URLSearchParams();
    const usuarioId = document.getElementById('filtroLogUsuario').value;
    const accion = document.getElementById('filtroLogAccion').value;
    const desde = document.getElementById('filtroLogDesde').value;
    const hasta = document.getElementById('filtroLogHasta').value;
    if (usuarioId) params.set('usuario_id', usuarioId);
    if (accion) params.set('accion', accion);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);

    try {
        const res = await fetch(`/api/logs?${params.toString()}`, { credentials: 'include' });
        if (res.status === 403) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#dc2626;">No tienes permisos para ver la bitácora.</td></tr>';
            return;
        }
        const logs = res.ok ? await res.json() : [];
        tbody.innerHTML = logs.length === 0
            ? '<tr><td colspan="4" style="text-align:center; color:#888;">Sin actividad registrada en este filtro.</td></tr>'
            : logs.map(l => `
                <tr>
                    <td style="white-space:nowrap;">${new Date(l.Fecha).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>${l.Nombre_Usuario_Snapshot || '—'}</td>
                    <td><span class="badge">${l.Accion.replace(/_/g, ' ')}</span></td>
                    <td>${l.Descripcion || '—'}</td>
                </tr>
            `).join('');
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#dc2626;">Error al cargar la bitácora.</td></tr>';
    }
}

document.getElementById('btnFiltrarLogs').addEventListener('click', cargarLogs);
poblarFiltroAcciones();

cargarRoles();
cargarUsuarios().then(cargarLogs);


let idVincularTarget = null;

async function abrirModalVincular(userId, email, clienteActualId) {
    idVincularTarget = userId;
    document.getElementById('vincularUserText').textContent = `Cuenta: ${email}`;
    const select = document.getElementById('selectVincularCliente');
    select.innerHTML = '<option value="">Cargando...</option>';
    document.getElementById('modalVincular').style.display = 'flex';

    try {
        const res = await fetch('/api/clientes', { credentials: 'include' });
        const clientes = res.ok ? await res.json() : [];
        const disponibles = clientes.filter(c => !c.USER_ID || String(c.CLIENTE_ID) === String(clienteActualId));
        select.innerHTML = '<option value="">— Sin vincular —</option>' +
            disponibles.map(c => `<option value="${c.CLIENTE_ID}">${c.Nombre_Completo} (${c.Email})</option>`).join('');
        select.value = clienteActualId || '';
    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">No se pudieron cargar los clientes</option>';
    }
}

function cerrarModalVincular() {
    document.getElementById('modalVincular').style.display = 'none';
}
document.getElementById('btnCerrarVinculo').addEventListener('click', cerrarModalVincular);

document.getElementById('btnGuardarVinculo').addEventListener('click', async () => {
    const cliente_id = document.getElementById('selectVincularCliente').value || null;
    try {
        const res = await fetch(`/api/usuarios/${idVincularTarget}/cliente`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cliente_id })
        });
        const data = await res.json();
        if (res.ok) {
            cerrarModalVincular();
            cargarUsuarios();
        } else {
            alert(data.error || 'No se pudo vincular la cuenta.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
});
