import { mkdir, copyFile, cp } from 'node:fs/promises';
import { build } from 'esbuild';

// Publish only website assets, never the source pitch deck or local working files.
await mkdir('dist', { recursive: true });
for (const file of ['robots.txt', 'sitemap.xml', '_headers']) {
  await copyFile(file, `dist/${file}`);
}
// Keep the original design available without making it the main homepage.
await mkdir('dist/original', { recursive: true });
for (const file of ['index.html', 'styles.css', 'script.js']) {
  await copyFile(file, `dist/original/${file}`);
}
await cp('assets', 'dist/original/assets', { recursive: true });
// The approved edition is now the homepage. Keep its existing URL working too.
await mkdir('dist/psychedelic', { recursive: true });
for (const file of ['index.html', 'styles.css', 'script.js', 'media.js', 'physics.js']) {
  await copyFile(`psychedelic/${file}`, `dist/${file}`);
  await copyFile(`psychedelic/${file}`, `dist/psychedelic/${file}`);
}
await cp('psychedelic/assets', 'dist/psychedelic/assets', { recursive: true });
await cp('psychedelic/assets', 'dist/assets', { recursive: true });
await mkdir('dist/viewer', { recursive: true });
for (const file of ['index.html', 'styles.css']) await copyFile(`viewer/${file}`, `dist/viewer/${file}`);
await build({ entryPoints: ['viewer/main.js'], bundle: true, format: 'esm', minify: true, outfile: 'dist/viewer/app.js', legalComments: 'linked' });
console.log('Static website prepared in dist/');
