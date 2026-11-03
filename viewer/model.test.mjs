import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseModel, colorize, pointSpheres } from './model.js';
const encode = s => new TextEncoder().encode(s).buffer;
const ascii = 'ply\nformat ascii 1.0\nelement vertex 4\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n-1 0 0 255 0 0\n1 0 0 0 255 0\n0 1 0 0 0 255\n0 0 1 255 255 0\n';
const cloud = parseModel(encode(ascii), 'colors.ply');
assert.equal(cloud.mesh, false); assert.equal(cloud.geometry.attributes.position.count, 4); assert.ok(cloud.originalColors);
for (const palette of ['Cosmic','Glow','Mono','Heat','Rainbow','Neon','Original','Custom']) {
  colorize(cloud, palette, '#ffffff');
  assert.ok([...cloud.geometry.attributes.color.array].every(Number.isFinite));
}
assert.equal(pointSpheres(cloud.geometry, .02).attributes.position.count, 240);
const binaryHeader = encode('ply\nformat binary_little_endian 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n');
const binary = new Uint8Array(binaryHeader.byteLength + 36 + 13); binary.set(new Uint8Array(binaryHeader));
const data = new DataView(binary.buffer); const off = binaryHeader.byteLength;
[0,0,0,1,0,0,0,1,0].forEach((v,i) => data.setFloat32(off+i*4,v,true));
data.setUint8(off+36,3); [0,1,2].forEach((v,i) => data.setInt32(off+37+i*4,v,true));
const mesh = parseModel(binary.buffer,'mesh.ply'); assert.equal(mesh.mesh,true); assert.equal(mesh.geometry.index.count,3);
const obj = 'v -1 -1 0\nv 1 -1 0\nv 0 1 0\nv 0 0 1\nf 1 2 3\nf 1 4 2\nf 2 4 3\nf 3 4 1\n';
assert.equal(parseModel(encode(obj),'shape.obj').mesh,true);
assert.equal(parseModel(encode('v 0 0 0\nv 1 2 3\n'),'points.obj').geometry.attributes.position.count,2);
assert.throws(() => parseModel(encode('not a ply'),'broken.ply'));
assert.throws(() => parseModel(encode('v NaN 0 0'),'bad.obj'));
await mkdir('tmp/viewer-tests',{recursive:true});
await writeFile('tmp/viewer-tests/colors.ply',ascii); await writeFile('tmp/viewer-tests/mesh.ply',binary); await writeFile('tmp/viewer-tests/shape.obj',obj);
console.log('Viewer tests passed: ASCII/binary PLY, OBJ mesh/points, colors, sphere proxies, malformed input.');
