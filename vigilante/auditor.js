/**
 * 👮 VIGILANTE DE CALIDAD (auditor.js)
 * Verifica el margen de referencia (250 líneas, tope flexible 350 según conceptos.md),
 * valida sintaxis (.js, .json, .css, .html, .svg) y sirve el puerto 5000 con --serve.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const LIMITE_REF = 250;
const LIMITE_MAX = 350;
const IGNORAR = new Set(['.git', 'node_modules', '.vercel']);
const EXT_AUDITABLES = new Set(['.html', '.css', '.js', '.json', '.svg', '.md', '']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon'
};

function escanear(dir, lista = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(item.name)) continue;
    const ruta = path.join(dir, item.name);
    if (item.isDirectory()) escanear(ruta, lista);
    else lista.push(ruta);
  }
  return lista;
}

function validarSintaxis(ruta, ext, contenido) {
  if (ext === '.json') JSON.parse(contenido);
  else if (ext === '.js') execFileSync(process.execPath, ['--check', ruta], { stdio: 'pipe' });
  else if (ext === '.css') {
    const ab = (contenido.match(/\{/g) || []).length;
    const ce = (contenido.match(/\}/g) || []).length;
    if (ab !== ce) throw new Error(`Llaves CSS desbalanceadas (${ab} vs ${ce})`);
  } else if (ext === '.html' && !contenido.toLowerCase().includes('</html>')) {
    throw new Error('Etiqueta </html> faltante');
  } else if (ext === '.svg' && !contenido.toLowerCase().includes('</svg>')) {
    throw new Error('Etiqueta </svg> faltante');
  }
}

function auditar() {
  console.log(`\n🛡️  INICIANDO AUDITORÍA DEL VIGILANTE (Referencia <= ${LIMITE_REF}, Tope flexible <= ${LIMITE_MAX} líneas)\n`);
  const archivos = escanear(RAIZ);
  let errores = 0;

  for (const ruta of archivos) {
    const rel = path.relative(RAIZ, ruta).replace(/\\/g, '/');
    const ext = path.extname(ruta).toLowerCase();
    if (!EXT_AUDITABLES.has(ext) && path.basename(ruta) !== '.gitignore') continue;

    const contenido = fs.readFileSync(ruta, 'utf8');
    const lineas = contenido.split(/\r?\n/).length;
    let estado = '✅ OK';

    if (lineas > LIMITE_MAX) {
      estado = `❌ EXCEDE MÁX (${lineas}/${LIMITE_MAX})`;
      errores++;
    } else if (lineas > LIMITE_REF) {
      estado = `⚠️ MARGEN (${lineas}/${LIMITE_MAX})`;
    }
    try {
      validarSintaxis(ruta, ext, contenido);
    } catch (err) {
      estado = `❌ ERROR SINTAXIS: ${err.message}`;
      errores++;
    }
    console.log(`  ${estado.padEnd(28)} | ${String(lineas).padStart(3)} / ${LIMITE_REF} líneas | ${rel}`);
  }

  console.log('\n----------------------------------------------------------------------');
  if (errores > 0) {
    console.error(`🚨 AUDITORÍA FALLIDA: Se encontraron ${errores} problema(s).`);
    process.exit(1);
  }
  console.log(`🏆 AUDITORÍA APROBADA AL 100%: ${archivos.length} archivos verificados con 0 errores.\n`);
}

function iniciarServidor() {
  const handler = (req, res) => {
    const urlLimpia = decodeURIComponent(req.url.split('?')[0]);
    if (urlLimpia === '/admin/') {
      res.writeHead(302, { Location: '/admin' });
      return res.end();
    }
    const rel = (urlLimpia === '/' || urlLimpia === '/admin') ? 'index.html' : urlLimpia.replace(/^\/+/, '');
    const destino = path.resolve(RAIZ, rel);
    if (!destino.startsWith(RAIZ) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 - Recurso no encontrado');
    }
    const ext = path.extname(destino).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(destino).pipe(res);
  };
  http.createServer(handler).listen(5000, () => {
    console.log('⚡ Servidor Centro Comercial activo en: http://localhost:5000');
  });
}

auditar();
if (process.argv.includes('--serve')) iniciarServidor();
