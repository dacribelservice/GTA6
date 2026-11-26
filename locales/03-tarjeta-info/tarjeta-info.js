/**
 * 🖼️ TARJETA DE INFORMACIÓN (tarjeta-info.js <= 250 líneas)
 * Muestra cada marcador con marco panorámico 16:9 degradado GTA 6, carga fotos
 * bajo demanda desde Supabase RPC con caché en memoria (0 KB en carga inicial)
 * y visor en grande (lightbox). Listo para conectar flujos comunitarios y Admin.
 */

const SUPABASE_URL = 'https://ktnrjoewhhfjbmqyxfij.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mi9MnkRKfMlhk7YUi3rgaQ_hp6Ni393';

const SVG = {
  cerrar: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  camara: '<svg class="ti-cam-svg" viewBox="0 0 24 24" fill="none" stroke="url(#ti-cam-grad)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><linearGradient id="ti-cam-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3454d1"/><stop offset="30%" stop-color="#8a3ab9"/><stop offset="56%" stop-color="#ff2a85"/><stop offset="80%" stop-color="#ff6b52"/><stop offset="100%" stop-color="#ffc168"/></linearGradient></defs><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  enlace: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.2 4.7"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.6-1.6"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.3 3.8 1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/></svg>'
};

const cacheFotos = new Map();
let contenedor = null, panel = null, lightbox = null, lightboxImg = null, toastEl = null;
let contextoGlobal = null, seleccionActual = null, solicitudSeq = 0, timerToast = 0, iniciado = false;

const escaparHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export function mostrarAvisoTarjeta(mensaje, esError = false) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'ti-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = String(mensaje || '');
  toastEl.classList.toggle('ti-error', Boolean(esError));
  toastEl.classList.add('ti-mostrar');
  clearTimeout(timerToast);
  timerToast = window.setTimeout(() => toastEl?.classList.remove('ti-mostrar'), 3400);
}

async function consultarFotoPunto(puntoId, forzar = false) {
  if (!forzar && cacheFotos.has(puntoId)) return cacheFotos.get(puntoId);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/obtener_foto_punto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ p_punto_id: puntoId })
    });
    if (!res.ok) return null;
    const dato = await res.json();
    const foto = dato && typeof dato === 'object' && dato.url_imagen ? dato : null;
    cacheFotos.set(puntoId, foto);
    return foto;
  } catch {
    return null;
  }
}

function asegurarLightbox() {
  if (lightbox) return;
  lightbox = document.createElement('div');
  lightbox.className = 'ti-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Vista ampliada de la fotografía');
  lightbox.innerHTML =
    `<div class="ti-lightbox-marco">` +
      `<button type="button" class="ti-cerrar ti-lightbox-cerrar" aria-label="Cerrar imagen">${SVG.cerrar}</button>` +
      `<img class="ti-lightbox-img" alt="">` +
    `</div>`;
  lightboxImg = lightbox.querySelector('.ti-lightbox-img');
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.closest('.ti-lightbox-cerrar')) cerrarLightbox();
  });
  document.body.appendChild(lightbox);
}

function abrirLightbox(url, titulo) {
  asegurarLightbox();
  lightboxImg.src = url;
  lightboxImg.alt = titulo || 'Fotografía del marcador';
  requestAnimationFrame(() => lightbox.classList.add('ti-abierto'));
}

function cerrarLightbox() {
  lightbox?.classList.remove('ti-abierto');
}

