const TASAS = require('../config/tasas');

function numeroValido(valor, { min = 0, max = 10000000 } = {}) {
    const n = Number(valor);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

// Los totales se recalculan en el servidor; no se confía en los enviados por el cliente.
function calcularEstimacionCliente(entrada, anioActual = new Date().getFullYear()) {
    const marca = String(entrada.marca || '').trim().slice(0, 50);
    const modelo = String(entrada.modelo || '').trim().slice(0, 50);
    const anio = numeroValido(entrada.anio, { min: 1950, max: anioActual + 1 });
    const cilindrada = entrada.cilindrada_cc ? numeroValido(entrada.cilindrada_cc, { min: 0, max: 20000 }) : null;
    const precio = numeroValido(entrada.precio_origen_usd);
    const flete = numeroValido(entrada.flete_usd);
    const seguro = numeroValido(entrada.seguro_usd);
    const tasaCambio = numeroValido(entrada.tasa_cambio_usada, { min: 1, max: 100 });

    if (!marca || !modelo) return { error: 'Indica la marca y el modelo.' };
    if (anio === null) return { error: 'El año del vehículo no es válido.' };
    if (precio === null || precio <= 0) return { error: 'El precio del vehículo no es válido.' };
    if (flete === null || seguro === null) return { error: 'El flete y el seguro deben ser números válidos.' };
    if (tasaCambio === null) return { error: 'La tasa de cambio no es válida.' };

    const cif = precio + flete + seguro;
    const dai = cif * (TASAS.DAI_PCT / 100);
    const iva = (cif + dai) * (TASAS.IVA_PCT / 100);
    const iprima = TASAS.IPRIMA_USD;
    const total = cif + dai + iva + iprima;
    const r2 = (x) => Math.round(x * 100) / 100;

    return {
        datos: {
            marca, modelo, anio, cilindrada_cc: cilindrada,
            precio_origen_usd: r2(precio), flete_usd: r2(flete), seguro_usd: r2(seguro),
            tasa_cambio_usada: tasaCambio,
            valor_cif_usd: r2(cif), dai_usd: r2(dai), iva_usd: r2(iva), iprima_usd: r2(iprima),
            costo_total_usd: r2(total)
        }
    };
}

module.exports = { calcularEstimacionCliente, numeroValido };
