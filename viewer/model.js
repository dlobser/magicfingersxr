import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function validateGeometry(geometry) {
  const p = geometry.getAttribute('position');
  if (!p || !p.count) throw new Error('This file has no positions to display.');
  if (p.count > 2000000) throw new Error('This file exceeds the 2 million vertex limit. Please export a smaller creation.');
  for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) throw new Error('The file contains invalid coordinates.');
  if (geometry.index) for (const i of geometry.index.array) if (i >= p.count || i < 0) throw new Error('The file contains an invalid face index.');
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  geometry.translate(-center.x, -center.y, -center.z);
  // Keep relative proportions and framing consistent across meter/cm/unitless files.
  geometry.scale(4 / (span || 1), 4 / (span || 1), 4 / (span || 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function parseModel(buffer, name) {
  let geometry, mesh = false;
  if (/\.ply$/i.test(name)) {
    const prefix = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 65536)));
    if (!/^ply\r?\n/.test(prefix) || !/end_header/.test(prefix)) throw new Error('Not a valid PLY header.');
    const counts = [...prefix.split('end_header')[0].matchAll(/element\s+\w+\s+(\d+)/g)].map(m => +m[1]);
    if (counts.some(n => n > 2000000)) throw new Error('PLY exceeds the 2 million element limit. Please use a smaller export.');
    mesh = /element face\s+([1-9]\d*)/.test(prefix.split('end_header')[0]);
    geometry = new PLYLoader().parse(buffer);
  } else if (/\.obj$/i.test(name)) {
    const root = new OBJLoader().parse(new TextDecoder().decode(buffer));
    const meshes = [], points = [];
    root.traverse(object => {
      if (!object.geometry) return;
      const g = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      for (const key of Object.keys(g.attributes)) if (!['position', 'color'].includes(key)) g.deleteAttribute(key);
      (object.isMesh ? meshes : points).push(g);
    });
    mesh = meshes.length > 0;
    const list = mesh ? meshes : points;
    // OBJLoader omits bare vertex lists without p/f/l statements. Those are point clouds too.
    if (!list.length) {
      const positions = [];
      for (const line of new TextDecoder().decode(buffer).split(/\r?\n/)) {
        const m = line.trim().match(/^v\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/);
        if (m) positions.push(+m[1], +m[2], +m[3]);
      }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    } else {
      if (!list.every(g => g.hasAttribute('color'))) list.forEach(g => g.deleteAttribute('color'));
      geometry = mergeGeometries(list);
      list.forEach(g => g.dispose());
    }
    root.traverse(o => { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); });
  } else throw new Error('Please choose a .ply or .obj file.');
  validateGeometry(geometry);
  if (mesh) geometry.computeVertexNormals();
  return { geometry, mesh, originalColors: geometry.getAttribute('color')?.clone() ?? null };
}

export function demoModel() {
  const positions = [];
  for (let i = 0; i < 2600; i++) {
    const t = i * 2.399963, u = i / 2600, r = .25 + Math.sqrt(u) * 1.65;
    const arm = t + r * 2.8;
    positions.push(Math.cos(arm) * r, Math.sin(t * 2.3) * .16 + .38 * Math.sin(r * 3), Math.sin(arm) * r);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  validateGeometry(geometry);
  return { geometry, mesh: false, originalColors: null };
}

export function colorize(model, palette, custom) {
  const { geometry, originalColors } = model;
  if (palette === 'Original' && originalColors) { geometry.setAttribute('color', originalColors.clone()); return; }
  const p = geometry.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color();
  const heat = ['#1933ff', '#e619e6', '#ff8c19', '#ffffe6'].map(s => new THREE.Color(s));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), spatial = (x * .7 + y * .45 + z * .3 + 2) / 4;
    const seed = ((Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453) % 1 + 1) % 1;
    switch (palette) {
      case 'Mono': case 'Original': c.set('#ffffff'); break;
      case 'Custom': c.set(custom); break;
      case 'Heat': { const h = THREE.MathUtils.clamp((y + 2) / 4, 0, .9999) * 3; c.copy(heat[Math.floor(h)]).lerp(heat[Math.floor(h) + 1], h % 1); break; }
      case 'Rainbow': c.setHSL(((spatial % 1) + 1) % 1, .85, .6); break;
      case 'Neon': c.setHSL((Math.atan2(z, x) / (2 * Math.PI) + .5 + y * .05) % 1, 1, .55); break;
      case 'Glow': c.setHSL(seed, .28, .8); break;
      default: c.setHSL((seed * 7.31 + .55) % 1, .75, .62);
    }
    c.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// A single merged geometry is supported by the tracer and avoids thousands of draw calls.
export function pointSpheres(geometry, radius) {
  const count = geometry.attributes.position.count;
  if (count > 80000) throw new Error('Lit spheres and path tracing support up to 80,000 points. Use soft dots for this file, or import a smaller cloud. No points have been removed.');
  const unit = new THREE.IcosahedronGeometry(1, 0);
  const up = unit.attributes.position, un = unit.attributes.normal;
  const positions = new Float32Array(count * up.count * 3), normals = new Float32Array(positions.length), colors = new Float32Array(positions.length);
  const p = geometry.attributes.position, c = geometry.attributes.color;
  for (let i = 0; i < count; i++) for (let j = 0; j < up.count; j++) {
    const k = (i * up.count + j) * 3;
    positions[k] = p.getX(i) + up.getX(j) * radius;
    positions[k+1] = p.getY(i) + up.getY(j) * radius;
    positions[k+2] = p.getZ(i) + up.getZ(j) * radius;
    // Smooth normals make these tiny proxies read as spheres rather than faceted crystals.
    normals[k] = up.getX(j); normals[k+1] = up.getY(j); normals[k+2] = up.getZ(j);
    colors[k] = c.getX(i); colors[k+1] = c.getY(i); colors[k+2] = c.getZ(i);
  }
  unit.dispose();
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return result;
}
