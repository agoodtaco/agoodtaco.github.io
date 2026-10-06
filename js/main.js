import { Viewer } from './viewer.js';
import { initUI } from './ui.js';
import { setState, state } from './state.js';

const viewer = new Viewer(document.getElementById('canvas-host'));
window.__viewer = viewer;

let lastMesh = null;
let backendPromise = null;

// Load the backend once, cache the result. Returns null if unavailable.
// Static hosting (like GitHub Pages without a build step) will fail here,
// which is fine — the frontend still works via the local Three.js loaders.
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
      const { mesh } = await backend.processModel(
        buffer,
        state.settings,
        (stage, pct, data) => {
          console.debug(`[pipeline] ${stage}: ${Math.round(pct * 100)}%`, data ?? '');
        },
      );
      lastMesh = mesh;
      viewer.loadMeshData(mesh);
      setState({ modelLoaded: true, stage: 'validate' });
      return;
    } catch (err) {
      console.error('[main] Pipeline failed, falling back to raw load:', err);
    }
  }

  // Path B: no backend — load the file directly with Three.js loaders.
  try {
    await viewer.loadFile(file);
    setState({ modelLoaded: true, stage: 'fit' });
    if (!backend) {
      console.info(
        '[main] Loaded with local Three.js loaders. Shelling, hole ' +
        'cutting, and STL export require the bundled build.',
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
      'STL export requires the geometry backend, which is not ' +
      'available in this deployment.\n\n' +
      'The frontend is running in preview mode.',
    );
    return;
  }
  if (!lastMesh) {
    alert('No processed mesh to export yet. Load a model first.');
    return;
  }
  try {
    await backend.exportModel(lastMesh);
  } catch (err) {
    console.error(err);
    alert(`Export failed: ${err.message}`);
  }
}

initUI({ viewer, onFile: handleFile, onExport: handleExport });