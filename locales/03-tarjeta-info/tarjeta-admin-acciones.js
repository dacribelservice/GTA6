/**
 * 🗑️ ACCIONES ADMIN EN TARJETA DE INFORMACIÓN (tarjeta-admin-acciones.js <= 140 líneas)
 * Carga bajo demanda SOLO con sesión Admin activa (0 KB para visitantes).
 * Inyecta: Subir foto oficial, Eliminar foto actual y Eliminar punto comunitario
 * con confirmación limpia de doble toque (4 s, cero alert()/confirm() nativos).
 */

const SUPABASE_URL = 'https://ktnrjoewhhfjbmqyxfij.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mi9MnkRKfMlhk7YUi3rgaQ_hp6Ni393';

function crearBotonDobleToque({ textoBase, textoConfirmar, atributo, onConfirmar }) {
  const btn = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'ti-btn ta-btn-peligro',
    textContent: textoBase
  });
  btn.dataset.taAdminBtn = atributo;
  let armado = false, timer = 0, ocupado = false;

  const restaurar = () => {
    armado = false;
    clearTimeout(timer);
    btn.classList.remove('ta-confirmando');
    btn.textContent = textoBase;
  };

  btn.addEventListener('click', async () => {
    if (ocupado) return;
    if (!armado) {
      armado = true;
      btn.classList.add('ta-confirmando');
      btn.textContent = textoConfirmar;
      clearTimeout(timer);
      timer = window.setTimeout(restaurar, 4000);
      return;
    }
    ocupado = true;
    clearTimeout(timer);
    btn.disabled = true;
    btn.textContent = 'Eliminando…';
    try {
      await onConfirmar();
    } catch {
      ocupado = false;
      btn.disabled = false;
      restaurar();
    }
  });
  return btn;
}

async function eliminarPuntoComunidadRpc(puntoId, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_gestionar_punto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ p_accion: 'rechazar', p_punto_id: puntoId })
  });
  const dato = await res.json().catch(() => null);
  if (!res.ok || !dato?.ok) throw new Error(dato?.mensaje || 'No se pudo eliminar el punto comunitario.');
  return dato;
}

export function inyectarAccionesAdminTarjeta({
  panel, ubicacion, foto, obtenerToken, llamarRpcFoto, borrarStorage, solicitarSubidaOficial, contexto, avisar
}) {
  const token = obtenerToken?.();
  if (!token || !panel || !ubicacion) return;
  const acciones = panel.querySelector('[data-ti-acciones]');
  if (!acciones) return;

  acciones.querySelectorAll('[data-ta-admin-btn]').forEach((el) => el.remove());

  // 1) Subir foto oficial (Admin)
  const btnOficial = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'ti-btn ta-btn-oficial',
    textContent: 'Subir foto oficial (Admin)'
  });
  btnOficial.dataset.taAdminBtn = 'oficial';
  btnOficial.addEventListener('click', () => solicitarSubidaOficial?.(ubicacion));
  acciones.appendChild(btnOficial);

  // 2) Eliminar foto actual (Admin) — solo si existe foto aprobada
  if (foto?.url_imagen) {
    const btnDelFoto = crearBotonDobleToque({
      textoBase: 'Eliminar foto actual (Admin)',
      textoConfirmar: '¿Confirmar borrado de foto?',
      atributo: 'eliminar-foto',
      onConfirmar: async () => {
        try {
          const res = await llamarRpcFoto({
            p_accion: 'eliminar_aprobada',
            p_foto_id: foto.id || null,
            p_punto_id: ubicacion.id
          });
          if (res.ruta_borrar) borrarStorage?.(res.ruta_borrar);
          contexto?.emitir('tarjeta:foto-actualizada', { puntoId: ubicacion.id });
          avisar?.('Foto eliminada y borrada de Storage.');
        } catch (err) {
          avisar?.(err.message || 'No se pudo eliminar la foto.', true);
          throw err;
        }
      }
    });
    acciones.appendChild(btnDelFoto);
  }

  // 3) Eliminar punto comunitario (Admin) — solo en puntos de la comunidad (com_...)
  const esComunidad = Boolean(ubicacion.esComunidad) || String(ubicacion.id || '').startsWith('com_');
  if (esComunidad) {
    const btnDelPunto = crearBotonDobleToque({
      textoBase: 'Eliminar punto comunitario (Admin)',
      textoConfirmar: '¿Confirmar eliminar punto?',
      atributo: 'eliminar-punto',
      onConfirmar: async () => {
        try {
          const res = await eliminarPuntoComunidadRpc(ubicacion.id, obtenerToken?.());
          if (res.ruta_borrar) borrarStorage?.(res.ruta_borrar);
          panel.querySelector('[data-accion="cerrar"]')?.click();
          contexto?.emitir('comunidad:recargar', {});
          avisar?.('Punto comunitario eliminado del mapa y de Storage.');
        } catch (err) {
          avisar?.(err.message || 'No se pudo eliminar el punto comunitario.', true);
          throw err;
        }
      }
    });
    acciones.appendChild(btnDelPunto);
  }
}
