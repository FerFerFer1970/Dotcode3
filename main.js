const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const bwipjs = require('bwip-js');

const DOT_RADIUS = 3; // En los SVG típicos de bwip-js, el dot suele tener radio ~3 unidades

function escapeXml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Fuerza width/height en el <svg ...> del string SVG.
 * Si ya existen width/height, los reemplaza.
 */
function forceSvgSize(svg, sizePx) {
  const size = Number(sizePx);
  if (!Number.isFinite(size) || size <= 0) return svg;

  // Asegura width/height en la etiqueta <svg ...>
  // 1) Quita width/height existentes
  let out = svg.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '');
  // 2) Inserta width/height tras "<svg"
  out = out.replace(/<svg\b/, `<svg width="${size}" height="${size}"`);
  return out;
}

/**
 * Reemplaza cada dot (círculo) del path por <text> en su centro.
 * - repeatReplaceText:
 *    true  => repite replaceText hasta llenar todos los dots
 *    false => usa fillEmpty cuando se acabe replaceText
 */
function buildReplacedSvg(baseSvg, replaceText, fillEmpty, fontSize = 5, repeatReplaceText = true) {
  const dMatch = baseSvg.match(/<path[^>]*\sd="([^"]+)"[^>]*\/>/);
  if (!dMatch) throw new Error('No se encontró <path d="..."/> en el SVG generado.');

  const d = dMatch[1];

  // Detecta cada dot por el patrón "M x y C" (cada dot empieza así en muchos SVG de bwip-js)
  const re = /M\s*([0-9.]+)\s*([0-9.]+)\s*C/g;
  const centers = [];
  let m;
  while ((m = re.exec(d)) !== null) {
    const xLeft = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    centers.push({ cx: xLeft + DOT_RADIUS, cy: y });
  }
  if (!centers.length) throw new Error('No se detectaron puntos (dots) en el path.');

  const mainChars = [...(replaceText ?? '')];
  const emptyChars = [...(fillEmpty ?? '')];

  if (!mainChars.length) {
    throw new Error('El texto para reemplazar puntos (replaceText) está vacío.');
  }

  const getChar = (idx) => {
    if (repeatReplaceText) {
      return mainChars[idx % mainChars.length];
    }
    // No repetir: usar fillEmpty cuando se agote el texto principal
    if (idx < mainChars.length) return mainChars[idx];
    if (!emptyChars.length) return ''; // si fillEmpty vacío => nada
    return emptyChars[(idx - mainChars.length) % emptyChars.length];
  };

  const texts = centers
    .map((p, idx) => `<text x="${p.cx}" y="${p.cy}">${escapeXml(getChar(idx))}</text>`)
    .join('');

  const textGroup =
    `<g font-family="monospace" font-size="${Number(fontSize) || 5}" ` +
    `text-anchor="middle" dominant-baseline="middle" fill="#000">` +
    texts +
    `</g>`;

  // Sustituye el path por el grupo de textos
  return baseSvg.replace(/<path[^>]*\/>/, textGroup);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 760,
    height: 560,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('choose-folder', async () => {
  const r = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled || !r.filePaths?.[0]) return null;
  return r.filePaths[0];
});

ipcMain.handle('generate', async (_evt, opts) => {
  const {
    payload,
    replaceText,
    useGs1,
    outDir,
    fontSize,
    scale,
    finalSize,
    fillEmpty,
    repeatReplaceText,
  } = opts || {};

  if (!payload?.trim()) throw new Error('El código a codificar está vacío.');
  if (!replaceText?.trim()) throw new Error('El texto para reemplazar puntos está vacío.');
  if (!outDir?.trim()) throw new Error('No se ha seleccionado carpeta de salida.');

  // Generar DotCode base
  const baseSvgRaw = bwipjs.toSVG({
    bcid: useGs1 ? 'gs1dotcode' : 'dotcode',
    text: payload.trim(),
    scale: Number(scale) || 4,
    padding: 10,
  });

  // Forzar tamaño final si te interesa (solo width/height, el viewBox se mantiene)
  const baseSvg = forceSvgSize(baseSvgRaw, finalSize);

  // Generar reemplazado (con letras)
  const replacedSvgRaw = buildReplacedSvg(
    baseSvg,
    replaceText.trim(),
    (fillEmpty ?? '').toString(),
    Number(fontSize) || 5,
    // por defecto: si no viene, repetir (true)
    repeatReplaceText !== false
  );

  const replacedSvg = forceSvgSize(replacedSvgRaw, finalSize);

  // Guardar archivos
  const basePath = path.join(outDir, 'dotcode.svg');
  const replacedPath = path.join(outDir, 'dotcode_reemplazado.svg');

  fs.writeFileSync(basePath, baseSvg, 'utf8');
  fs.writeFileSync(replacedPath, replacedSvg, 'utf8');

  return { ok: true, basePath, replacedPath };
});