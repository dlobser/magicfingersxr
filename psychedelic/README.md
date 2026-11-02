# Psychedelic edition

Independent route at `/psychedelic/`; the original homepage is preserved.

## Adding footage

Place media in `assets/` and set its entry in `media.js`. Feature slots: `music`, `room`, `styles`, `presets`. Gesture slots: `pull`, `swirl`, `freeze`, `paint`, `spray`, `tornado`. `film` accepts a YouTube video ID.

Use `type: 'image'` for animated WebP/GIF, or `type: 'video'` for MP4/WebM. Video has pause controls and respects reduced motion. All media uses contain sizing to preserve source proportions. Empty entries retain the designed placeholders; failed images/videos restore them.

## Interactive physics

`physics.js` provides four 2D browser adaptations: Ball uses pairwise softened gravity and contact repulsion inspired by `Bodies.compute`; Strands uses connected distance constraints from `Strands.compute`; Comets retains bounded position histories; Flocking uses alignment, cohesion, separation and cruise speed from `Boids.compute`. These are small browser simulations, not the full 3D game. Pull now has a smooth core and finite reach, and Swirl is predominantly tangential. Collection damping and global far attraction have been removed to avoid collapsing the show. Hard reflecting walls keep particles inside; two gently pulsing moving controllers run while idle.

Press and drag to cast; use two touch points for two forces. Keyboard users can move with arrows and hold Space. Pause stops the simulation. Reduced-motion users start paused.

## Verification and deployment

Run `npm run check`, `npm test`, and `npm run build`. The physics tests exercise attraction, swirl direction, collection, moving controllers, resize and long-running containment in portrait and landscape. The build includes this route in `dist/`; pushing main triggers the existing Cloudflare Pages deployment.
