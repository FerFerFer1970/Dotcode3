const payloadEl = document.getElementById('payload');
const replaceEl = document.getElementById('replaceText');
const fillEmptyEl = document.getElementById('fillEmpty');

const useGs1El = document.getElementById('useGs1');
const repeatEl = document.getElementById('repeatReplaceText');

const scaleEl = document.getElementById('scale');
const finalSizeEl = document.getElementById('finalSize');
const fontSizeEl = document.getElementById('fontSize');

const outDirEl = document.getElementById('outDir');
const statusEl = document.getElementById('status');

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
      fillEmpty: fillEmptyEl.value,
      useGs1: useGs1El.checked,
      repeatReplaceText: repeatEl.checked,
      outDir,
      scale: scaleEl.value,
      finalSize: finalSizeEl.value,
      fontSize: fontSizeEl.value,
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