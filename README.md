# Magic Fingers

A responsive static website and a local PLY/OBJ render studio. The approved homepage source lives in `psychedelic/`; `viewer/` contains the Three.js studio. The original homepage remains available at `/original/`.

## Preview

Run `npm ci`, `npm run build`, then `python -m http.server 4173 --bind 127.0.0.1 --directory dist`. Visit http://127.0.0.1:4173. Serve the built directory so the viewer's bundled dependencies are available.

## Add your YouTube video

Configure the film and animated demonstrations in `psychedelic/media.js`. See `psychedelic/README.md` for details. The archived design has its separate YouTube setting in the root `script.js`.

## Publish

Cloudflare Pages deployment settings:

- Repository: `dlobser/magicfingersxr`
- Production branch: `main`
- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Custom domain: `magicfingersxr.com`

The build copies only public website files into `dist`. The source PDF and temporary working files are excluded from Git and deployment. Google Fonts supplies DM Sans and Instrument Serif; system font fallbacks are included.

Run `npm run check`, `npm run test:viewer`, and `npm test` for validation. Viewer behavior, file limits, rendering differences, and storage details are documented in `viewer/README.md`.