async function copiarEnlaceDirecto(ubicacion) {
  const url = `${window.location.origin}${window.location.pathname}#punto=${encodeURIComponent(ubicacion.id)}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      window.location.hash = `punto=${encodeURIComponent(ubicacion.id)}`;
    }
    mostrarAvisoTarjeta('Enlace directo copiado al portapapeles.');
  } catch {
    window.location.hash = `punto=${encodeURIComponent(ubicacion.id)}`;
    mostrarAvisoTarjeta('Enlace actualizado en la barra de direcciones.');
  }
}

function pintarMarcoFoto(cajaFoto, accionesEl, foto, ubicacion) {
  cajaFoto.classList.remove('ti-brillo');
  accionesEl.querySelector('.ti-btn-reporte')?.remove();

  if (!foto) {
    cajaFoto.innerHTML =
      `<button type="button" class="ti-vacio ti-vacio-btn" data-accion="subir" aria-label="Subir foto de este lugar">` +
        `${SVG.camara}` +
        `<strong class="ti-vacio-titulo">Subir foto de este lugar</strong>` +
        `<p>Este lugar aún no tiene foto oficial.</p>` +
      `</button>`;
    return;
  }

  const credito = foto.es_oficial ? 'Foto oficial CANGEL' : `Aportada por @${escaparHtml(foto.autor_alias || 'Anónimo')}`;
  cajaFoto.innerHTML =
    `<button type="button" class="ti-foto-btn" data-accion="ampliar" aria-label="Ver fotografía en grande">` +
      `<img class="ti-img" src="${escaparHtml(foto.url_imagen)}" alt="${escaparHtml(ubicacion.titulo)}" decoding="async" loading="eager">` +
    `</button>` +
    `<span class="ti-credito ${foto.es_oficial ? 'ti-oficial' : ''}">${credito}</span>`;

  const img = cajaFoto.querySelector('.ti-img');
  const revelar = () => {
    img.classList.add('ti-cargada');
    cajaFoto.classList.add('ti-brillo');
  };
  if (img.complete && img.naturalWidth > 0) requestAnimationFrame(revelar);
  else img.addEventListener('load', revelar, { once: true });

  const btnRep = document.createElement('button');
  btnRep.type = 'button';
  btnRep.className = 'ti-btn ti-btn-reporte';
  btnRep.dataset.accion = 'reportar';
  btnRep.innerHTML = `${SVG.alerta}<span>Esta foto no es / Sugerir otra</span>`;
  accionesEl.appendChild(btnRep);
}

function construirEstructuraTarjeta(ubicacion, categoria) {
  const catNombre = categoria?.nombre || ubicacion.categoria || 'Leonida';
  const catColor = categoria?.color || '#ff2a85';
  const catIcono = categoria?.icono || 'icono-pin-personal';

  panel.innerHTML =
    `<span class="ti-asa" aria-hidden="true"></span>` +
    `<header class="ti-cabecera">` +
      `<div class="ti-titulos">` +
        `<div class="ti-meta">` +
          `<span class="ti-chip ti-chip-cat" style="--ti-cat:${escaparHtml(catColor)}">` +
            `<svg class="ti-chip-svg" viewBox="0 0 24 24" aria-hidden="true"><use href="#${escaparHtml(catIcono)}"></use></svg>` +
            `${escaparHtml(catNombre)}` +
          `</span>` +
          `<span class="ti-chip">${escaparHtml(ubicacion.region || 'Leonida')}</span>` +
        `</div>` +
        `<h2 class="ti-titulo">${escaparHtml(ubicacion.titulo)}</h2>` +
      `</div>` +
      `<button type="button" class="ti-cerrar" data-accion="cerrar" aria-label="Cerrar tarjeta">${SVG.cerrar}</button>` +
    `</header>` +
    `<div class="ti-marco">` +
      `<div class="ti-foto-caja" data-ti-foto><div class="ti-esqueleto">Cargando fotografía…</div></div>` +
    `</div>` +
    `<p class="ti-desc">${escaparHtml(ubicacion.descripcion || 'Punto de interés en Leonida.')}</p>` +
    `<div class="ti-acciones" data-ti-acciones>` +
      `<button type="button" class="ti-btn" data-accion="copiar">${SVG.enlace}<span>Copiar enlace directo</span></button>` +
    `</div>`;
}

async function abrirTarjeta(detalle, forzarFoto = false) {
  const ubicacion = detalle?.ubicacion;
  if (!ubicacion || !contenedor) return;
  seleccionActual = { ubicacion, categoria: detalle.categoria || null, foto: null };

  if (!panel) {
    panel = document.createElement('article');
    panel.className = 'ti-panel';
    panel.setAttribute('aria-label', 'Tarjeta de Información');
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    panel.addEventListener('click', manejarClicTarjeta);
    contenedor.appendChild(panel);
  }

  construirEstructuraTarjeta(ubicacion, seleccionActual.categoria);
  requestAnimationFrame(() => panel.classList.add('ti-visible'));

  const seq = ++solicitudSeq;
  const foto = await consultarFotoPunto(ubicacion.id, forzarFoto);
  if (seq !== solicitudSeq || !panel) return;

  seleccionActual.foto = foto;
  const cajaFoto = panel.querySelector('[data-ti-foto]');
  const accionesEl = panel.querySelector('[data-ti-acciones]');
  if (cajaFoto && accionesEl) pintarMarcoFoto(cajaFoto, accionesEl, foto, ubicacion);
  contextoGlobal?.emitir('tarjeta:abierta', { ...seleccionActual, panel });
}

function cerrarTarjeta() {
  if (!panel) return;
  cerrarLightbox();
  solicitudSeq++;
  seleccionActual = null;
  panel.classList.remove('ti-visible');
  const nodo = panel;
  panel = null;
  window.setTimeout(() => nodo.remove(), 250);
  contextoGlobal?.emitir('tarjeta:cerrada', {});
}

function manejarClicTarjeta(e) {
  const btn = e.target.closest('[data-accion]');
  if (!btn || !seleccionActual) return;
  const { accion } = btn.dataset;
  if (accion === 'cerrar') return cerrarTarjeta();
  if (accion === 'copiar') return copiarEnlaceDirecto(seleccionActual.ubicacion);
  if (accion === 'ampliar' && seleccionActual.foto?.url_imagen) {
    return abrirLightbox(seleccionActual.foto.url_imagen, seleccionActual.ubicacion.titulo);
  }
  if (accion === 'subir' || accion === 'reportar') {
    const detalle = {
      modo: accion,
      ubicacion: seleccionActual.ubicacion,
      fotoActual: seleccionActual.foto
    };
    contextoGlobal?.emitir('tarjeta:solicitar-aporte', detalle);
    import('./tarjeta-aportes.js')
      .then((mod) => mod.abrirModalAporte({ ...detalle, mostrarAviso: mostrarAvisoTarjeta }))
      .catch(() => mostrarAvisoTarjeta('No se pudo abrir el cargador de fotos.', true));
  }
}

export function iniciarTarjetaInfo(contexto) {
  if (iniciado) return;
  contenedor = document.getElementById('local-tarjeta-info');
  if (!contenedor) return;
  iniciado = true;
  contextoGlobal = contexto;

  contexto.escuchar('iconos:seleccionado', (det) => abrirTarjeta(det, false));
  contexto.escuchar('tarjeta:foto-actualizada', (det) => {
    if (det?.puntoId) cacheFotos.delete(det.puntoId);
    if (seleccionActual && (!det?.puntoId || det.puntoId === seleccionActual.ubicacion.id)) {
      abrirTarjeta(seleccionActual, true);
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lightbox?.classList.contains('ti-abierto')) cerrarLightbox();
    else if (panel) cerrarTarjeta();
  });

  // Gancho provisional 100% desechable para /admin (0 KB para visitantes normales)
  const esAdmin = /^\/admin\/?$/i.test(window.location.pathname) || Boolean(sessionStorage.getItem('gta6_cangel_admin_token'));
  if (esAdmin) {
    import('./tarjeta-admin.js').then((m) => m.iniciarAdminProvisional(contexto, { mostrarAvisoTarjeta })).catch(() => {});
  }
}
