/**
 * 🏢 EDIFICIO PRINCIPAL — MOTOR DEL MAPA A 60 FPS (visor-mapa.js <= 200 líneas)
 * Controla arrastre GPU (mouse/táctil), zoom al cursor, las 6 regiones oficiales,
 * selector de 3 vistas de color (Radar / Atlas / Satélite) y lectura de #punto=.
 */
const ANCHO_BASE = 1600;
const ALTO_BASE = 1522;
const ZOOM_MIN = 0.38;
const ZOOM_MAX = 4.5;

export const REGIONES_LEONIDA = [
  { id: 'mount-kalaga', nombre: 'Mount Kalaga National Park', x: 45.0, y: 18.0 },
  { id: 'ambrosia', nombre: 'Ambrosia', x: 53.5, y: 34.0 },
  { id: 'port-gellhorn', nombre: 'Port Gellhorn', x: 30.0, y: 50.0 },
  { id: 'vice-city', nombre: 'Vice City', x: 61.5, y: 55.0 },
  { id: 'grassrivers', nombre: 'Grassrivers', x: 44.5, y: 71.0 },
  { id: 'leonida-keys', nombre: 'Leonida Keys', x: 42.0, y: 86.5 }
];

const estado = {
  tx: 0, ty: 0, escala: 1,
  arrastrando: false, inicioX: 0, inicioY: 0, movido: false,
  vista: localStorage.getItem('gta6_vista_mapa') || 'atlas'
};

let elEscenario, elLienzo, elZoomTxt, elCoordTxt;

function aplicarTransformacion(animar = false) {
  if (!elLienzo) return;
  elLienzo.style.transition = animar ? 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
  elLienzo.style.transform = `translate3d(${estado.tx.toFixed(1)}px, ${estado.ty.toFixed(1)}px, 0) scale(${estado.escala.toFixed(3)})`;
  if (elZoomTxt) elZoomTxt.textContent = `${Math.round(estado.escala * 100)}%`;
  document.documentElement.style.setProperty('--escala-mapa', estado.escala.toFixed(3));
}

export function enfocarCoordenada(xPorc, yPorc, nuevoZoom = 1.65, animar = true) {
  if (!elEscenario) return;
  estado.escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nuevoZoom));
  const rect = elEscenario.getBoundingClientRect();
  const px = (xPorc / 100) * ANCHO_BASE;
  const py = (yPorc / 100) * ALTO_BASE;
  estado.tx = rect.width / 2 - px * estado.escala;
  estado.ty = rect.height / 2 - py * estado.escala;
  aplicarTransformacion(animar);
}

export function centrarMapaInicial() {
  if (!elEscenario) return;
  const rect = elEscenario.getBoundingClientRect();
  const escalaIdeal = Math.min(rect.width / ANCHO_BASE, rect.height / ALTO_BASE);
  estado.escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, escalaIdeal * 0.94));
  estado.tx = (rect.width - ANCHO_BASE * estado.escala) / 2;
  estado.ty = (rect.height - ALTO_BASE * estado.escala) / 2;
  aplicarTransformacion(true);
}

function hacerZoomEnPunto(factor, clienteX, clienteY, animar = false) {
  const rect = elEscenario.getBoundingClientRect();
  const cx = clienteX - rect.left;
  const cy = clienteY - rect.top;
  const previa = estado.escala;
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
  document.querySelectorAll('[data-btn-vista]').forEach((btn) => {
    btn.classList.toggle('activo', btn.dataset.btnVista === nuevaVista);
  });
}

