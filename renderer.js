const payloadEl = document.getElementById('payload');
const replaceEl = document.getElementById('replaceText');
const useGs1El = document.getElementById('useGs1');
const outDirEl = document.getElementById('outDir');
const statusEl = document.getElementById('status');
const fontSizeEl = document.getElementById('fontSize');
const scaleEl = document.getElementById('scale');
const finalSizeEl = document.getElementById('finalSize');
const fillEmptyEl = document.getElementById('fillEmpty');

let outDir = null;

function setStatus(msg) {
  statusEl.textContent = msg;
}

document.getElementById('choose').addEventListener('click', async () => {
  const folder = await window.api.chooseFolder();
  if (!folder) return;
  outDir = folder;
  outDirEl.textContent = outDir;
  setStatus('');
});

document.getElementById('generate').addEventListener('click', async () => {
  try {
    setStatus('Generando...');
    const res = await window.api.generate({
      payload: payloadEl.value,
      replaceText: replaceEl.value,
      useGs1: useGs1El.checked,
      outDir,
      fontSize: fontSizeEl.value
    });

const res = await window.api.generate({
  payload: payloadEl.value,
  replaceText: replaceEl.value,
  useGs1: useGs1El.checked,
  outDir,
  fontSize: fontSizeEl.value,
  scale: scaleEl.value,
  finalSize: finalSizeEl.value,
  fillEmpty: fillEmptyEl.value
});

    setStatus(
      `✅ Listo\n` +
      `dotcode.svg -> ${res.basePath}\n` +
      `dotcode_reemplazado.svg -> ${res.replacedPath}`
    );
  } catch (e) {
    setStatus(`❌ Error: ${e.message || e}`);
  }
});