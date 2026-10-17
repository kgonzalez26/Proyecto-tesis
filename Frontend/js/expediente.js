        const params = new URLSearchParams(window.location.search);
        const vin = params.get('vin');
        let expIdActual = null;

        if (!vin) {
            document.querySelector('.main-container').innerHTML = '<div class="card">No se especificó un VIN. <a href="pantallaPrincipal.html">Volver</a></div>';
        } else {
            document.addEventListener('DOMContentLoaded', inicializar);
        }

        async function inicializar() {
            document.getElementById('tituloVin').textContent = vin;
            await cargarClientesSelect();
            await cargarVehiculo();
            await cargarEstadosCatalogo();
            await cargarHistorialEstados();
            if (expIdActual) {
                await cargarChecklist();
            }

            await cargarFotos();

            document.getElementById('formVehiculo').addEventListener('submit', guardarVehiculo);
            document.getElementById('formAduanero').addEventListener('submit', guardarDatosAduaneros);
            document.getElementById('btnCambiarEstado').addEventListener('click', cambiarEstado);
            document.getElementById('formSubirDoc').addEventListener('submit', subirDocumento);
            document.getElementById('formSubirFotos').addEventListener('submit', subirFotos);
        }

        async function cargarFotos() {
            try {
                const res = await fetch(`/api/fotos/${vin}`, { credentials: 'include' });
                const fotos = res.ok ? await res.json() : [];
                renderGaleria(fotos);
            } catch (e) { console.error(e); }
        }

        function renderGaleria(fotos) {
            const cont = document.getElementById('galeriaFotos');
            if (fotos.length === 0) {
                cont.innerHTML = '<p style="font-size:0.82rem; color:#94a3b8;">Aún no hay fotos.</p>';
                return;
            }
            cont.innerHTML = fotos.map(f => `
                <div style="position:relative;">
                    <a href="/api/archivos/foto/${f.FOTO_ID}" target="_blank">
                        <img src="/api/archivos/foto/${f.FOTO_ID}" alt="${f.Categoria}" style="width:100%; height:90px; object-fit:cover; border-radius:6px; border:1px solid var(--border-color);">
                    </a>
                    <span style="position:absolute; top:4px; left:4px; background:rgba(0,0,0,0.6); color:white; font-size:0.65rem; padding:2px 6px; border-radius:4px;">${f.Categoria}</span>
                    <button type="button" class="btn-borrar-foto" data-id="${f.FOTO_ID}" title="Eliminar"
                        style="position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.85); color:white; border:none; border-radius:4px; width:22px; height:22px; cursor:pointer; font-size:0.7rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        document.getElementById('galeriaFotos').addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-borrar-foto');
            if (!btn) return;
            if (!confirm('¿Eliminar esta foto?')) return;
            try {
                const res = await fetch(`/api/fotos/${btn.dataset.id}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) cargarFotos();
                else alert((await res.json()).error || 'No se pudo eliminar.');
            } catch (err) { console.error(err); }
        });

        async function subirFotos(e) {
            e.preventDefault();
            const categoria = document.getElementById('categoriaFoto').value;
            const archivos = document.getElementById('archivosFotos').files;
            if (archivos.length === 0) { alert('Selecciona al menos una foto.'); return; }

            const formData = new FormData();
            formData.append('categoria', categoria);
            Array.from(archivos).forEach(f => formData.append('fotos', f));

            try {
                const res = await fetch(`/api/fotos/${vin}`, { method: 'POST', credentials: 'include', body: formData });
                const data = await res.json();
                if (res.ok) {
                    document.getElementById('formSubirFotos').reset();
                    cargarFotos();
                } else {
                    alert(data.error || 'Error al subir las fotos.');
                }
            } catch (err) { console.error(err); }
        }

        async function cargarClientesSelect() {
            try {
                const res = await fetch('/api/clientes', { credentials: 'include' });
                if (!res.ok) return;
                const clientes = await res.json();
                const select = document.getElementById('edCliente');
                select.innerHTML = '<option value="">Inventario propio</option>' +
                    clientes.map(c => `<option value="${c.CLIENTE_ID}">${c.Nombre_Completo}</option>`).join('');
            } catch (e) { console.error(e); }
        }

        async function cargarVehiculo() {
            try {
                const res = await fetch(`/api/vehiculos/${vin}`, { credentials: 'include' });
                if (res.status === 401) { window.location.replace('login.html'); return; }
                if (!res.ok) { alert('Vehículo no encontrado.'); return; }
                const v = await res.json();

                document.getElementById('edMarca').value = v.Marca || '';
                document.getElementById('edModelo').value = v.Modelo || '';
                document.getElementById('edAnio').value = v.Anio || '';
                document.getElementById('edCilindrada').value = v.Cilindrada_CC || '';
                document.getElementById('edOrigen').value = v.Origen_Subasta || 'Copart';
                document.getElementById('edLote').value = v.Lote_Subasta || '';
                document.getElementById('edPrecio').value = v.Precio_Compra_USD || '';
                document.getElementById('edCliente').value = v.Cliente_ID || '';
                document.getElementById('estadoActualTexto').textContent = v.Estado_Actual || '—';

                document.getElementById('edFechaLlegada').value = v.Fecha_Llegada ? v.Fecha_Llegada.split('T')[0] : '';
                document.getElementById('edAduana').value = v.Aduana_Ingreso || '';
                document.getElementById('edCanal').value = v.Canal_Verificacion || '';

                expIdActual = v.EXP_ID;
            } catch (e) { console.error(e); }
        }

        async function cargarEstadosCatalogo() {
            try {
                const res = await fetch('/api/catalogos/estados-logisticos', { credentials: 'include' });
                const estados = await res.json();
                const select = document.getElementById('selectNuevoEstado');
                select.innerHTML = '<option value="">Cambiar a...</option>' +
                    estados.map(e => `<option value="${e.ESTADO_ID}">${e.Nombre_Estado}</option>`).join('');
            } catch (e) { console.error(e); }
        }

        async function cargarHistorialEstados() {
            try {
                const res = await fetch(`/api/logistica/${vin}/historial`, { credentials: 'include' });
                const historial = await res.json();
                const ul = document.getElementById('timelineEstados');
                ul.innerHTML = historial.length === 0
                    ? '<li>Sin movimientos registrados.</li>'
                    : historial.slice().reverse().map(h => `
                        <li><strong>${h.Nombre_Estado}</strong><span>${new Date(h.Fecha_Cambio).toLocaleString('es-GT')}${h.Comentario ? ' — ' + h.Comentario : ''}</span></li>
                    `).join('');
            } catch (e) { console.error(e); }
        }

        async function cambiarEstado() {
            const estado_id = document.getElementById('selectNuevoEstado').value;
            if (!estado_id) { alert('Selecciona el nuevo estado.'); return; }

            try {
                const res = await fetch(`/api/logistica/${vin}/estado`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ estado_id })
                });
                const data = await res.json();
                if (res.ok) {
                    await cargarVehiculo();
                    await cargarHistorialEstados();
                } else {
                    alert(data.error || 'Error al cambiar el estado.');
                }
            } catch (e) { console.error(e); }
        }

        async function guardarVehiculo(e) {
            e.preventDefault();
            const payload = {
                marca: document.getElementById('edMarca').value.trim(),
                modelo: document.getElementById('edModelo').value.trim(),
                anio: parseInt(document.getElementById('edAnio').value),
                cilindrada_cc: parseInt(document.getElementById('edCilindrada').value) || null,
                origen_subasta: document.getElementById('edOrigen').value,
                lote_subasta: document.getElementById('edLote').value.trim(),
                precio_compra_usd: parseFloat(document.getElementById('edPrecio').value) || null,
                cliente_id: document.getElementById('edCliente').value || null
            };

            try {
                const res = await fetch(`/api/vehiculos/${vin}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                alert(res.ok ? 'Datos del vehículo actualizados.' : (data.error || 'Error al guardar.'));
            } catch (e) { console.error(e); }
        }

        async function guardarDatosAduaneros(e) {
            e.preventDefault();
            if (!expIdActual) { alert('Este vehículo no tiene expediente aduanero.'); return; }

            const payload = {
                fecha_llegada: document.getElementById('edFechaLlegada').value || null,
                aduana_ingreso: document.getElementById('edAduana').value.trim() || null,
                canal_verificacion: document.getElementById('edCanal').value || null
            };

            try {
                const res = await fetch(`/api/expedientes/${expIdActual}/datos-aduaneros`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                alert(res.ok ? 'Datos aduaneros actualizados.' : (data.error || 'Error al guardar.'));
            } catch (e) { console.error(e); }
        }

        async function cargarChecklist() {
            try {
                const res = await fetch(`/api/expedientes/${expIdActual}/checklist`, { credentials: 'include' });
                const requisitos = await res.json();

                const cont = document.getElementById('checklistContainer');
                cont.innerHTML = requisitos.map(r => {
                    const estado = r.Estado || 'Pendiente';
                    const enlace = r.DOC_ID ? `<a href="/api/archivos/documento/${r.DOC_ID}" target="_blank" style="margin-left:10px;color:var(--color-principal);font-weight:600;">Ver</a>` : '';
                    return `
                        <div class="checklist-item">
                            <span>${r.Nombre_Requisito}${r.Obligatorio ? ' *' : ''}</span>
                            <span>
                                <span class="estado-chip estado-${estado}">${estado}</span>
                                ${enlace}
                            </span>
                        </div>
                    `;
                }).join('');

                const select = document.getElementById('reqSelectExp');
                select.innerHTML = '<option value="">Seleccione el requisito...</option>' +
                    requisitos.map(r => `<option value="${r.REQ_ID}">${r.Nombre_Requisito}</option>`).join('');
            } catch (e) { console.error(e); }
        }

        async function subirDocumento(e) {
            e.preventDefault();
            if (!expIdActual) { alert('Este vehículo no tiene expediente aduanero.'); return; }

            const req_id = document.getElementById('reqSelectExp').value;
            const archivo = document.getElementById('archivoFisicoExp').files[0];
            if (!req_id || !archivo) { alert('Selecciona el requisito y el archivo.'); return; }

            const formData = new FormData();
            formData.append('exp_id', expIdActual);
            formData.append('req_id', req_id);
            formData.append('archivoFisico', archivo);

            try {
                const res = await fetch('/api/documentos/upload', { method: 'POST', credentials: 'include', body: formData });
                const data = await res.json();
                if (res.ok) {
                    alert('Documento subido correctamente.');
                    document.getElementById('formSubirDoc').reset();
                    cargarChecklist();
                } else {
                    alert(data.error || 'Error al subir el documento.');
                }
            } catch (e) { console.error(e); }
        }
