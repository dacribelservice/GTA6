/**
 * 📍 LOCAL #1: CAPA DE ICONOS DEL MAPA (iconos-mapa.js <= 180 líneas)
 * Carga el Sprite SVG único y ubicaciones de Leonida con Promise.all().
 * Aplica Viewport Culling + LOD por Zoom para mantener 60 FPS y DOM liviano.
 */

const RUTAS = { sprite: 'recursos/iconos/lamina-iconos.svg', categorias: 'datos/categorias.json' };
const mapaCategorias = new Map(), mapaUbicaciones = new Map(), nodosCache = new Map(), montados = new Set();
const filtro = { cats: null, q: '', reg: 'todas' };
const vista = { xMin: 0, xMax: 100, yMin: 0, yMax: 100, tx: 0, ty: 0, escala: 1, tamanoBase: 1536 };
let ubicaciones = [], capaIconos = null, idSeleccionado = null, eventosRegistrados = false, completados = new Set(), pinZoomAplicado = '';

async function cargarRecurso(url, tipo = 'json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${url}`);
  return tipo === 'text' ? res.text() : res.json();
}

function inyectarSpriteSVG(svgTexto) {
  if (document.getElementById('sprite-iconos-ign')) return;
  const cont = document.createElement('div');
  cont.id = 'sprite-iconos-ign'; cont.hidden = true; cont.innerHTML = svgTexto;
  document.body.appendChild(cont);
}

function indexarCategorias(catData) {
  mapaCategorias.clear();
  for (const g of catData.grupos || []) {
    for (const c of g.categorias || []) mapaCategorias.set(c.id, c);
  }
}

function crearBotonMarcador(u) {
  const cat = mapaCategorias.get(u.categoria) || { nombre: u.categoria, icono: 'icono-pin-personal', color: '#00f0ff' };
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'marcador-mapa';
  btn.style.setProperty('--color-icono', cat.color);
  Object.assign(btn.dataset, { id: u.id, categoria: u.categoria, region: u.region, titulo: u.titulo });
  btn.setAttribute('aria-label', `${u.titulo} — ${cat.nombre} (${u.region})`);
  btn.innerHTML = `<svg class="marcador-svg" viewBox="0 0 24 24" aria-hidden="true"><use href="#${cat.icono}"></use></svg>`;
  return btn;
}

function posicionarBoton(btn, u, base) {
  const px = vista.tx + (u.x / 100) * base, py = vista.ty + (u.y / 100) * base;
  btn.style.setProperty('--px', `${px.toFixed(1)}px`);
  btn.style.setProperty('--py', `${py.toFixed(1)}px`);
}

const enVentana = (u) => u.x >= vista.xMin && u.x <= vista.xMax && u.y >= vista.yMin && u.y <= vista.yMax;

function cumpleFiltro(u) {
  if (filtro.cats && !filtro.cats.has(u.categoria)) return false;
  if (filtro.reg !== 'todas' && u.region !== filtro.reg) return false;
  const cat = mapaCategorias.get(u.categoria);
  if (cat?.zoomMinimo && vista.escala < cat.zoomMinimo && !filtro.q && u.id !== idSeleccionado) return false;
  if (!filtro.q) return true;
  return u.titulo.toLowerCase().includes(filtro.q)
    || (u.descripcion && u.descripcion.toLowerCase().includes(filtro.q))
    || u.region.toLowerCase().includes(filtro.q)
    || u.categoria.toLowerCase().includes(filtro.q)
    || (cat && cat.nombre.toLowerCase().includes(filtro.q));
}

function obtenerBoton(u) {
  let btn = nodosCache.get(u.id);
  if (!btn) { btn = crearBotonMarcador(u); nodosCache.set(u.id, btn); }
  return btn;
}

function sincronizarVisibles() {
  if (!capaIconos) return;
  const pinZoom = vista.escala < 0.75 ? Math.max(0.65, vista.escala / 0.75).toFixed(3) : '1';
  if (pinZoom !== pinZoomAplicado) { pinZoomAplicado = pinZoom; capaIconos.style.setProperty('--pin-zoom', pinZoom); }
  const base = vista.tamanoBase * vista.escala;
  const visiblesAhora = new Set(), fragmento = document.createDocumentFragment();
  for (const u of ubicaciones) {
    if (!cumpleFiltro(u) || (!enVentana(u) && u.id !== idSeleccionado)) continue;
    visiblesAhora.add(u.id);
    const btn = obtenerBoton(u);
    posicionarBoton(btn, u, base);
    if (montados.has(u.id)) continue;
    btn.classList.toggle('completado', completados.has(u.id));
    btn.classList.toggle('seleccionado', u.id === idSeleccionado);
    fragmento.appendChild(btn); montados.add(u.id);
  }
  for (const id of montados) {
    if (visiblesAhora.has(id)) continue;
    nodosCache.get(id)?.remove(); montados.delete(id);
  }
  if (fragmento.childNodes.length) capaIconos.appendChild(fragmento);
}

