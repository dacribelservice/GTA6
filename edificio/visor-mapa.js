/**
 * 🏢 EDIFICIO PRINCIPAL — MOTOR DEL MAPA HD A 60 FPS (visor-mapa.js <= 200 líneas)
 * Renderiza el mapa base 4K (3072x3072) + sistema de teselas HD bajo demanda (z=13..16,
 * resolución efectiva 49,152x49,152 px a nivel de calle), 3 vistas de color y #punto=.
 */
const TAMANO_BASE = 1536;
const ZOOM_MIN = 0.42;
const ZOOM_MAX = 16.0;
const URL_TESELAS = 'https://tiles.mapgenie.io/games/grand-theft-auto-6/leonida/day-v2';

export const REGIONES_LEONIDA = [
  { id: 'mount-kalaga', nombre: 'Mount Kalaga National Park', x: 48.0, y: 24.5 },
  { id: 'ambrosia', nombre: 'Ambrosia', x: 56.5, y: 38.0 },
  { id: 'port-gellhorn', nombre: 'Port Gellhorn', x: 38.5, y: 48.5 },
  { id: 'vice-city', nombre: 'Vice City', x: 61.5, y: 55.5 },
  { id: 'grassrivers', nombre: 'Grassrivers', x: 48.5, y: 69.5 },
  { id: 'leonida-keys', nombre: 'Leonida Keys', x: 44.5, y: 82.5 }
];
const estado = {
  tx: 0, ty: 0, escala: 1, arrastrando: false, inicioX: 0, inicioY: 0, movido: false,
  vista: localStorage.getItem('gta6_vista_mapa') || 'atlas'
};
let elEscenario, elLienzo, elTeselas, elZoomTxt, elCoordTxt, timerTeselas;
const teselasActivas = new Map();

function limpiarCapasPrevias(zActual) {
  for (const [, img] of teselasActivas) {
    if (img.dataset.z === String(zActual) && !img.classList.contains('visible')) return;
  }
  for (const [clave, img] of teselasActivas) {
    if (img.dataset.z !== String(zActual)) { img.remove(); teselasActivas.delete(clave); }
  }
}

function actualizarTeselasHD() {
  if (!elTeselas || !elEscenario) return;
  if (estado.escala < 1.32) { elTeselas.innerHTML = ''; teselasActivas.clear(); return; }
  const z = Math.min(16, Math.max(13, 12 + Math.ceil(Math.log2(estado.escala / 1.05))));
  const f = Math.pow(2, z - 12), n = 12 * f, tam = 128 / f, rect = elEscenario.getBoundingClientRect();
  const cMin = Math.max(0, Math.floor((-estado.tx / estado.escala) / tam) - 1);
  const cMax = Math.min(n - 1, Math.floor(((rect.width - estado.tx) / estado.escala) / tam) + 1);
  const rMin = Math.max(0, Math.floor((-estado.ty / estado.escala) / tam) - 1);
  const rMax = Math.min(n - 1, Math.floor(((rect.height - estado.ty) / estado.escala) / tam) + 1);

  const visibles = new Set();
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const tx = 2034 * f + c, ty = 2034 * f + r, clave = `${z}_${ty}_${tx}`;
      visibles.add(clave);
      if (teselasActivas.has(clave)) continue;
      const img = document.createElement('img');
      img.className = 'tesela-hd'; img.dataset.z = String(z); img.decoding = 'async'; img.alt = '';
      img.style.cssText = `left:${c * tam}px;top:${r * tam}px;width:${tam + 0.35}px;height:${tam + 0.35}px;z-index:${z}`;
      img.onload = () => { img.classList.add('visible'); limpiarCapasPrevias(z); };
      img.onerror = () => { teselasActivas.delete(clave); img.remove(); };
      img.src = `${URL_TESELAS}/${z}/${ty}/${tx}.jpg`;
      elTeselas.appendChild(img); teselasActivas.set(clave, img);
    }
  }
  for (const [clave, img] of teselasActivas) {
    if (img.dataset.z === String(z) && !visibles.has(clave)) { img.remove(); teselasActivas.delete(clave); }
  }
  limpiarCapasPrevias(z);
}

