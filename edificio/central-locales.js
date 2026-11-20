/**
 * ⚡ EDIFICIO PRINCIPAL — TABLERO ELÉCTRICO DE LOCALES (central-locales.js <= 150 líneas)
 * Aísla cada local con su propia luz (.js) y agua (.css) dentro de un cortacircuitos
 * individual (try / catch). Si un local se apaga o falla, el Edificio sigue al 100%.
 */
import { iniciarVisorMapa, enfocarCoordenada } from './visor-mapa.js';

export const ESTADO_LOCALES = {
  iconosMapa: true,        // Local 1: Encendido
  menuFiltros: true,       // Local 2: Encendido
  tarjetaInfo: false,      // Local 3 (Se enciende en Fase 6)
  progresoJugador: false,  // Local 4 (Se enciende en Fase 6)
  pinesPersonales: false,  // Local 5 (Se enciende en Fase 7)
  modoEditor: false        // Local 6 (Se enciende en Fase 7)
};

const CATALOGO_LOCALES = [
  {
    clave: 'iconosMapa',
    nombre: 'Local #1: Iconos del Mapa',
    css: './locales/01-iconos-mapa/iconos-mapa.css',
    js: '../locales/01-iconos-mapa/iconos-mapa.js',
    iniciar: 'iniciarIconosMapa'
  },
  {
    clave: 'menuFiltros',
    nombre: 'Local #2: Menú de Filtros y Buscador',
    css: './locales/02-menu-filtros/menu-filtros.css',
    js: '../locales/02-menu-filtros/menu-filtros.js',
    iniciar: 'iniciarMenuFiltros'
  },
  {
    clave: 'tarjetaInfo',
    nombre: 'Local #3: Tarjeta de Información',
    css: './locales/03-tarjeta-info/tarjeta-info.css',
    js: '../locales/03-tarjeta-info/tarjeta-info.js',
    iniciar: 'iniciarTarjetaInfo'
  },
  {
    clave: 'progresoJugador',
    nombre: 'Local #4: Progreso del Jugador',
    css: './locales/04-progreso-jugador/progreso-jugador.css',
    js: '../locales/04-progreso-jugador/progreso-jugador.js',
    iniciar: 'iniciarProgresoJugador'
  },
  {
    clave: 'pinesPersonales',
    nombre: 'Local #5: Mis Pines Personales',
    css: './locales/05-pines-personales/pines-personales.css',
    js: '../locales/05-pines-personales/pines-personales.js',
    iniciar: 'iniciarPinesPersonales'
  },
  {
    clave: 'modoEditor',
    nombre: 'Local #6: Modo Editor 1 Clic',
    css: './locales/06-modo-editor/modo-editor.css',
    js: '../locales/06-modo-editor/modo-editor.js',
    iniciar: 'iniciarModoEditor'
  }
];

function conectarAguaCSS(href, clave) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[data-local-css="${clave}"]`)) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.localCss = clave;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

async function encenderLocal(local, contextoEdificio) {
  if (!ESTADO_LOCALES[local.clave]) return;
  try {
    await conectarAguaCSS(local.css, local.clave);
    const modulo = await import(local.js);
    if (typeof modulo[local.iniciar] === 'function') {
      await modulo[local.iniciar](contextoEdificio);
    }
  } catch (error) {
    console.warn(`[Tablero Eléctrico] ${local.nombre} aislado por mantenimiento:`, error.message);
  }
}

async function arrancarCentroComercial() {
  try {
    iniciarVisorMapa();
  } catch (errorCritico) {
    console.error('[Edificio Principal] Error al iniciar visor:', errorCritico);
  }

  const contextoEdificio = {
    enfocarCoordenada,
    emitir: (evento, detalle = {}) => window.dispatchEvent(new CustomEvent(evento, { detail: detalle })),
    escuchar: (evento, cb) => window.addEventListener(evento, (e) => cb(e.detail))
  };

  for (const local of CATALOGO_LOCALES) {
    await encenderLocal(local, contextoEdificio);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arrancarCentroComercial);
} else {
  arrancarCentroComercial();
}
