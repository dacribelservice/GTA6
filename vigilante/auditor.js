/**
 * 👮 VIGILANTE DE CALIDAD (auditor.js)
 * Verifica la Regla de Oro (<= 250 líneas por archivo), valida sintaxis (.js, .json, .css, .html, .svg)
 * y ofrece servidor local sin dependencias en el puerto 5000 con la bandera --serve.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const LIMITE_LINEAS = 250;
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
  console.log('\n🛡️  INICIANDO AUDITORÍA DEL VIGILANTE (Regla de Oro <= 250 líneas)\n');
  const archivos = escanear(RAIZ);
  let errores = 0;

  for (const ruta of archivos) {
    const rel = path.relative(RAIZ, ruta).replace(/\\/g, '/');
    const ext = path.extname(ruta).toLowerCase();
    if (!EXT_AUDITABLES.has(ext) && path.basename(ruta) !== '.gitignore') continue;

    const contenido = fs.readFileSync(ruta, 'utf8');
    const lineas = contenido.split(/\r?\n/).length;
    let estado = '✅ OK';

    if (lineas > LIMITE_LINEAS) {
      estado = `❌ EXCEDE LÍMITE (${lineas}/${LIMITE_LINEAS})`;
      errores++;
    }
    try {
      validarSintaxis(ruta, ext, contenido);
    } catch (err) {
      estado = `❌ ERROR SINTAXIS: ${err.message}`;
      errores++;
    }
    console.log(`  ${estado.padEnd(28)} | ${String(lineas).padStart(3)} / 250 líneas | ${rel}`);
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
    const rel = urlLimpia === '/' ? 'index.html' : urlLimpia.replace(/^\/+/, '');
    const destino = path.resolve(RAIZ, rel);
    if (!destino.startsWith(RAIZ) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 - Recurso no encontrado');
    }
    const ext = path.extname(destino).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(destino).pipe(res);
  };
  http.createServer(handler).listen(5000, () => {
    console.log('⚡ Servidor Centro Comercial activo en: http://localhost:5000');
  });
}

auditar();
if (process.argv.includes('--serve')) iniciarServidor();
