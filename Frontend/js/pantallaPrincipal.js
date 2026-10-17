        const LIMITE_VEHICULOS = 50;
        let paginacionVehiculos = { pagina: 1, total: 0, paginas: 0 };

        function grupoEstado(nombreEstado) {
            if (!nombreEstado) return 'inicio';
            const nombre = String(nombreEstado).toLowerCase();
            if (nombre.includes('vendid')) return 'vendido';
            if (nombre.includes('predio') || nombre.includes('placa')) return 'predio';
            if (nombre.includes('dua') || nombre.includes('verificaci') || nombre.includes('impuesto') || nombre.includes('liberad')) return 'aduana';
            if (nombre.includes('tránsito') || nombre.includes('transito') || nombre.includes('puerto')) return 'transito';
            return 'inicio';
        }

        document.addEventListener('DOMContentLoaded', () => {
            const selectAnio = document.getElementById('selectAnio');
            const currentYear = new Date().getFullYear();
            for (let year = currentYear + 1; year >= 1990; year--) {
                const opt = document.createElement('option');
                opt.value = year; opt.textContent = year;
                selectAnio.appendChild(opt);
            }
            document.getElementById('inputFechaCompra').valueAsDate = new Date();

            const modal = document.getElementById('modalVehiculo');
            document.getElementById('btnNuevoVehiculo').addEventListener('click', () => {
                cargarClientesEnSelect();
                modal.classList.add('active');
            });
            document.getElementById('closeModalBtn').addEventListener('click', () => modal.classList.remove('active'));
            document.getElementById('btnCancelarModal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('formFiltrosVehiculos').addEventListener('submit', (e) => {
                e.preventDefault();
                fetchVehiculos(1);
            });
            document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
                document.getElementById('formFiltrosVehiculos').reset();
                fetchVehiculos(1);
            });
            document.getElementById('btnPaginaAnterior').addEventListener('click', () => {
                if (paginacionVehiculos.pagina > 1) fetchVehiculos(paginacionVehiculos.pagina - 1);
            });
            document.getElementById('btnPaginaSiguiente').addEventListener('click', () => {
                if (paginacionVehiculos.pagina < paginacionVehiculos.paginas) fetchVehiculos(paginacionVehiculos.pagina + 1);
            });

            document.getElementById('formNuevoVehiculo').addEventListener('submit', guardarNuevoVehiculo);

            cargarEstadosFiltro();
            fetchVehiculos(1);
        });

        async function cargarEstadosFiltro() {
            const select = document.getElementById('filtroEstado');
            try {
                const res = await fetch('/api/catalogos/estados-logisticos', { credentials: 'include' });
                if (!res.ok) return;
                const estados = await res.json();
                estados.forEach(estado => {
                    const opcion = document.createElement('option');
                    opcion.value = estado.Nombre_Estado;
                    opcion.textContent = estado.Nombre_Estado;
                    select.appendChild(opcion);
                });
            } catch (error) {
                console.error('No se pudieron cargar los estados logísticos:', error);
            }
        }

        async function cargarClientesEnSelect() {
            const select = document.getElementById('selectCliente');
            try {
                const res = await fetch('/api/clientes', { credentials: 'include' });
                if (!res.ok) return;
                const clientes = await res.json();
                select.innerHTML = '<option value="">Inventario propio</option>' +
                    clientes.map(c => `<option value="${c.CLIENTE_ID}">${c.Nombre_Completo}</option>`).join('');
            } catch (error) {
                console.error('No se pudo cargar la lista de clientes:', error);
            }
        }

        async function fetchVehiculos(pagina = 1) {
            const tbody = document.getElementById('tablaVehiculosBody');
            try {
                const parametros = new URLSearchParams({ pagina: String(pagina), limite: String(LIMITE_VEHICULOS) });
                const filtros = [
                    ['vin', 'filtroVin'],
                    ['cliente', 'filtroCliente'],
                    ['marca', 'filtroMarca'],
                    ['modelo', 'filtroModelo'],
                    ['anio', 'filtroAnio'],
                    ['lote', 'filtroLote'],
                    ['estado', 'filtroEstado'],
                    ['asignacion', 'filtroAsignacion'],
                    ['requisitos_entregados', 'filtroDocumentosEntregados'],
                    ['requisitos_totales', 'filtroDocumentosTotales']
                ];
                filtros.forEach(([parametro, id]) => {
                    const valor = document.getElementById(id).value.trim();
                    if (valor) parametros.set(parametro, valor);
                });

                const response = await fetch(`/api/vehiculos?${parametros}`, { credentials: 'include' });
                if (response.status === 401) { window.location.replace('login.html'); return; }
                if (!response.ok) throw new Error('Error al conectar con la API');

                const resultado = await response.json();
                paginacionVehiculos = {
                    pagina: resultado.pagina,
                    total: resultado.total,
                    paginas: resultado.paginas
                };
                renderTabla(resultado.data);
                actualizarKPIs(resultado.resumen);
                actualizarPaginacion(resultado);
            } catch (err) {
                console.error(err);
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc2626; padding: 20px;">No se pudieron cargar o mostrar los vehículos.</td></tr>`;
            }
        }

        function actualizarPaginacion(resultado) {
            const desde = resultado.total === 0 ? 0 : (resultado.pagina - 1) * resultado.limite + 1;
            const hasta = Math.min(resultado.pagina * resultado.limite, resultado.total);
            document.getElementById('resultadoConteo').textContent =
                `Mostrando ${desde.toLocaleString('es-GT')}–${hasta.toLocaleString('es-GT')} de ${resultado.total.toLocaleString('es-GT')} vehículos`;
            document.getElementById('etiquetaPagina').textContent = `Página ${resultado.pagina} de ${Math.max(resultado.paginas, 1)}`;
            document.getElementById('btnPaginaAnterior').disabled = resultado.pagina <= 1;
            document.getElementById('btnPaginaSiguiente').disabled = resultado.pagina >= resultado.paginas;
        }

        function renderTabla(lista) {
            const tbody = document.getElementById('tablaVehiculosBody');
            if (!lista || lista.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #888; padding: 20px;">No se encontraron vehículos.</td></tr>`;
                return;
            }

            tbody.innerHTML = '';
            lista.forEach(v => {
                const grupo = grupoEstado(v.Estado_Actual);
                const badgeClass = { inicio: 'badge-inicio', transito: 'badge-transito', aduana: 'badge-aduana', predio: 'badge-predio', vendido: 'badge-vendido' }[grupo];

                const cliente = v.Cliente || 'Inventario Propio';
                const total = v.Requisitos_Totales || 0;
                const entregados = v.Requisitos_Entregados || 0;
                const progresoClass = (total > 0 && entregados >= total) ? 'completo' : 'incompleto';

                const row = `
                    <tr>
                        <td><strong>${v.VIN_Unidad}</strong></td>
                        <td>${cliente}</td>
                        <td>${v.Marca} ${v.Modelo}</td>
                        <td>${v.Anio}</td>
                        <td>${v.Lote_Subasta || 'N/A'}</td>
                        <td><span class="badge ${badgeClass}">${v.Estado_Actual}</span></td>
                        <td><span class="doc-progreso ${progresoClass}">${entregados}/${total}</span></td>
                        <td><a href="expediente.html?vin=${v.VIN_Unidad}" class="btn-gestionar">Gestionar</a></td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        function actualizarKPIs(resumen) {
            document.getElementById('kpiTotal').textContent = resumen.total;
            document.getElementById('kpiTransito').textContent = resumen.transito;
            document.getElementById('kpiAduana').textContent = resumen.aduana;
            document.getElementById('kpiPredio').textContent = resumen.predio;
        }

        async function guardarNuevoVehiculo(e) {
            e.preventDefault();

            const nuevoVehiculo = {
                vin_unidad: document.getElementById('inputVin').value.trim(),
                marca: document.getElementById('inputMarca').value.trim(),
                modelo: document.getElementById('inputModelo').value.trim(),
                anio: parseInt(document.getElementById('selectAnio').value),
                cilindrada_cc: parseInt(document.getElementById('inputCilindrada').value) || null,
                origen_subasta: document.getElementById('selectOrigen').value,
                lote_subasta: document.getElementById('inputLote').value.trim(),
                precio_compra_usd: parseFloat(document.getElementById('inputPrecio').value) || null,
                cliente_id: document.getElementById('selectCliente').value || null,
                fecha_compra: document.getElementById('inputFechaCompra').value
            };

            try {
                const res = await fetch('/api/vehiculos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(nuevoVehiculo)
                });

                const data = await res.json();

                if (res.ok) {
                    alert('¡Vehículo registrado exitosamente!');
                    document.getElementById('modalVehiculo').classList.remove('active');
                    document.getElementById('formNuevoVehiculo').reset();
                    fetchVehiculos(1);
                } else {
                    alert('Error al registrar vehículo: ' + (data.error || 'Error del servidor'));
                }
            } catch (err) {
                console.error(err);
                alert('No se pudo conectar con la API de vehículos.');
            }
        }
