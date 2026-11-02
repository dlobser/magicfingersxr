import { mkdir, copyFile, cp } from 'node:fs/promises';

// Publish only website assets, never the source pitch deck or local working files.
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'script.js', 'robots.txt', 'sitemap.xml', '_headers']) {
  await copyFile(file, `dist/${file}`);
}
await cp('assets', 'dist/assets', { recursive: true });
// The psychedelic edition is a separate route; preserve the original homepage.
await mkdir('dist/psychedelic', { recursive: true });
for (const file of ['index.html', 'styles.css', 'script.js', 'media.js', 'physics.js']) {
  await copyFile(`psychedelic/${file}`, `dist/psychedelic/${file}`);
}
await cp('psychedelic/assets', 'dist/psychedelic/assets', { recursive: true });
console.log('Static website prepared in dist/');
