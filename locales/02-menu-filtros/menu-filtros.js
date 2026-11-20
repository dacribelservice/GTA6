/**
 * 🔍 LOCAL #2: MENÚ DE FILTROS Y BUSCADOR (menu-filtros.js <= 210 líneas)
 * Panel lateral desplegable estilo IGN. Inicializa con categorías emblemáticas
 * activas y permite encender/apagar en lote los 13 grupos y 2.532 puntos.
 */

const RUTAS = { sprite: 'recursos/iconos/lamina-iconos.svg', categorias: 'datos/categorias.json' };
const estado = { activas: new Set(), texto: '', region: 'todas', abierto: window.innerWidth > 768 };
const mapaCategorias = new Map(), mapaUbicaciones = new Map(), conteoCat = new Map();
let datosCat = null, ubicaciones = [], ctx = null, raiz = null, escuchaLista = false, yaMontado = false;

const esc = (txt) => String(txt ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

async function cargarDatosPropios() {
  const leer = async (url, tipo = 'json') => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return tipo === 'text' ? res.text() : res.json();
  };
  const pideSvg = !document.getElementById('sprite-iconos-ign');
  const [categorias, svg] = await Promise.all([
    leer(RUTAS.categorias), pideSvg ? leer(RUTAS.sprite, 'text') : Promise.resolve(null)
  ]);
  if (svg && !document.getElementById('sprite-iconos-ign')) {
    const div = document.createElement('div');
    div.id = 'sprite-iconos-ign'; div.hidden = true; div.innerHTML = svg;
    document.body.appendChild(div);
  }
  const archivos = categorias.archivosUbicaciones || ['datos/ubicaciones-vice-city.json', 'datos/ubicaciones-regiones.json'];
  const bloques = await Promise.all(archivos.map((a) => leer(a)));
  return { categorias, ubicaciones: bloques.flat() };
}

function coincideTextoYRegion(u, q, reg) {
  if (reg !== 'todas' && u.region !== reg) return false;
  if (!q) return true;
  const cat = mapaCategorias.get(u.categoria);
  return u.titulo.toLowerCase().includes(q)
    || (u.descripcion && u.descripcion.toLowerCase().includes(q))
    || u.region.toLowerCase().includes(q)
    || u.categoria.toLowerCase().includes(q)
    || (cat && cat.nombre.toLowerCase().includes(q));
}

function emitirFiltros() {
  ctx?.emitir('filtros:cambiar', {
    categoriasActivas: Array.from(estado.activas), texto: estado.texto, region: estado.region
  });
}

function alternarPanel(abrir) {
  estado.abierto = Boolean(abrir);
  raiz?.classList.toggle('mf-abierto', estado.abierto);
  document.getElementById('mf-btn-abrir')?.setAttribute('aria-expanded', String(estado.abierto));
}

