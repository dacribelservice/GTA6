/**
 * 🔐 ADMIN PROVISIONAL (/admin) — MÓDULO AISLADO Y 100% DESECHABLE (<= 300 líneas)
 * Carga bajo demanda SOLO al entrar a /admin o con sesión Admin activa (0 KB para visitantes).
 * 4.11 Modal Correo/Contraseña vía Supabase Auth (fetch nativo, sin SDK, cero contraseñas en código).
 * 4.12 Cola visual de moderación (Foto actual vs. propuesta, Aprobar / Rechazar en 1 toque).
 * 4.13 Subida directa de "Foto oficial" desde cualquier Tarjeta de Información.
 */

const SUPABASE_URL = 'https://ktnrjoewhhfjbmqyxfij.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mi9MnkRKfMlhk7YUi3rgaQ_hp6Ni393';
const CLAVE_TOKEN = 'gta6_cangel_admin_token';

let contextoRef = null, avisar = null, tokenAdmin = '';
let barraEl = null, modalLogin = null, modalCola = null, inputOficial = null;
let puntoSubidaOficial = null, titulosPorId = new Map(), pendientesCache = [], iniciado = false;

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function cargarCssAdmin() {
  if (document.querySelector('link[data-local-css="tarjetaAdmin"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './locales/03-tarjeta-info/tarjeta-admin.css';
  link.dataset.localCss = 'tarjetaAdmin';
  document.head.appendChild(link);
}

const leerToken = () => { try { return sessionStorage.getItem(CLAVE_TOKEN) || ''; } catch { return ''; } };
const guardarToken = (t) => { tokenAdmin = t; try { t ? sessionStorage.setItem(CLAVE_TOKEN, t) : sessionStorage.removeItem(CLAVE_TOKEN); } catch {} };

async function llamarRpcAdmin(payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_gestionar_foto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify(payload)
  });
  const dato = await res.json().catch(() => null);
  if (res.status === 401 || dato?.codigo === 'NO_AUTORIZADO') {
    cerrarSesionAdmin(false);
    throw new Error('Tu sesión de administrador venció o no tiene permisos.');
  }
  if (!res.ok || !dato?.ok) throw new Error(dato?.mensaje || 'No se pudo completar la acción Admin.');
  return dato;
}

function borrarArchivoStorage(ruta) {
  if (!ruta || !tokenAdmin) return;
  fetch(`${SUPABASE_URL}/storage/v1/object/fotos-puntos/${ruta}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tokenAdmin}` }
  }).catch(() => {});
}

function pintarBarraAdmin() {
  if (!tokenAdmin) { barraEl?.remove(); barraEl = null; return; }
  if (!barraEl) {
    barraEl = document.createElement('div');
    barraEl.className = 'ta-barra';
    barraEl.innerHTML =
      `<span class="ta-badge">Admin</span>` +
      `<button type="button" class="ta-btn-mini" data-ta-cola>Pendientes <span class="ta-contador" data-ta-num>0</span></button>` +
      `<button type="button" class="ta-btn-mini ta-btn-salir" data-ta-salir>Cerrar sesión Admin</button>`;
    barraEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-ta-cola]')) abrirColaModeracion();
      if (e.target.closest('[data-ta-salir]')) cerrarSesionAdmin(true);
    });
    document.body.appendChild(barraEl);
  }
  const num = barraEl.querySelector('[data-ta-num]');
  if (num) num.textContent = String(pendientesCache.length);
}

