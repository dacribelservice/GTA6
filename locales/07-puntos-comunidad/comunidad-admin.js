/**
 * 🛡️ MODERACIÓN ADMIN DE PUNTOS COMUNITARIOS (comunidad-admin.js <= 200 líneas)
 * Carga bajo demanda SOLO para el Administrador autenticado en /admin (0 KB para visitantes).
 * Gestiona la pestaña "Puntos" junto a "Fotos": pendientes + oculto_reportes, miniatura
 * de foto propuesta y acciones en 1 toque (Ver en mapa, Aprobar, Verificar, Reactivar, Rechazar).
 */

import { esc, llamarRpcComunidad } from './comunidad-api.js';

export function crearControladorAdminPuntos({ obtenerToken, borrarStorage, contexto, avisar, onCambioConteo }) {
  let colaPuntos = [];

  async function refrescarCola() {
    const token = obtenerToken?.();
    if (!token) { colaPuntos = []; onCambioConteo?.(0); return []; }
    const res = await llamarRpcComunidad('admin_gestionar_punto', { p_accion: 'listar_cola' }, token);
    if (!res?.ok) throw new Error(res?.mensaje || 'No se pudo cargar la cola de puntos.');
    colaPuntos = Array.isArray(res.items) ? res.items : [];
    onCambioConteo?.(colaPuntos.length);
    return colaPuntos;
  }

  function pintarLista(listaEl) {
    if (!listaEl) return;
    if (!colaPuntos.length) {
      listaEl.innerHTML = '<p class="ta-vacio">No hay puntos comunitarios pendientes ni reportados. ¡Todo al día!</p>';
      return;
    }

    listaEl.innerHTML = colaPuntos.map((p) => {
      const esOculto = p.estado === 'oculto_reportes';
      const badge = esOculto
        ? `<span class="ta-tag-rep">Oculto por reportes · ❤️ ${Number(p.corazones_count) || 0} / ✕ ${Number(p.reportes_count) || 0}</span>`
        : `<span class="ta-tag-pend">Pendiente de revisión</span>`;
      const fotoHtml = p.url_imagen_propuesta
        ? `<div class="ta-thumb ta-thumb-nueva ta-thumb-com"><img src="${esc(p.url_imagen_propuesta)}" alt="Foto propuesta" loading="lazy"></div>`
        : `<p class="ta-sin-foto">Sin fotografía propuesta</p>`;
      const descHtml = p.descripcion ? `<p class="ta-item-desc">${esc(p.descripcion)}</p>` : '';
      const accPrimaria = esOculto
        ? `<button type="button" class="ti-btn ta-btn-aprobar" data-ca-acc="reactivar" data-ca-id="${esc(p.id)}">Reactivar</button>`
        : `<button type="button" class="ti-btn ta-btn-aprobar" data-ca-acc="aprobar" data-ca-id="${esc(p.id)}">Aprobar</button>`;

      return (
        `<article class="ta-item" data-ca-item="${esc(p.id)}">` +
          `<div class="ta-item-top">` +
            `<div>` +
              `<div class="ta-item-titulo">${esc(p.titulo)}</div>` +
              `<div class="ta-item-meta">Por @${esc(p.autor_alias || 'Anónimo')} · ${esc(p.region)} · ${esc(p.categoria_id)} · X:${Number(p.x).toFixed(1)}% Y:${Number(p.y).toFixed(1)}%</div>` +
            `</div>` +
            `${badge}` +
          `</div>` +
          `${descHtml}` +
          `${fotoHtml}` +
          `<div class="ti-acciones">` +
            `<button type="button" class="ti-btn" data-ca-ver="${esc(p.id)}">Ver en mapa</button>` +
            `${accPrimaria}` +
            `<button type="button" class="ti-btn ta-btn-verificar" data-ca-acc="verificar" data-ca-id="${esc(p.id)}">Verificar CANGEL</button>` +
            `<button type="button" class="ti-btn ta-btn-rechazar" data-ca-acc="rechazar" data-ca-id="${esc(p.id)}">Rechazar</button>` +
          `</div>` +
        `</article>`
      );
    }).join('');
  }

  async function manejarClic(e, listaEl, cerrarModal) {
    const btnVer = e.target.closest('[data-ca-ver]');
    if (btnVer) {
      const p = colaPuntos.find((x) => x.id === btnVer.dataset.caVer);
      if (p) {
        contexto?.enfocarCoordenada?.(p.x, p.y, 4.5, true);
        cerrarModal?.();
      }
      return true;
    }

    const btnAcc = e.target.closest('[data-ca-acc]');
    if (!btnAcc) return false;
    const accion = btnAcc.dataset.caAcc;
    const id = btnAcc.dataset.caId;
    const item = colaPuntos.find((x) => x.id === id);
    const botones = btnAcc.closest('.ta-item')?.querySelectorAll('button') || [];
    botones.forEach((b) => { b.disabled = true; });

    try {
      const res = await llamarRpcComunidad('admin_gestionar_punto', {
        p_accion: accion, p_punto_id: id
      }, obtenerToken?.());
      if (!res?.ok) throw new Error(res?.mensaje || 'No se pudo moderar el punto.');

      if (res.ruta_borrar) borrarStorage?.(res.ruta_borrar);
      colaPuntos = colaPuntos.filter((x) => x.id !== id);
      onCambioConteo?.(colaPuntos.length);
      pintarLista(listaEl);

      if (accion !== 'rechazar') {
        contexto?.emitir('comunidad:recargar', {});
        if (item?.url_imagen_propuesta) contexto?.emitir('tarjeta:foto-actualizada', { puntoId: id });
      }
      const msgs = {
        aprobar: 'Punto aprobado y publicado en Comunidad.',
        verificar: 'Punto verificado por CANGEL y publicado en vivo.',
        reactivar: 'Punto reactivado en Comunidad (reportes limpiados).',
        rechazar: 'Punto rechazado y archivo limpiado.'
      };
      avisar?.(msgs[accion] || 'Acción aplicada.');
    } catch (err) {
      botones.forEach((b) => { b.disabled = false; });
      avisar?.(err.message || 'Error al moderar el punto.', true);
    }
    return true;
  }

  return {
    refrescarCola,
    pintarLista,
    manejarClic,
    obtenerTotal: () => colaPuntos.length,
    limpiar: () => { colaPuntos = []; onCambioConteo?.(0); }
  };
}