function limpiarSeleccion(resincronizar = true) {
  if (!idSeleccionado) return;
  nodosCache.get(idSeleccionado)?.classList.remove('seleccionado');
  idSeleccionado = null;
  if (resincronizar) sincronizarVisibles();
}

function seleccionarMarcador(id, contexto, enfocar = false) {
  const ubicacion = mapaUbicaciones.get(id);
  if (!ubicacion) return;
  limpiarSeleccion(false);
  idSeleccionado = id;
  if (enfocar && typeof contexto?.enfocarCoordenada === 'function') {
    contexto.enfocarCoordenada(ubicacion.x, ubicacion.y, 4.5, true);
  }
  const btn = obtenerBoton(ubicacion);
  posicionarBoton(btn, ubicacion, vista.tamanoBase * vista.escala);
  if (!montados.has(id) && capaIconos) {
    btn.classList.toggle('completado', completados.has(id));
    capaIconos.appendChild(btn); montados.add(id);
  }
  btn.classList.add('seleccionado');
  if (enfocar) {
    btn.classList.remove('resaltado'); void btn.offsetWidth; btn.classList.add('resaltado');
    setTimeout(() => btn.classList.remove('resaltado'), 1900);
  }
  contexto.emitir('iconos:seleccionado', { ubicacion, categoria: mapaCategorias.get(ubicacion.categoria) || null });
}

function aplicarFiltros({ categoriasActivas, texto = '', region = 'todas' } = {}) {
  filtro.cats = categoriasActivas instanceof Set ? categoriasActivas
    : Array.isArray(categoriasActivas) ? new Set(categoriasActivas) : null;
  filtro.q = String(texto || '').trim().toLowerCase();
  filtro.reg = String(region || 'todas');
  sincronizarVisibles();
}

function aplicarProgreso({ completados: lista } = {}) {
  completados = lista instanceof Set ? new Set(lista) : new Set(Array.isArray(lista) ? lista : []);
  for (const id of montados) nodosCache.get(id)?.classList.toggle('completado', completados.has(id));
}

export async function iniciarIconosMapa(contexto) {
  capaIconos = document.getElementById('capa-iconos');
  if (!capaIconos) return;
  const [svgTexto, catData] = await Promise.all([
    cargarRecurso(RUTAS.sprite, 'text'), cargarRecurso(RUTAS.categorias)
  ]);
  inyectarSpriteSVG(svgTexto); indexarCategorias(catData);
  const iniciales = new Set([...mapaCategorias.values()].filter((c) => c.activaPorDefecto !== false).map((c) => c.id));
  if (filtro.cats === null) filtro.cats = iniciales;
  const archivos = catData.archivosUbicaciones || ['datos/ubicaciones-vice-city.json', 'datos/ubicaciones-regiones.json'];
  const bloques = await Promise.all(archivos.map((r) => cargarRecurso(r)));
  ubicaciones = bloques.flat();
  mapaUbicaciones.clear(); nodosCache.clear(); montados.clear(); capaIconos.innerHTML = '';
  for (const u of ubicaciones) mapaUbicaciones.set(u.id, u);

  if (!eventosRegistrados) {
    eventosRegistrados = true;
    capaIconos.addEventListener('pointerdown', (e) => { if (e.target.closest('.marcador-mapa')) e.stopPropagation(); });
    capaIconos.addEventListener('click', (e) => {
      const btn = e.target.closest('.marcador-mapa');
      if (!btn) return;
      e.stopPropagation(); seleccionarMarcador(btn.dataset.id, contexto);
    });
    contexto.escuchar('iconos:solicitar-datos', () => contexto.emitir('iconos:datos-listos', { categorias: catData, ubicaciones, mapaCategorias }));
    contexto.escuchar('edificio:punto-solicitado', (det) => { if (det?.id && mapaUbicaciones.has(det.id)) seleccionarMarcador(det.id, contexto, true); });
    contexto.escuchar('edificio:vista-cambiada', (v) => {
      if (!v) return;
      vista.xMin = v.xMin; vista.xMax = v.xMax; vista.yMin = v.yMin; vista.yMax = v.yMax;
      if (typeof v.tx === 'number') vista.tx = v.tx;
      if (typeof v.ty === 'number') vista.ty = v.ty;
      if (typeof v.escala === 'number') vista.escala = v.escala;
      if (typeof v.tamanoBase === 'number') vista.tamanoBase = v.tamanoBase;
      sincronizarVisibles();
    });
    contexto.escuchar('filtros:cambiar', aplicarFiltros);
    contexto.escuchar('progreso:actualizar', aplicarProgreso);
    contexto.escuchar('tarjeta:cerrada', () => limpiarSeleccion(true));
  }

  contexto.emitir('edificio:solicitar-vista'); sincronizarVisibles();
  contexto.emitir('iconos:datos-listos', { categorias: catData, ubicaciones, mapaCategorias });
  const idHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('punto');
  if (idHash && mapaUbicaciones.has(idHash)) seleccionarMarcador(idHash, contexto, true);
}