function montarTerrenoYControles() {
  const capaTerreno = document.getElementById('capa-terreno');
  capaTerreno.innerHTML = `
    <img id="imagen-mapa-leonida" src="recursos/mapa/leonida-oficial.webp" alt="Mapa Oficial del Estado de Leonida" width="1600" height="1522" decoding="async" fetchpriority="high">
    <div id="capa-regiones-etiquetas"></div>
  `;
  const contRegiones = document.getElementById('capa-regiones-etiquetas');
  REGIONES_LEONIDA.forEach((reg) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'etiqueta-region';
    btn.style.left = `${reg.x}%`;
    btn.style.top = `${reg.y}%`;
    btn.textContent = reg.nombre;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      enfocarCoordenada(reg.x, reg.y, 1.85, true);
    });
    contRegiones.appendChild(btn);
  });

  const nav = document.getElementById('controles-edificio');
  nav.innerHTML = `
    <div class="barra-edificio" role="group" aria-label="Cambiar vista de color">
      <button type="button" class="btn-edificio" data-btn-vista="radar">🌙 Radar</button>
      <button type="button" class="btn-edificio" data-btn-vista="atlas">🗺️ Atlas</button>
      <button type="button" class="btn-edificio" data-btn-vista="satelite">🛰️ Satélite</button>
    </div>
    <div class="barra-edificio" role="group" aria-label="Zoom y coordenadas">
      <span class="lectura-edificio" id="lectura-coords">X: 50.0% · Y: 50.0%</span>
      <button type="button" class="btn-edificio" id="btn-zoom-out" title="Alejar">➖</button>
      <button type="button" class="btn-edificio" id="btn-zoom-reset" title="Centrar mapa">100%</button>
      <button type="button" class="btn-edificio" id="btn-zoom-in" title="Acercar">➕</button>
    </div>
  `;
  elZoomTxt = document.getElementById('btn-zoom-reset');
  elCoordTxt = document.getElementById('lectura-coords');
  nav.querySelectorAll('[data-btn-vista]').forEach((b) => {
    b.addEventListener('click', () => cambiarVista(b.dataset.btnVista));
  });
  document.getElementById('btn-zoom-in').addEventListener('click', () => hacerZoomEnPunto(1.25, window.innerWidth / 2, window.innerHeight / 2, true));
  document.getElementById('btn-zoom-out').addEventListener('click', () => hacerZoomEnPunto(0.8, window.innerWidth / 2, window.innerHeight / 2, true));
  elZoomTxt.addEventListener('click', centrarMapaInicial);
  cambiarVista(estado.vista);
}

function registrarEventosInteraccion() {
  elEscenario.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    estado.arrastrando = true;
    estado.movido = false;
    estado.inicioX = e.clientX - estado.tx;
    estado.inicioY = e.clientY - estado.ty;
    elEscenario.classList.add('arrastrando');
    elEscenario.setPointerCapture(e.pointerId);
  });

  elEscenario.addEventListener('pointermove', (e) => {
    const rect = elEscenario.getBoundingClientRect();
    const xPorc = Math.min(100, Math.max(0, (((e.clientX - rect.left - estado.tx) / estado.escala) / ANCHO_BASE) * 100));
    const yPorc = Math.min(100, Math.max(0, (((e.clientY - rect.top - estado.ty) / estado.escala) / ALTO_BASE) * 100));
    if (elCoordTxt) elCoordTxt.textContent = `X: ${xPorc.toFixed(1)}% · Y: ${yPorc.toFixed(1)}%`;

    if (!estado.arrastrando) return;
    const nx = e.clientX - estado.inicioX;
    const ny = e.clientY - estado.inicioY;
    if (Math.hypot(nx - estado.tx, ny - estado.ty) > 4) estado.movido = true;
    estado.tx = nx;
    estado.ty = ny;
    aplicarTransformacion(false);
  });

  const finalizarArrastre = (e) => {
    if (!estado.arrastrando) return;
    estado.arrastrando = false;
    elEscenario.classList.remove('arrastrando');
    if (!estado.movido && e.type === 'pointerup') {
      const rect = elEscenario.getBoundingClientRect();
      const x = (((e.clientX - rect.left - estado.tx) / estado.escala) / ANCHO_BASE) * 100;
      const y = (((e.clientY - rect.top - estado.ty) / estado.escala) / ALTO_BASE) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        window.dispatchEvent(new CustomEvent('edificio:click-mapa', { detail: { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } }));
      }
    }
  };
  elEscenario.addEventListener('pointerup', finalizarArrastre);
  elEscenario.addEventListener('pointercancel', finalizarArrastre);

  elEscenario.addEventListener('wheel', (e) => {
    e.preventDefault();
    hacerZoomEnPunto(e.deltaY < 0 ? 1.14 : 0.88, e.clientX, e.clientY, false);
  }, { passive: false });
}

export function leerEnlaceCompartido() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const idPunto = params.get('punto');
  if (idPunto) {
    window.dispatchEvent(new CustomEvent('edificio:punto-solicitado', { detail: { id: idPunto } }));
  }
}

export function iniciarVisorMapa() {
  elEscenario = document.getElementById('escenario-mapa');
  elLienzo = document.getElementById('lienzo-mapa');
  if (!elEscenario || !elLienzo) return;
  montarTerrenoYControles();
  registrarEventosInteraccion();
  centrarMapaInicial();
  window.addEventListener('resize', centrarMapaInicial);
  window.addEventListener('hashchange', leerEnlaceCompartido);
  setTimeout(leerEnlaceCompartido, 120);
}
