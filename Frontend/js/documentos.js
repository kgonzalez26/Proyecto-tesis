        let expIdActivo = null;

        async function cargarChecklistGlobal() {
            const tbody = document.getElementById('tablaChecklist');
            try {
                const res = await fetch('/api/expedientes/checklist', { credentials: 'include' });
                if (res.status === 401) { window.location.replace('login.html'); return; }
                const expedientes = await res.json();
                tbody.innerHTML = '';

                if (expedientes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888; padding:20px;">No hay expedientes registrados.</td></tr>';
                    return;
                }

                expedientes.forEach(exp => {
                    const total = exp.Total_Requisitos || 0;
                    const entregados = exp.Requisitos_Entregados || 0;
                    const color = (entregados >= total && total > 0) ? 'var(--color-ok)' : 'var(--color-falta)';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="text-left"><strong>${exp.VIN_Unidad}</strong><br><small>${exp.Marca} ${exp.Modelo}</small></td>
                        <td><span class="progreso-badge" style="color:${color};">${entregados}/${total}</span></td>
                        <td><button class="btn-gestionar" data-exp-id="${exp.EXP_ID}" data-vin="${exp.VIN_Unidad}">Gestionar</button></td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (error) { console.error(error); }
        }

        async function abrirPanel(exp_id, vin) {
            expIdActivo = exp_id;
            document.getElementById('panelArchivos').style.display = 'block';
            document.getElementById('tituloPanel').innerText = `Gestionando Documentos - VIN: ${vin}`;
            document.getElementById('expIdOculto').value = exp_id;
            document.getElementById('panelArchivos').scrollIntoView({ behavior: 'smooth' });
            await cargarChecklistExpediente(exp_id);
        }

        async function cargarChecklistExpediente(exp_id) {
            const ul = document.getElementById('listaArchivosRender');
            const reqSelect = document.getElementById('reqSelect');
            ul.innerHTML = 'Cargando...';
            try {
                const res = await fetch(`/api/expedientes/${exp_id}/checklist`, { credentials: 'include' });
                const requisitos = await res.json();
                ul.innerHTML = '';
                reqSelect.innerHTML = '<option value="">Seleccione el requisito...</option>' +
                    requisitos.map(r => `<option value="${r.REQ_ID}">${r.Nombre_Requisito}${r.Obligatorio ? ' *' : ''}</option>`).join('');

                requisitos.forEach(r => {
                    const estado = r.Estado || 'Pendiente';
                    const enlace = r.DOC_ID
                        ? `<a href="/api/archivos/documento/${r.DOC_ID}" target="_blank" class="btn-descargar">Ver</a>`
                        : '';
                    ul.innerHTML += `
                        <li>
                            <span><i class="fa-solid fa-file-pdf"></i> ${r.Nombre_Requisito}</span>
                            <span class="estado-req estado-${estado}">${estado}</span>
                            ${enlace}
                        </li>
                    `;
                });
            } catch (error) { console.error(error); }
        }

        document.getElementById('formSubir').addEventListener('submit', async function (e) {
            e.preventDefault();
            const exp_id = document.getElementById('expIdOculto').value;
            const req_id = document.getElementById('reqSelect').value;
            const fileInput = document.getElementById('archivoFisico').files[0];

            if (!req_id) { alert('Selecciona a qué requisito corresponde el archivo.'); return; }

            const formData = new FormData();
            formData.append('exp_id', exp_id);
            formData.append('req_id', req_id);
            formData.append('archivoFisico', fileInput);

            try {
                const res = await fetch('/api/documentos/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                const data = await res.json();

                if (res.ok) {
                    alert('Documento guardado con éxito.');
                    document.getElementById('formSubir').reset();
                    cargarChecklistGlobal();
                    cargarChecklistExpediente(exp_id);
                } else {
                    alert(data.error || 'Error al subir archivo');
                }
            } catch (error) { console.error('Error de red:', error); }
        });


document.getElementById('tablaChecklist').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-gestionar');
    if (!btn) return;
    abrirPanel(btn.dataset.expId, btn.dataset.vin);
});

cargarChecklistGlobal();