function inyectarBotonOficial(panel, ubicacion) {
  if (!tokenAdmin || !panel || !ubicacion) return;
  const acciones = panel.querySelector('[data-ti-acciones]');
  if (!acciones || acciones.querySelector('[data-ta-oficial]')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ti-btn ta-btn-oficial';
  btn.dataset.taOficial = ubicacion.id;
  btn.textContent = 'Subir foto oficial (Admin)';
  btn.addEventListener('click', () => {
    puntoSubidaOficial = ubicacion;
    asegurarInputOficial();
    inputOficial.click();
  });
  acciones.appendChild(btn);
}

function asegurarInputOficial() {
  if (inputOficial) return;
  inputOficial = document.createElement('input');
  inputOficial.type = 'file';
  inputOficial.accept = 'image/jpeg,image/png,image/webp,image/avif';
  inputOficial.hidden = true;
  inputOficial.addEventListener('change', async () => {
    const archivo = inputOficial.files?.[0];
    inputOficial.value = '';
    if (!archivo || !puntoSubidaOficial || !tokenAdmin) return;
    await publicarFotoOficial(puntoSubidaOficial, archivo);
  });
  document.body.appendChild(inputOficial);
}

async function publicarFotoOficial(ubicacion, archivo) {
  avisar?.('Comprimiendo y publicando foto oficial…');
  let comp = null;
  try {
    const { comprimirImagenParaMapa } = await import('./compresor-imagen.js');
    comp = await comprimirImagenParaMapa(archivo);
    const puntoLimpio = String(ubicacion.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const sufijo = Math.random().toString(36).slice(2, 8);
    const ruta = `oficiales/${puntoLimpio}/${Date.now()}_${sufijo}.${comp.extension}`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos-puntos/${ruta}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tokenAdmin}`, 'Content-Type': comp.mime, 'x-upsert': 'false' },
      body: comp.blob
    });
    if (!up.ok) throw new Error('Error al subir la foto oficial a Storage.');

    const urlImagen = `${SUPABASE_URL}/storage/v1/object/public/fotos-puntos/${ruta}`;
    const res = await llamarRpcAdmin({
      p_accion: 'publicar_oficial', p_punto_id: puntoLimpio, p_url_imagen: urlImagen, p_ruta_storage: ruta
    });
    if (res.ruta_anterior_borrar) borrarArchivoStorage(res.ruta_anterior_borrar);
    contextoRef?.emitir('tarjeta:foto-actualizada', { puntoId: puntoLimpio });
    avisar?.(`Foto oficial publicada (${comp.pesoTexto} · ${comp.extension.toUpperCase()}).`);
  } catch (err) {
    avisar?.(err.message || 'No se pudo publicar la foto oficial.', true);
  } finally {
    comp?.liberarPreview?.();
  }
}

async function refrescarPendientes() {
  if (!tokenAdmin) return [];
  const res = await llamarRpcAdmin({ p_accion: 'listar_pendientes' });
  pendientesCache = Array.isArray(res.items) ? res.items : [];
  pintarBarraAdmin();
  return pendientesCache;
}

function pintarItemsCola() {
  const lista = modalCola?.querySelector('[data-ta-lista]');
  if (!lista) return;
  if (!pendientesCache.length) {
    lista.innerHTML = '<p class="ta-vacio">No hay fotos pendientes por revisar. ¡Todo al día!</p>';
    return;
  }
  lista.innerHTML = pendientesCache.map((it) => {
    const titulo = titulosPorId.get(it.punto_id) || it.punto_id;
    const tagRep = it.reemplaza_a ? '<span class="ta-tag-rep">Reporte: Esta foto no es</span>' : '';
    const actualHtml = it.foto_actual_url
      ? `<img src="${esc(it.foto_actual_url)}" alt="Foto actual" loading="lazy">`
      : '<span>Sin foto actual</span>';
    return (
      `<article class="ta-item" data-id="${esc(it.id)}">` +
        `<div class="ta-item-top">` +
          `<div><div class="ta-item-titulo">${esc(titulo)}</div>` +
          `<div class="ta-item-meta">Por @${esc(it.autor_alias || 'Anónimo')} · ${esc(it.punto_id)}</div></div>` +
          `${tagRep}` +
        `</div>` +
        `<div class="ta-comparar">` +
          `<div class="ta-col"><span class="ta-col-lbl">Foto actual</span><div class="ta-thumb">${actualHtml}</div></div>` +
          `<div class="ta-col"><span class="ta-col-lbl">Foto propuesta</span><div class="ta-thumb ta-thumb-nueva"><img src="${esc(it.url_imagen)}" alt="Foto propuesta" loading="lazy"></div></div>` +
        `</div>` +
        `<div class="ti-acciones">` +
          `<button type="button" class="ti-btn" data-ta-ir="${esc(it.punto_id)}">Ver punto</button>` +
          `<button type="button" class="ti-btn ta-btn-rechazar" data-ta-acc="rechazar" data-ta-id="${esc(it.id)}">Rechazar</button>` +
          `<button type="button" class="ti-btn ta-btn-aprobar" data-ta-acc="aprobar" data-ta-id="${esc(it.id)}">Aprobar</button>` +
        `</div>` +
      `</article>`
    );
  }).join('');
}

async function abrirColaModeracion() {
  if (!tokenAdmin) return abrirModalLogin();
  modalCola?.remove();
  modalCola = document.createElement('div');
  modalCola.className = 'ti-modal-fondo';
  modalCola.setAttribute('role', 'dialog');
  modalCola.setAttribute('aria-modal', 'true');
  modalCola.innerHTML =
    `<div class="ta-cola">` +
      `<header class="ti-cabecera">` +
        `<div class="ti-titulos"><h3 class="ti-titulo">Cola de moderación de fotos</h3>` +
        `<p class="ti-ap-sub">Compara y aprueba o rechaza en 1 toque.</p></div>` +
        `<button type="button" class="ti-cerrar" data-ta-cerrar aria-label="Cerrar">✕</button>` +
      `</header>` +
      `<div class="ta-lista" data-ta-lista><p class="ta-vacio">Cargando pendientes…</p></div>` +
    `</div>`;

  modalCola.addEventListener('click', async (e) => {
    if (e.target === modalCola || e.target.closest('[data-ta-cerrar]')) {
      modalCola?.remove(); modalCola = null; return;
    }
    const ir = e.target.closest('[data-ta-ir]');
    if (ir) {
      contextoRef?.emitir('edificio:punto-solicitado', { id: ir.dataset.taIr });
      modalCola?.remove(); modalCola = null; return;
    }
    const btn = e.target.closest('[data-ta-acc]');
    if (!btn) return;
    btn.disabled = true;
    try {
      const res = await llamarRpcAdmin({ p_accion: btn.dataset.taAcc, p_foto_id: btn.dataset.taId });
      if (res.ruta_anterior_borrar) borrarArchivoStorage(res.ruta_anterior_borrar);
      if (res.ruta_borrar) borrarArchivoStorage(res.ruta_borrar);
      if (res.punto_id) contextoRef?.emitir('tarjeta:foto-actualizada', { puntoId: res.punto_id });
      pendientesCache = pendientesCache.filter((x) => x.id !== btn.dataset.taId);
      pintarBarraAdmin();
      pintarItemsCola();
      avisar?.(btn.dataset.taAcc === 'aprobar' ? 'Foto aprobada y publicada en vivo.' : 'Propuesta rechazada y eliminada.');
    } catch (err) {
      btn.disabled = false;
      avisar?.(err.message || 'Error al moderar la foto.', true);
    }
  });

  document.body.appendChild(modalCola);
  requestAnimationFrame(() => modalCola?.classList.add('ti-abierto'));
  try { await refrescarPendientes(); pintarItemsCola(); }
  catch (err) { avisar?.(err.message, true); modalCola?.remove(); modalCola = null; }
}

function abrirModalLogin() {
  if (modalLogin) return;
  modalLogin = document.createElement('div');
  modalLogin.className = 'ti-modal-fondo';
  modalLogin.setAttribute('role', 'dialog');
  modalLogin.setAttribute('aria-modal', 'true');
  modalLogin.innerHTML =
    `<form class="ti-modal" novalidate>` +
      `<header class="ti-cabecera">` +
        `<div class="ti-titulos"><h3 class="ti-titulo">Acceso Administrador</h3>` +
        `<p class="ti-ap-sub">Inicio de sesión provisional · CANGEL GAMES</p></div>` +
        `<button type="button" class="ti-cerrar" data-ta-cancelar aria-label="Cerrar">✕</button>` +
      `</header>` +
      `<label class="ti-campo" for="ta-email"><span>Correo</span><input id="ta-email" name="email" type="email" required autocomplete="username" placeholder="correo@ejemplo.com" data-ta-email></label>` +
      `<label class="ti-campo" for="ta-pass"><span>Contraseña</span><input id="ta-pass" name="password" type="password" required autocomplete="current-password" placeholder="••••••••" data-ta-pass></label>` +
      `<p class="ti-ap-estado" data-ta-err></p>` +
      `<div class="ti-acciones">` +
        `<button type="button" class="ti-btn" data-ta-cancelar>Cancelar</button>` +
        `<button type="submit" class="ti-btn ti-btn-primario" data-ta-entrar>Entrar</button>` +
      `</div>` +
    `</form>`;

  const cerrar = () => {
    modalLogin?.remove(); modalLogin = null;
    if (!tokenAdmin && /^\/admin\/?$/i.test(window.location.pathname)) window.history.replaceState({}, '', '/');
  };
  modalLogin.addEventListener('click', (e) => { if (e.target === modalLogin || e.target.closest('[data-ta-cancelar]')) cerrar(); });
  modalLogin.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = String(modalLogin.querySelector('[data-ta-email]')?.value || '').trim();
    const password = String(modalLogin.querySelector('[data-ta-pass]')?.value || '');
    const errEl = modalLogin.querySelector('[data-ta-err]');
    const btn = modalLogin.querySelector('[data-ta-entrar]');
    if (!email || !password) { if (errEl) errEl.textContent = 'Ingresa tu correo y contraseña.'; return; }
    if (btn) btn.disabled = true;
    if (errEl) errEl.textContent = 'Verificando acceso…';
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ email, password })
      });
      const dato = await res.json().catch(() => null);
      if (!res.ok || !dato?.access_token) throw new Error('Correo o contraseña incorrectos.');
      guardarToken(dato.access_token);
      await refrescarPendientes();
      cerrar();
      avisar?.('Modo Administrador activado.');
      const panelAbierto = document.querySelector('#local-tarjeta-info .ti-panel');
      if (panelAbierto) contextoRef?.emitir('tarjeta:foto-actualizada', {});
    } catch (err) {
      guardarToken('');
      if (errEl) errEl.textContent = err.message || 'No se pudo iniciar sesión.';
      if (btn) btn.disabled = false;
    }
  });

  document.body.appendChild(modalLogin);
  requestAnimationFrame(() => modalLogin?.classList.add('ti-abierto'));
}

function cerrarSesionAdmin(notificar = true) {
  const previo = tokenAdmin;
  guardarToken('');
  pendientesCache = [];
  barraEl?.remove(); barraEl = null;
  modalCola?.remove(); modalCola = null;
  document.querySelectorAll('[data-ta-oficial]').forEach((el) => el.remove());
  if (previo) {
    fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${previo}` }
    }).catch(() => {});
  }
  if (/^\/admin\/?$/i.test(window.location.pathname)) window.history.replaceState({}, '', '/');
  if (notificar) avisar?.('Sesión de Administrador cerrada.');
}

export async function iniciarAdminProvisional(contexto, { mostrarAvisoTarjeta } = {}) {
  if (iniciado) return;
  iniciado = true;
  contextoRef = contexto;
  avisar = mostrarAvisoTarjeta;
  cargarCssAdmin();

  contexto.escuchar('iconos:datos-listos', (det) => {
    for (const u of det?.ubicaciones || []) titulosPorId.set(u.id, u.titulo);
  });
  contexto.emitir('iconos:solicitar-datos');
  contexto.escuchar('tarjeta:abierta', (det) => inyectarBotonOficial(det?.panel, det?.ubicacion));

  tokenAdmin = leerToken();
  if (tokenAdmin) {
    try { await refrescarPendientes(); } catch { abrirModalLogin(); }
  } else if (/^\/admin\/?$/i.test(window.location.pathname)) {
    abrirModalLogin();
  }
}
