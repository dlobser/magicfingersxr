import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WebGLPathTracer, PhysicalCamera, GradientEquirectTexture } from 'three-gpu-pathtracer';
import { parseModel, demoModel, colorize, pointSpheres } from './model.js';
import { listFiles, saveFile, deleteFile } from './storage.js';

const $ = id => document.getElementById(id);
const number = id => Number($(id).value);
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const files = new Map();
let model, object, tracer, tracing = false, busy = false, renderer, currentName = 'MagicFingers-spiral';
const scene = new THREE.Scene();
const camera = new PhysicalCamera(45, 1.5, .005, 500);
camera.bokehSize = 0;
const stage = $('stage');
let controls;
const environment = new GradientEquirectTexture(256);
environment.topColor.set('#ffffff'); environment.bottomColor.set('#50677e'); environment.update();
scene.environment = environment;
const background = new GradientEquirectTexture(256);
const keyLight = new THREE.DirectionalLight('#fff2df', 2.6); keyLight.position.set(3,5,4); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight('#a3c8ee', 1); fillLight.position.set(-4,1,-2); scene.add(fillLight);
scene.add(new THREE.HemisphereLight('#fff6e3', '#26394e', 1));

function disposeObject() {
  if (!object) return;
  scene.remove(object);
  object.geometry.dispose();
  object.material.dispose();
  object = null;
}
function isDots() { return $('representation').value === 'points' || ($('representation').value === 'auto' && !model.mesh); }
function stopTracing() {
  if (!tracing) return;
  tracing = false;
  $('trace').textContent = '✦ Start path tracing';
  $('render-mode').textContent = 'LIVE PREVIEW';
  $('render-progress').textContent = 'PLY + OBJ';
  $('download').disabled = false;
  buildObject(false);
  resize();
}
function buildObject(forTrace = false) {
  const dots = isDots();
  let geometry, material;
  const source = model.geometry;
  if (dots && !forTrace) {
    geometry = source.clone();
    geometry.setIndex(null); // A point cloud uses positions once, not mesh triangle indices.
    material = new THREE.ShaderMaterial({
      uniforms: { radius: { value: number('radius') }, scale: { value: 400 }, brightness: { value: number('exposure') } },
      vertexShader: `attribute vec3 color; varying vec3 tint; uniform float radius; uniform float scale;
        void main(){ tint=color; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=clamp(radius*scale/max(.01,-p.z),1.5,100.); }`,
      fragmentShader: `varying vec3 tint; uniform float brightness; void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.)discard; float a=exp(-d*d*5.)*(1.-smoothstep(.75,1.,d)); gl_FragColor=vec4(tint*brightness,a); #include <tonemapping_fragment>\n #include <colorspace_fragment> }`.replace('; #include', ';\n#include'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
  } else {
    geometry = (model.mesh && $('representation').value === 'auto') ? source.clone() : pointSpheres(source, number('radius'));
    material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: number('roughness'), metalness: number('metalness'), side: THREE.DoubleSide, emissive: dots ? '#ffffff' : '#000000', emissiveIntensity: dots ? .25 : 0 });
  }
  disposeObject();
  object = dots && !forTrace ? new THREE.Points(geometry, material) : new THREE.Mesh(geometry, material);
  scene.add(object);
  $('radius').disabled = model.mesh && $('representation').value === 'auto';
  if (object.isPoints) object.material.uniforms.scale.value = renderer.domElement.height / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}
function fit(front = false) {
  const radius = model.geometry.boundingSphere.radius + number('radius');
  const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
  const distance = radius / Math.sin(halfFov) * 1.12;
  const direction = front ? new THREE.Vector3(0,0,1) : new THREE.Vector3(.35,.65,1).normalize();
  controls.target.set(0,0,0); camera.position.copy(direction.multiplyScalar(distance)); controls.update();
  $('focus').max = Math.max(20, distance * 2);
  $('focus').value = distance; updateCamera();
}
function resize() {
  if (!renderer) return;
  const aspect = number('aspect');
  stage.style.aspectRatio = aspect;
  const width = tracing ? number('resolution') : Math.max(1, Math.round(stage.clientWidth * Math.min(devicePixelRatio, 1.5)));
  const height = document.fullscreenElement ? Math.round(width * stage.clientHeight / stage.clientWidth) : Math.round(width / aspect);
  renderer.setSize(width, height, false);
  camera.aspect = width / height; camera.updateProjectionMatrix();
  if (object?.isPoints) object.material.uniforms.scale.value = height / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  if (tracing) tracer.updateCamera();
}
function outputs() {
  for (const id of ['radius','roughness','metalness','fov','aperture','focus','tilt','light','exposure']) $(id + '-out').textContent = $(id).value + ({fov:'°',aperture:' mm',tilt:'°'}[id] || '');
  if (!number('aperture')) $('aperture-out').textContent = 'Off';
}
function updateCamera() {
  camera.fov = number('fov'); camera.bokehSize = number('aperture'); camera.focusDistance = number('focus'); camera.updateProjectionMatrix();
  if (object?.isPoints) object.material.uniforms.scale.value = renderer.domElement.height / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  if (tracing) tracer.updateCamera();
  outputs();
}
function updateWorld() {
  const name = $('background').value;
  const solid = { black:'#000000', white:'#ffffff', midnight:'#080e18', paper:'#efe4cc' };
  if (solid[name]) scene.background = new THREE.Color(solid[name]);
  else {
    const colors = { aurora:['#70b0a2','#101b40'], sunset:['#e9bb89','#862f43'], custom:[$('sky').value,$('ground').value] }[name];
    background.topColor.set(colors[0]); background.bottomColor.set(colors[1]); background.update(); scene.background = background;
  }
  scene.backgroundRotation.z = THREE.MathUtils.degToRad(number('tilt'));
  scene.environmentIntensity = number('light'); keyLight.intensity = number('light') * 2; fillLight.intensity = number('light') * .7;
  renderer.toneMappingExposure = number('exposure');
  if (object?.isPoints) { object.material.uniforms.brightness.value = number('exposure'); object.material.blending = ['white','paper'].includes(name) ? THREE.NormalBlending : THREE.AdditiveBlending; }
  if (tracing) { tracer.updateEnvironment(); tracer.updateLights(); tracer.reset(); }
  outputs();
}
function loadModel(next, name) {
  stopTracing();
  const old = model;
  model = next; currentName = name;
  $('representation').value = 'auto';
  colorize(model, $('palette').value, $('custom').value);
  buildObject(); old?.geometry.dispose();
  fit(); updateWorld();
  const vertices = model.geometry.attributes.position.count;
  const triangles = model.mesh ? (model.geometry.index?.count ?? vertices) / 3 : 0;
  $('file-info').textContent = `${vertices.toLocaleString()} ${model.mesh ? 'vertices' : 'points'}${model.mesh ? ' · ' + triangles.toLocaleString() + ' triangles' : ''} · ${model.originalColors ? 'file colors available' : 'no embedded colors'}`;
  $('remove').disabled = $('collection').value === 'demo';
  status(`${name} · ready to explore.`);
}
function addOption(record) {
  const option = new Option(record.name, record.id);
  $('collection').append(option);
}
async function importFiles(incoming) {
  if (busy) return;
  busy = true; $('files').disabled = true;
  const problems = []; let last;
  for (const file of incoming) {
    try {
      if (!/\.(ply|obj)$/i.test(file.name)) throw new Error('Only PLY and OBJ files are supported.');
      if (file.size > 100 * 1024 * 1024) throw new Error('File exceeds 100 MB. Please export a smaller creation.');
      status(`Opening ${file.name}…`); await frame();
      const buffer = await file.arrayBuffer();
      const next = parseModel(buffer, file.name);
      const record = { id: crypto.randomUUID(), name: file.name, blob: file, added: Date.now() };
      try { await saveFile(record); }
      catch { problems.push(`${file.name} opened, but could not be saved in browser storage. Keep your original file.`); }
      files.set(record.id, record); addOption(record); $('collection').value = record.id;
      loadModel(next, file.name); last = record;
    } catch (error) { problems.push(`${file.name}: ${error.message}`); }
  }
  if (last) navigator.storage?.persist?.().catch(() => {});
  if (problems.length) status(problems.join(' '), true);
  busy = false; $('files').disabled = false; $('files').value = '';
}
async function startTrace() {
  if (busy) return;
  if (tracing) { stopTracing(); status('Returned to the live preview.'); return; }
  if (!renderer.extensions.has('EXT_color_buffer_float')) { status('This GPU does not support path tracing. Live preview and PNG export are still available.', true); return; }
  busy = true; $('trace').disabled = true;
  status('Preparing geometry and compiling the path tracer. This can take a moment…');
  await frame();
  try {
    controls.autoRotate = false; $('rotate').checked = false;
    buildObject(true);
    if (!tracer) { tracer = new WebGLPathTracer(renderer); tracer.bounces = 4; tracer.tiles.set(3,3); tracer.filterGlossyFactor = .5; tracer.minSamples = 1; tracer.fadeDuration = 0; }
    tracer.setScene(scene, camera);
    tracing = true; $('download').disabled = true; resize();
    $('trace').textContent = 'Return to live preview'; $('render-mode').textContent = 'PATH TRACING';
    status('Rendering progressively. Moving the camera restarts the samples. Save PNG whenever you like.');
  } catch (error) { tracing = false; $('download').disabled = false; buildObject(); resize(); status(`Path tracing could not start: ${error.message}`, true); }
  finally { busy = false; $('trace').disabled = false; }
}
async function download() {
  if (busy) return;
  const wasTracing = tracing;
  if (!wasTracing) {
    const w = number('resolution'); renderer.setSize(w, Math.round(w / camera.aspect), false);
    if (object.isPoints) object.material.uniforms.scale.value = renderer.domElement.height / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    renderer.render(scene, camera);
  }
  renderer.domElement.toBlob(blob => {
    if (!blob) { status('Could not save this render. Try a smaller resolution.', true); return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = currentName.replace(/\.(ply|obj)$/i, '') + (wasTracing ? '-traced' : '-preview') + '.png'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status(`Saved ${wasTracing ? 'path-traced render' : 'preview'} as PNG.`);
  }, 'image/png');
  if (!wasTracing) resize();
}

$('help').onclick = () => $('help-dialog').showModal();
$('close-help').onclick = () => $('help-dialog').close();
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('canvas'), antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .12; controls.minDistance = .05; controls.maxDistance = 100; controls.autoRotateSpeed = .45;
  controls.addEventListener('change', () => { if (tracing) tracer.updateCamera(); });
  resize(); loadModel(demoModel(), 'The spiral · demo'); outputs();
  new ResizeObserver(resize).observe(stage);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); tracing = false; status('The graphics context was lost. Reload the page to restore the viewer; your saved files remain in the collection.', true); });
  let failed = false;
  renderer.setAnimationLoop(() => {
    if (failed || document.hidden) return;
    controls.update();
    try {
      if (tracing) {
        if (tracer.samples < number('samples')) tracer.renderSample();
        $('download').disabled = tracer.samples < 1;
        $('render-progress').textContent = tracer.isCompiling ? 'COMPILING SHADERS…' : `${Math.floor(tracer.samples)} / ${$('samples').value} SAMPLES`;
      } else renderer.render(scene, camera);
    } catch (error) { failed = true; status(`Rendering stopped: ${error.message}. Reload to try again.`, true); }
  });
  $('files').onchange = e => importFiles([...e.target.files]);
  $('collection').onchange = async () => {
    if (busy) return;
    busy = true;
    try {
      const id = $('collection').value;
      if (id === 'demo') loadModel(demoModel(), 'The spiral · demo');
      else { const record = files.get(id); loadModel(parseModel(await record.blob.arrayBuffer(), record.name), record.name); }
    } catch (error) { status(error.message, true); }
    finally { busy = false; }
  };
  $('remove').onclick = async () => {
    const id = $('collection').value; if (id === 'demo' || busy) return;
    try { await deleteFile(id); files.delete(id); $('collection').selectedOptions[0].remove(); $('collection').value = 'demo'; loadModel(demoModel(), 'The spiral · demo'); status('Removed from this browser. Your original file is untouched.'); }
    catch { status('Could not remove the file from browser storage.', true); }
  };
  for (const event of ['dragenter','dragover']) stage.addEventListener(event, e => { e.preventDefault(); stage.classList.add('dragover'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('dragover'));
  stage.addEventListener('drop', e => { e.preventDefault(); stage.classList.remove('dragover'); importFiles([...e.dataTransfer.files]); });
  for (const id of ['representation','palette','custom','radius','roughness','metalness']) $(id).addEventListener('change', () => {
    stopTracing();
    try { colorize(model, $('palette').value, $('custom').value); buildObject(); updateWorld(); status('Appearance updated. Start path tracing for a finished render.'); }
    catch (error) { $('representation').value = 'auto'; buildObject(); status(error.message, true); }
    $('custom-wrap').hidden = $('palette').value !== 'Custom';
    if ($('palette').value === 'Original' && !model.originalColors) status('This file has no embedded colors. Showing white; choose a particle palette to color it.');
    outputs();
  });
  for (const id of ['radius','roughness','metalness']) $(id).addEventListener('input', outputs);
  for (const id of ['fov','aperture','focus']) $(id).addEventListener('input', updateCamera);
  for (const id of ['background','sky','ground','tilt','light','exposure']) $(id).addEventListener('input', updateWorld);
  for (const id of ['aspect','resolution']) $(id).addEventListener('change', resize);
  $('rotate').onchange = () => { stopTracing(); controls.autoRotate = $('rotate').checked; };
  $('fit').onclick = () => fit(); $('front').onclick = () => fit(true);
  $('focus-target').onclick = () => { $('focus').value = camera.position.distanceTo(controls.target); updateCamera(); };
  stage.addEventListener('dblclick', e => {
    const rect = renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.params.Points.threshold = .06;
    ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = ray.intersectObject(object)[0];
    if (hit) { const point = hit.point.clone().applyMatrix4(camera.matrixWorldInverse); $('focus').value = -point.z; updateCamera(); status('Lens focus set to the selected surface.'); }
  });
  stage.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','f','F'].includes(e.key)) e.preventDefault(); else return;
    if (/^f$/i.test(e.key)) { fit(); return; }
    const offset = camera.position.clone().sub(controls.target);
    if (['+','=','-'].includes(e.key)) offset.multiplyScalar(e.key === '-' ? 1.12 : .89);
    else if (e.shiftKey) {
      const v = new THREE.Vector3(e.key === 'ArrowLeft' ? -.1 : e.key === 'ArrowRight' ? .1 : 0, e.key === 'ArrowUp' ? .1 : e.key === 'ArrowDown' ? -.1 : 0, 0).applyQuaternion(camera.quaternion);
      controls.target.add(v);
    } else { const s = new THREE.Spherical().setFromVector3(offset); s.theta += e.key === 'ArrowLeft' ? -.1 : e.key === 'ArrowRight' ? .1 : 0; s.phi += e.key === 'ArrowUp' ? -.1 : e.key === 'ArrowDown' ? .1 : 0; s.makeSafe(); offset.setFromSpherical(s); }
    camera.position.copy(controls.target).add(offset); controls.update();
  });
  $('trace').onclick = startTrace; $('download').onclick = download;
  $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); } catch { status('Full screen is not available in this browser.', true); } };
  listFiles().then(records => records.sort((a,b) => a.added - b.added).forEach(record => { files.set(record.id, record); addOption(record); })).catch(() => { $('storage-note').textContent = 'Browser storage is unavailable. Files can be viewed this session but will not be remembered.'; });
} catch (error) {
  status(`The 3D viewer could not start: ${error.message}. Try a browser with WebGL 2 and hardware acceleration enabled.`, true);
  for (const el of document.querySelectorAll('aside input, aside select, aside button')) el.disabled = true;
}