function aplicarTransformacion(animar = false) {
  if (!elLienzo) return;
  elLienzo.style.transition = animar ? 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
  elLienzo.style.transform = `translate3d(${estado.tx.toFixed(1)}px, ${estado.ty.toFixed(1)}px, 0) scale(${estado.escala.toFixed(3)})`;
  if (elZoomTxt) elZoomTxt.textContent = `${Math.round(estado.escala * 100)}%`;
  document.documentElement.style.setProperty('--escala-mapa', estado.escala.toFixed(3));
  clearTimeout(timerTeselas);
  timerTeselas = setTimeout(actualizarTeselasHD, animar ? 180 : 45);
}

export function enfocarCoordenada(xPorc, yPorc, nuevoZoom = 2.8, animar = true) {
  if (!elEscenario) return;
  estado.escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nuevoZoom));
  const rect = elEscenario.getBoundingClientRect();
  estado.tx = rect.width / 2 - ((xPorc / 100) * TAMANO_BASE) * estado.escala;
  estado.ty = rect.height / 2 - ((yPorc / 100) * TAMANO_BASE) * estado.escala;
  aplicarTransformacion(animar);
}

export function centrarMapaInicial() {
  if (!elEscenario) return;
  const rect = elEscenario.getBoundingClientRect();
  const ideal = Math.min(rect.width / TAMANO_BASE, rect.height / TAMANO_BASE) * 1.05;
  estado.escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, ideal));
  estado.tx = (rect.width - TAMANO_BASE * estado.escala) / 2;
  estado.ty = (rect.height - TAMANO_BASE * estado.escala) / 2;
  aplicarTransformacion(true);
}

function hacerZoomEnPunto(factor, clienteX, clienteY, animar = false) {
  const rect = elEscenario.getBoundingClientRect();
  const cx = clienteX - rect.left, cy = clienteY - rect.top, previa = estado.escala;
  const siguiente = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, previa * factor));
  if (siguiente === previa) return;
  estado.tx = cx - ((cx - estado.tx) / previa) * siguiente;
  estado.ty = cy - ((cy - estado.ty) / previa) * siguiente;
  estado.escala = siguiente;
  aplicarTransformacion(animar);
}

function cambiarVista(nuevaVista) {
  estado.vista = nuevaVista;
  document.documentElement.setAttribute('data-vista', nuevaVista);
  localStorage.setItem('gta6_vista_mapa', nuevaVista);
  document.querySelectorAll('[data-btn-vista]').forEach((b) => b.classList.toggle('activo', b.dataset.btnVista === nuevaVista));
}

function montarTerrenoYControles() {
  document.getElementById('capa-terreno').innerHTML = `
    <img id="imagen-mapa-leonida" src="recursos/mapa/leonida-oficial.webp" alt="Mapa Oficial HD del Estado de Leonida" width="1536" height="1536" decoding="async" fetchpriority="high">
    <div id="capa-teselas-hd"></div>
    <div id="capa-regiones-etiquetas"></div>
  `;
  elTeselas = document.getElementById('capa-teselas-hd');
  const contRegiones = document.getElementById('capa-regiones-etiquetas');
  REGIONES_LEONIDA.forEach((reg) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'etiqueta-region';
    btn.style.left = `${reg.x}%`; btn.style.top = `${reg.y}%`; btn.textContent = reg.nombre;
    btn.addEventListener('click', (e) => { e.stopPropagation(); enfocarCoordenada(reg.x, reg.y, 3.2, true); });
    contRegiones.appendChild(btn);
  });
  const nav = document.getElementById('controles-edificio');
  nav.innerHTML = `
    <div class="barra-edificio" role="group" aria-label="Cambiar vista de color">
      <button type="button" class="btn-edificio" data-btn-vista="radar">🌙 Radar</button>
      <button type="button" class="btn-edificio" data-btn-vista="atlas">🗺️ Atlas</button>
      <button type="button" class="btn-edificio" data-btn-vista="satelite">🛰️ Satélite</button>
    </div>
    <div class="barra-edificio" role="group" aria-label="Zoom HD y coordenadas">
      <span class="lectura-edificio" id="lectura-coords">X: 50.0% · Y: 50.0%</span>
      <button type="button" class="btn-edificio" id="btn-zoom-out" title="Alejar">➖</button>
      <button type="button" class="btn-edificio" id="btn-zoom-reset" title="Centrar mapa">100%</button>
      <button type="button" class="btn-edificio" id="btn-zoom-in" title="Acercar">➕</button>
    </div>
  `;
  elZoomTxt = document.getElementById('btn-zoom-reset');
  elCoordTxt = document.getElementById('lectura-coords');
  nav.querySelectorAll('[data-btn-vista]').forEach((b) => b.addEventListener('click', () => cambiarVista(b.dataset.btnVista)));
  document.getElementById('btn-zoom-in').addEventListener('click', () => hacerZoomEnPunto(1.4, window.innerWidth / 2, window.innerHeight / 2, true));
  document.getElementById('btn-zoom-out').addEventListener('click', () => hacerZoomEnPunto(0.72, window.innerWidth / 2, window.innerHeight / 2, true));
  elZoomTxt.addEventListener('click', centrarMapaInicial);
  cambiarVista(estado.vista);
}

