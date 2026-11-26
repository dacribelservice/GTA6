/**
 * 🗜️ COMPRESOR NATIVO DE IMÁGENES EN CLIENTE (compresor-imagen.js <= 180 líneas)
 * Carga 100% bajo demanda (0 KB al abrir el mapa). Redimensiona a máx. 1200 px,
 * comprime adaptativamente a WebP (60-150 KB, pasos <= 180 KB, respaldo JPEG),
 * elimina metadatos EXIF al redibujar en <canvas> y genera vista previa 16:9.
 */

const TIPOS_VALIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_ENTRADA_BYTES = 15 * 1024 * 1024;
const MAX_ANCHO_PX = 1200;
const OBJETIVO_BYTES = 180 * 1024;
const LIMITE_BUCKET_BYTES = 480 * 1024;
const CALIDADES_WEBP = [0.8, 0.7, 0.6, 0.5];
const CALIDADES_JPEG = [0.82, 0.72, 0.62, 0.52];

let soporteWebPCache = null;

export function formatearPeso(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, Math.round(bytes || 0))} B`;
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${Math.round(kb)} KB`;
}

export function validarArchivoImagen(archivo) {
  if (!archivo || !(archivo instanceof Blob)) {
    return { valido: false, error: 'Selecciona una imagen válida para continuar.' };
  }
  const tipo = String(archivo.type || '').toLowerCase();
  if (!TIPOS_VALIDOS.has(tipo)) {
    return { valido: false, error: 'Solo se permiten imágenes JPG, PNG, WebP o AVIF.' };
  }
  if (archivo.size <= 0) {
    return { valido: false, error: 'El archivo seleccionado está vacío.' };
  }
  if (archivo.size > MAX_ENTRADA_BYTES) {
    return { valido: false, error: 'La imagen supera el límite máximo de 15 MB.' };
  }
  return { valido: true, error: '' };
}

function canvasABlob(canvas, mime, calidad) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob || null), mime, calidad);
    } catch {
      resolve(null);
    }
  });
}

async function detectarSoporteWebP() {
  if (soporteWebPCache !== null) return soporteWebPCache;
  const c = document.createElement('canvas');
  c.width = 2; c.height = 2;
  const blob = await canvasABlob(c, 'image/webp', 0.8);
  soporteWebPCache = Boolean(blob && blob.type === 'image/webp');
  return soporteWebPCache;
}

function decodificarConImg(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => {} });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };
    img.src = url;
  });
}

async function decodificarImagen(archivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(archivo);
      return { fuente: bmp, ancho: bmp.width, alto: bmp.height, cerrar: () => bmp.close() };
    } catch {
      return decodificarConImg(archivo);
    }
  }
  return decodificarConImg(archivo);
}

function calcularDimensiones(anchoOrig, altoOrig) {
  const w = Math.max(1, Number(anchoOrig) || 1);
  const h = Math.max(1, Number(altoOrig) || 1);
  if (w <= MAX_ANCHO_PX) return { ancho: w, alto: h };
  const factor = MAX_ANCHO_PX / w;
  return { ancho: MAX_ANCHO_PX, alto: Math.max(1, Math.round(h * factor)) };
}

function dibujarLimpioSinExif(fuente, ancho, alto, fondoOscuro) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d', { alpha: !fondoOscuro });
  if (!ctx) throw new Error('El navegador no pudo preparar el lienzo de compresión.');
  if (fondoOscuro) {
    ctx.fillStyle = '#0b101b';
    ctx.fillRect(0, 0, ancho, alto);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Al redibujar únicamente los píxeles en <canvas>, se eliminan todos los metadatos EXIF/GPS
  ctx.drawImage(fuente, 0, 0, ancho, alto);
  return canvas;
}

async function comprimirAdaptativo(canvas, mime, calidades) {
  let mejor = null;
  for (const q of calidades) {
    const blob = await canvasABlob(canvas, mime, q);
    if (!blob) continue;
    mejor = { blob, calidad: q };
    if (blob.size <= OBJETIVO_BYTES) return mejor;
  }
  return mejor;
}

export async function comprimirImagenParaMapa(archivo) {
  const revision = validarArchivoImagen(archivo);
  if (!revision.valido) throw new Error(revision.error);

  const img = await decodificarImagen(archivo);
  try {
    const { ancho, alto } = calcularDimensiones(img.ancho, img.alto);
    const usaWebP = await detectarSoporteWebP();
    const mime = usaWebP ? 'image/webp' : 'image/jpeg';
    const extension = usaWebP ? 'webp' : 'jpg';
    const calidades = usaWebP ? CALIDADES_WEBP : CALIDADES_JPEG;

    const canvas = dibujarLimpioSinExif(img.fuente, ancho, alto, !usaWebP);
    let resultado = await comprimirAdaptativo(canvas, mime, calidades);

    if (!resultado && usaWebP) {
      const respaldo = dibujarLimpioSinExif(img.fuente, ancho, alto, true);
      resultado = await comprimirAdaptativo(respaldo, 'image/jpeg', CALIDADES_JPEG);
    }
    if (!resultado || !resultado.blob) {
      throw new Error('No se pudo comprimir la imagen en este dispositivo.');
    }
    if (resultado.blob.size > LIMITE_BUCKET_BYTES) {
      throw new Error('La imagen sigue siendo muy pesada (> 480 KB). Intenta con otra captura.');
    }

    const mimeFinal = resultado.blob.type || mime;
    const extFinal = mimeFinal === 'image/webp' ? 'webp' : 'jpg';
    const previewUrl = URL.createObjectURL(resultado.blob);

    return {
      blob: resultado.blob,
      mime: mimeFinal,
      extension: extFinal,
      ancho,
      alto,
      calidad: resultado.calidad,
      pesoBytes: resultado.blob.size,
      pesoOriginalBytes: archivo.size,
      pesoTexto: formatearPeso(resultado.blob.size),
      pesoOriginalTexto: formatearPeso(archivo.size),
      previewUrl,
      liberarPreview: () => URL.revokeObjectURL(previewUrl)
    };
  } finally {
    img.cerrar();
  }
}
