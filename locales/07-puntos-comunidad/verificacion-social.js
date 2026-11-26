/**
 * ❤️ VERIFICACIÓN SOCIAL COMUNITARIA (verificacion-social.js <= 160 líneas)
 * Inyecta en la Tarjeta de Información (vía tarjeta:abierta) el autor, aviso de veracidad,
 * insignia dinámica de estado y botones planos Confirmar (❤️) / No existe (✕) conectados
 * al RPC votar_punto_comunidad con persistencia local ligera y auto-ocultado en vivo.
 */

import {
  esc, obtenerSesionComunidad, llamarRpcComunidad, mostrarAvisoComunidad
} from './comunidad-api.js';

const CLAVE_VOTOS = 'gta6_cangel_votos_comunidad';
const SVG_CORAZON = '<svg class="pc-voto-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.4 4.8 13.7a4.7 4.7 0 0 1 6.6-6.6l.6.6.6-.6a4.7 4.7 0 0 1 6.6 6.6Z"/></svg>';
const SVG_EQUIS = '<svg class="pc-voto-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function leerMapaVotos() {
  try {
    const raw = JSON.parse(localStorage.getItem(CLAVE_VOTOS) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function guardarVotoLocal(puntoId, tipo) {
  try {
    const mapa = leerMapaVotos();
    if (tipo) mapa[puntoId] = tipo;
    else delete mapa[puntoId];
    localStorage.setItem(CLAVE_VOTOS, JSON.stringify(mapa));
  } catch {}
}

export function resolverVotoPropio(punto) {
  if (!punto) return null;
  if ('mi_voto' in punto) {
    const srv = (punto.mi_voto === 'confirmar' || punto.mi_voto === 'reportar') ? punto.mi_voto : null;
    guardarVotoLocal(punto.id, srv);
    return srv;
  }
  const local = leerMapaVotos()[punto.id];
  return (local === 'confirmar' || local === 'reportar') ? local : null;
}

export function calcularInsigniaComunidad(punto) {
  if (punto.verificado_admin) return { texto: 'Verificado por CANGEL', clase: 'pc-verificado' };
  const c = Number(punto.corazones_count) || 0;
  const r = Number(punto.reportes_count) || 0;
  if (c >= 5 && c > r) return { texto: 'Confirmado por la comunidad', clase: 'pc-confirmado' };
  if (r > c) return { texto: 'En duda', clase: 'pc-duda' };
  return { texto: 'Sin confirmar', clase: 'pc-sin-confirmar' };
}

function pintarContenidoBloque(bloque, punto) {
  const ins = calcularInsigniaComunidad(punto);
  const voto = resolverVotoPropio(punto);
  const c = Number(punto.corazones_count) || 0;
  const r = Number(punto.reportes_count) || 0;

  bloque.innerHTML =
    `<div class="pc-meta-fila">` +
      `<span class="pc-autor">Aportado por @${esc(punto.autor_alias || 'Anónimo')}</span>` +
      `<span class="pc-badge-estado ${ins.clase}">${esc(ins.texto)}</span>` +
    `</div>` +
    `<p class="pc-aviso-tarjeta">Punto creado por la comunidad · Su veracidad puede estar sin confirmar.</p>` +
    `<div class="pc-votos" role="group" aria-label="Verificación comunitaria">` +
      `<button type="button" class="pc-btn-voto pc-btn-confirmar${voto === 'confirmar' ? ' pc-voto-activo' : ''}" data-pc-voto="confirmar" aria-pressed="${voto === 'confirmar'}">` +
        `${SVG_CORAZON}<span>Confirmar (${c})</span>` +
      `</button>` +
      `<button type="button" class="pc-btn-voto pc-btn-reportar${voto === 'reportar' ? ' pc-voto-activo' : ''}" data-pc-voto="reportar" aria-pressed="${voto === 'reportar'}">` +
        `${SVG_EQUIS}<span>No existe (${r})</span>` +
      `</button>` +
    `</div>`;
}

export function renderizarVerificacionEnTarjeta(panel, punto, { onActualizado, onOcultado } = {}) {
  if (!panel || !punto?.esComunidad) return;
  panel.querySelector('.pc-tarjeta-meta')?.remove();

  const bloque = document.createElement('div');
  bloque.className = 'pc-tarjeta-meta';
  pintarContenidoBloque(bloque, punto);

  let votando = false;
  bloque.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-pc-voto]');
    if (!btn || votando) return;
    const tipo = btn.dataset.pcVoto;
    votando = true;
    bloque.querySelectorAll('[data-pc-voto]').forEach((b) => { b.disabled = true; });

    try {
      const res = await llamarRpcComunidad('votar_punto_comunidad', {
        p_punto_id: punto.id,
        p_tipo: tipo,
        p_sesion_hash: obtenerSesionComunidad()
      });

      if (res?.codigo === 'NO_DISPONIBLE') {
        guardarVotoLocal(punto.id, null);
        onOcultado?.(punto.id);
        panel.querySelector('[data-accion="cerrar"]')?.click();
        mostrarAvisoComunidad('Este punto ya no está activo y pasó a revisión de CANGEL.');
        return;
      }
      if (!res?.ok) throw new Error(res?.mensaje || 'No se pudo registrar tu voto.');

      const votoFinal = res.mi_voto || null;
      guardarVotoLocal(punto.id, votoFinal);

      if (res.ocultado || res.estado === 'oculto_reportes') {
        onOcultado?.(punto.id);
        panel.querySelector('[data-accion="cerrar"]')?.click();
        mostrarAvisoComunidad('Este punto alcanzó el límite de reportes negativos y pasó a revisión en /admin.');
        return;
      }

      punto.corazones_count = Number(res.corazones_count) || 0;
      punto.reportes_count = Number(res.reportes_count) || 0;
      punto.mi_voto = votoFinal;
      onActualizado?.(punto.id, {
        corazones_count: punto.corazones_count,
        reportes_count: punto.reportes_count,
        mi_voto: votoFinal
      });
      pintarContenidoBloque(bloque, punto);
      mostrarAvisoComunidad(
        votoFinal === 'confirmar' ? 'Voto guardado: confirmaste este punto.'
          : votoFinal === 'reportar' ? 'Reporte guardado: marcaste que este punto no existe.'
          : 'Retiraste tu voto de este punto.'
      );
    } catch (err) {
      mostrarAvisoComunidad(err.message || 'No se pudo procesar tu voto en este momento.');
      bloque.querySelectorAll('[data-pc-voto]').forEach((b) => { b.disabled = false; });
    } finally {
      votando = false;
    }
  });

  const desc = panel.querySelector('.ti-desc');
  if (desc) desc.insertAdjacentElement('beforebegin', bloque);
  else panel.appendChild(bloque);
}