function sincronizarUI() {
  raiz?.querySelectorAll('.mf-cat').forEach((btn) => {
    const on = estado.activas.has(btn.dataset.cat);
    btn.classList.toggle('activa', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  for (const g of datosCat?.grupos || []) {
    const btn = raiz?.querySelector(`[data-grupo-toggle="${g.id}"]`);
    if (btn) btn.textContent = g.categorias.every((c) => estado.activas.has(c.id)) ? 'Quitar' : 'Todo';
  }
  const q = estado.texto.trim().toLowerCase();
  let visibles = 0;
  for (const u of ubicaciones) {
    if (estado.activas.has(u.categoria) && coincideTextoYRegion(u, q, estado.region)) visibles++;
  }
  const elCont = document.getElementById('mf-contador'), elFab = document.getElementById('mf-fab-num');
  if (elCont) elCont.textContent = `${visibles} / ${ubicaciones.length}`;
  if (elFab) elFab.textContent = String(visibles);
}

function renderizarResultados() {
  const caja = document.getElementById('mf-resultados');
  if (!caja) return;
  const q = estado.texto.trim().toLowerCase();
  if (!q) { caja.hidden = true; caja.innerHTML = ''; return; }
  const lista = ubicaciones.filter((u) => coincideTextoYRegion(u, q, estado.region)).slice(0, 16);
  caja.hidden = false;
  caja.innerHTML = lista.length ? lista.map((u) => {
    const cat = mapaCategorias.get(u.categoria) || { icono: 'icono-pin-personal', color: '#00f0ff' };
    return `<button type="button" class="mf-res-item" data-id="${esc(u.id)}">
      <svg class="mf-cat-svg" style="--cat-color:${esc(cat.color)}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${esc(cat.icono)}"></use></svg>
      <span class="mf-res-tit">${esc(u.titulo)}</span><span class="mf-res-reg">${esc(u.region)}</span>
    </button>`;
  }).join('') : '<p class="mf-res-vacio">Sin coincidencias en Leonida</p>';
}

function irAUbicacion(id) {
  const u = mapaUbicaciones.get(id);
  if (!u) return;
  let cambio = false;
  if (!estado.activas.has(u.categoria)) { estado.activas.add(u.categoria); cambio = true; }
  if (estado.region !== 'todas' && estado.region !== u.region) {
    estado.region = 'todas';
    const sel = document.getElementById('mf-select-region');
    if (sel) sel.value = 'todas';
    cambio = true;
  }
  if (cambio) { sincronizarUI(); emitirFiltros(); renderizarResultados(); }
  ctx?.enfocarCoordenada?.(u.x, u.y, 4.5, true);
  ctx?.emitir('edificio:punto-solicitado', { id: u.id });
  if (window.innerWidth <= 768) alternarPanel(false);
}

function enlazarEventos() {
  const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);
  const input = document.getElementById('mf-input-busqueda');
  const btnLimpiar = document.getElementById('mf-btn-limpiar');
  const actualizar = () => { sincronizarUI(); emitirFiltros(); };
  const limpiar = () => {
    estado.texto = ''; input.value = ''; btnLimpiar.hidden = true;
    renderizarResultados(); actualizar();
  };

  on('mf-btn-abrir', 'click', () => alternarPanel(true));
  on('mf-btn-cerrar', 'click', () => alternarPanel(false));
  on('mf-fondo', 'click', () => alternarPanel(false));
  on('mf-btn-todo', 'click', () => { for (const id of mapaCategorias.keys()) estado.activas.add(id); actualizar(); });
  on('mf-btn-nada', 'click', () => { estado.activas.clear(); actualizar(); });
  on('mf-select-region', 'change', (e) => { estado.region = e.target.value; renderizarResultados(); actualizar(); });
  on('mf-input-busqueda', 'input', (e) => {
    estado.texto = e.target.value; btnLimpiar.hidden = !estado.texto;
    renderizarResultados(); actualizar();
  });
  on('mf-input-busqueda', 'keydown', (e) => {
    if (e.key === 'Enter') {
      const primero = document.querySelector('#mf-resultados .mf-res-item');
      if (primero) { e.preventDefault(); irAUbicacion(primero.dataset.id); }
    } else if (e.key === 'Escape' && estado.texto) { limpiar(); }
  });
  on('mf-btn-limpiar', 'click', () => { limpiar(); input?.focus(); });
  on('mf-resultados', 'click', (e) => {
    const item = e.target.closest('.mf-res-item');
    if (item) irAUbicacion(item.dataset.id);
  });
  on('mf-lista', 'click', (e) => {
    const btnGrupo = e.target.closest('.mf-btn-grupo');
    if (btnGrupo) {
      e.preventDefault(); e.stopPropagation();
      const grupo = datosCat?.grupos.find((g) => g.id === btnGrupo.dataset.grupoToggle);
      if (!grupo) return;
      const todas = grupo.categorias.every((c) => estado.activas.has(c.id));
      grupo.categorias.forEach((c) => (todas ? estado.activas.delete(c.id) : estado.activas.add(c.id)));
      return actualizar();
    }
    const btnCat = e.target.closest('.mf-cat');
    if (!btnCat) return;
    const id = btnCat.dataset.cat;
    if (estado.activas.has(id)) estado.activas.delete(id); else estado.activas.add(id);
    actualizar();
  });
}

function renderizarPanel() {
  const regiones = datosCat.regiones || [];
  const opcionesReg = [`<option value="todas">Todas las regiones (${regiones.length})</option>`,
    ...regiones.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`)].join('');
  const gruposHtml = (datosCat.grupos || []).map((g) => {
    const algunoOn = g.categorias.some((c) => estado.activas.has(c.id));
    return `<details class="mf-grupo" ${algunoOn ? 'open' : ''}>
      <summary class="mf-grupo-titulo"><span class="mf-punto-color" style="--cat-color:${esc(g.colorGrupo)}"></span><span class="mf-grupo-txt">${esc(g.nombre)}</span><button type="button" class="mf-btn-grupo" data-grupo-toggle="${esc(g.id)}">Alternar</button></summary>
      <div class="mf-cat-lista">${g.categorias.map((c) => `<button type="button" class="mf-cat ${estado.activas.has(c.id) ? 'activa' : ''}" data-cat="${esc(c.id)}" style="--cat-color:${esc(c.color)}" aria-pressed="${estado.activas.has(c.id)}"><svg class="mf-cat-svg" viewBox="0 0 24 24" aria-hidden="true"><use href="#${esc(c.icono)}"></use></svg><span class="mf-cat-nombre">${esc(c.nombre)}</span><span class="mf-cat-num">${conteoCat.get(c.id) || 0}</span></button>`).join('')}</div>
    </details>`;
  }).join('');

  raiz.innerHTML = `<div class="mf-fondo" id="mf-fondo"></div>
    <button type="button" class="mf-fab" id="mf-btn-abrir" aria-expanded="${estado.abierto}" aria-controls="mf-panel"><span>☰ Filtros</span><span class="mf-fab-num" id="mf-fab-num">0</span></button>
    <div class="mf-panel" id="mf-panel" role="region" aria-label="Filtros y buscador de ubicaciones">
      <div class="mf-cabecera"><span class="mf-marca">CANGEL GAMES</span><span class="mf-contador" id="mf-contador">0 / 0</span><button type="button" class="mf-cerrar" id="mf-btn-cerrar" title="Ocultar filtros">✕</button></div>
      <div class="mf-buscador"><div class="mf-input-wrap"><input type="search" class="mf-input" id="mf-input-busqueda" placeholder="Buscar lugar, categoría o zona..." autocomplete="off"><button type="button" class="mf-limpiar" id="mf-btn-limpiar" hidden aria-label="Limpiar búsqueda">✕</button></div><div class="mf-resultados" id="mf-resultados" hidden></div></div>
      <div class="mf-controles"><select class="mf-select" id="mf-select-region" aria-label="Filtrar por región">${opcionesReg}</select><div class="mf-acciones"><button type="button" class="mf-btn-accion" id="mf-btn-todo">Mostrar todo</button><button type="button" class="mf-btn-accion" id="mf-btn-nada">Ocultar todo</button></div></div>
      <div class="mf-lista" id="mf-lista">${gruposHtml}</div>
    </div>`;
  enlazarEventos(); alternarPanel(estado.abierto);
}

function procesarDatos(det) {
  if (yaMontado || !det?.categorias?.grupos || !Array.isArray(det?.ubicaciones)) return;
  yaMontado = true; datosCat = det.categorias; ubicaciones = det.ubicaciones;
  mapaCategorias.clear(); mapaUbicaciones.clear(); conteoCat.clear(); estado.activas.clear();
  for (const g of datosCat.grupos) {
    for (const c of g.categorias || []) {
      mapaCategorias.set(c.id, c);
      if (c.activaPorDefecto !== false) estado.activas.add(c.id);
    }
  }
  for (const u of ubicaciones) {
    mapaUbicaciones.set(u.id, u);
    conteoCat.set(u.categoria, (conteoCat.get(u.categoria) || 0) + 1);
  }
  renderizarPanel(); sincronizarUI(); emitirFiltros();
}

export async function iniciarMenuFiltros(contexto) {
  ctx = contexto; raiz = document.getElementById('local-menu-filtros');
  if (!raiz) return;
  if (!escuchaLista) { escuchaLista = true; ctx.escuchar('iconos:datos-listos', procesarDatos); }
  ctx.emitir('iconos:solicitar-datos');
  if (!yaMontado) procesarDatos(await cargarDatosPropios());
}
