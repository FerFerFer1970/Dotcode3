const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const bwipjs = require('bwip-js');

const DOT_RADIUS = 3; // típico en bwip-js (dots como círculos)

function escapeXml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function buildReplacedSvg(baseSvg, replaceText, fontSize = 5) {
  const dMatch = baseSvg.match(/<path[^>]*\sd="([^"]+)"[^>]*\/>/);
  if (!dMatch) throw new Error('No se encontró <path d="..."/> en el SVG generado.');

  const d = dMatch[1];

  // Detecta cada dot por el patrón "M x y C"
  const re = /M\s*([0-9.]+)\s*([0-9.]+)\s*C/g;
  const centers = [];
  let m;
  while ((m = re.exec(d)) !== null) {
    const xLeft = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    centers.push({ cx: xLeft + DOT_RADIUS, cy: y });
  }

  if (!centers.length) throw new Error('No se detectaron puntos (dots) en el path.');

  const chars = [...replaceText];
  if (!chars.length) throw new Error('Texto de reemplazo vacío.');

  const texts = centers.map((p, idx) => {
    const ch = chars[idx % chars.length];
    return `<text x="${p.cx}" y="${p.cy}">${escapeXml(ch)}</text>`;
  }).join('');

  const textGroup =
    `<g font-family="monospace" font-size="${fontSize}" ` +
    `text-anchor="middle" dominant-baseline="middle" fill="#000">` +
    texts +
    `</g>`;

  return baseSvg.replace(/<path[^>]*\/>/, textGroup);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 720,
    height: 520,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('choose-folder', async () => {
  const r = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });
  if (r.canceled || !r.filePaths?.[0]) return null;
  return r.filePaths[0];
});

ipcMain.handle('generate', async (_evt, opts) => {
  const { payload, replaceText, useGs1, outDir, fontSize, scale, finalSize, fillEmpty } = opts;

  if (!payload?.trim()) throw new Error('El código a codificar está vacío.');
  if (!replaceText?.trim()) throw new Error('El texto para reemplazar está vacío.');
  if (!outDir?.trim()) throw new Error('No se ha seleccionado carpeta de salida.');

  const baseSvg = bwipjs.toSVG({
  bcid: useGs1 ? 'gs1dotcode' : 'dotcode',
  text: payload.trim(),
  scale: Number(scale) || 4,
  padding: 10
});

let sizedSvg = baseSvg.replace(
  /<svg/,
  `<svg width="${finalSize}" height="${finalSize}"`
);



  const replacedSvg = buildReplacedSvg(baseSvg, replaceText.trim(), Number(fontSize) || 5);

  const basePath = path.join(outDir, 'dotcode.svg');
  const replacedPath = path.join(outDir, 'dotcode_reemplazado.svg');

  fs.writeFileSync(basePath, baseSvg, 'utf8');
  fs.writeFileSync(replacedPath, replacedSvg, 'utf8');

  return {
    ok: true,
    basePath,
    replacedPath
  };
});