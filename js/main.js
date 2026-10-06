import { Viewer } from './viewer.js';
import { initUI } from './ui.js';
import { setState, state } from './state.js';

const viewer = new Viewer(document.getElementById('canvas-host'));
window.__viewer = viewer;

let backendPromise = null;

// Try to load the backend once. If it fails (static hosting, missing
// dependencies), resolve to null and let the UI fall back to local
// Three.js loaders.
function loadBackend() {
  if (!backendPromise) {
    backendPromise = import('./pipeline.js')
      .then(mod => mod)
      .catch(err => {
        console.warn('[main] Geometry backend unavailable:', err.message);
        return null;
      });
  }
  return backendPromise;
}

async function handleFile(file) {
  setState({ stage: 'repair' });

  const backend = await loadBackend();

  // Path A: backend available — run the full pipeline.
  if (backend) {
    try {
      const buffer = await file.arrayBuffer();
      const { mesh } = await backend.processModel(buffer, state.settings, (stage, pct, data) => {
        console.debug(`[pipeline] ${stage}: ${Math.round(pct * 100)}%`, data ?? '');
      });
      viewer.loadMeshData(mesh);
      setState({ modelLoaded: true, stage: 'validate' });
      return;
    } catch (err) {
      console.error('[main] Pipeline failed, falling back to raw load:', err);
      // fall through to Path B
    }
  }

  // Path B: no backend — load the file directly with Three.js loaders.
  // This is what the original prototype did, and it works in any browser.
  try {
    await viewer.loadFile(file);
    setState({ modelLoaded: true, stage: 'fit' });
    if (!backend) {
      console.info(
        '[main] Loaded with local Three.js loaders. ' +
        'Shelling, hole cutting, and STL export require the Vite build.',
      );
    }
  } catch (err) {
    console.error(err);
    alert(`Could not load "${file.name}": ${err.message}`);
  }
}

async function handleExport() {
  const backend = await loadBackend();
  if (!backend) {
    alert(
      'STL export requires the geometry backend.\n\n' +
      'Run the project through Vite to enable it:\n' +
      '  npm install\n' +
      '  npm run dev',
    );
    return;
  }
  try {
    const mesh = viewer.getMeshData();
    if (!mesh) { alert('No processed mesh to export yet.'); return; }
    await backend.exportModel(mesh);
  } catch (err) {
    console.error(err);
    alert(`Export failed: ${err.message}`);
  }
}

initUI({ viewer, onFile: handleFile, onExport: handleExport });