function registrarEventosInteraccion() {
  elEscenario.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    estado.arrastrando = true; estado.movido = false;
    estado.inicioX = e.clientX - estado.tx; estado.inicioY = e.clientY - estado.ty;
    elEscenario.classList.add('arrastrando'); elEscenario.setPointerCapture(e.pointerId);
  });
  elEscenario.addEventListener('pointermove', (e) => {
    const rect = elEscenario.getBoundingClientRect();
    const xP = Math.min(100, Math.max(0, (((e.clientX - rect.left - estado.tx) / estado.escala) / TAMANO_BASE) * 100));
    const yP = Math.min(100, Math.max(0, (((e.clientY - rect.top - estado.ty) / estado.escala) / TAMANO_BASE) * 100));
    if (elCoordTxt) elCoordTxt.textContent = `X: ${xP.toFixed(1)}% · Y: ${yP.toFixed(1)}%`;
    if (!estado.arrastrando) return;
    const nx = e.clientX - estado.inicioX, ny = e.clientY - estado.inicioY;
    if (Math.hypot(nx - estado.tx, ny - estado.ty) > 4) estado.movido = true;
    estado.tx = nx; estado.ty = ny; aplicarTransformacion(false);
  });
  const fin = (e) => {
    if (!estado.arrastrando) return;
    estado.arrastrando = false; elEscenario.classList.remove('arrastrando');
    if (!estado.movido && e.type === 'pointerup') {
      const rect = elEscenario.getBoundingClientRect();
      const x = (((e.clientX - rect.left - estado.tx) / estado.escala) / TAMANO_BASE) * 100;
      const y = (((e.clientY - rect.top - estado.ty) / estado.escala) / TAMANO_BASE) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        window.dispatchEvent(new CustomEvent('edificio:click-mapa', { detail: { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } }));
      }
    }
  };
  elEscenario.addEventListener('pointerup', fin);
  elEscenario.addEventListener('pointercancel', fin);
  elEscenario.addEventListener('dblclick', (e) => hacerZoomEnPunto(1.85, e.clientX, e.clientY, true));
  elEscenario.addEventListener('wheel', (e) => { e.preventDefault(); hacerZoomEnPunto(e.deltaY < 0 ? 1.18 : 0.85, e.clientX, e.clientY, false); }, { passive: false });
}

export function leerEnlaceCompartido() {
  const idPunto = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('punto');
  if (idPunto) window.dispatchEvent(new CustomEvent('edificio:punto-solicitado', { detail: { id: idPunto } }));
}

export function iniciarVisorMapa() {
  elEscenario = document.getElementById('escenario-mapa');
  elLienzo = document.getElementById('lienzo-mapa');
  if (!elEscenario || !elLienzo) return;
  montarTerrenoYControles(); registrarEventosInteraccion(); centrarMapaInicial();
  window.addEventListener('resize', centrarMapaInicial);
  window.addEventListener('hashchange', leerEnlaceCompartido);
  setTimeout(leerEnlaceCompartido, 120);
}
