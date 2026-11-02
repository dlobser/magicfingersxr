# Psychedelic edition

Independent route at `/psychedelic/`; the original homepage is preserved.

## Adding footage

Place media in `assets/` and set its entry in `media.js`. Feature slots: `music`, `room`, `styles`, `presets`. Gesture slots: `pull`, `swirl`, `freeze`, `paint`, `spray`, `tornado`. `film` accepts a YouTube video ID.

Use `type: 'image'` for animated WebP/GIF, or `type: 'video'` for MP4/WebM. Video has pause controls and respects reduced motion. All media uses contain sizing to preserve source proportions. Empty entries retain the designed placeholders; failed images/videos restore them.

## Interactive physics

`physics.js` adapts the Unity project's CsGravity, CsSwirl, RangeMask, FarPullTo and collect damping from `Assets/MagicFingers/Shaders/Compute/Lib/Forces.hlsl`, with default values from `ToolRouter.cs`. This is a 2D browser adaptation, not the full 3D game. Screen-normal swirl, crowd relief, speed limit and damping are tuned for this presentation. Hard reflecting walls keep every particle inside the canvas. Two independently moving attractors run while the visitor is idle.

Press and drag to cast; use two touch points for two forces. Keyboard users can move with arrows and hold Space. Pause stops the simulation. Reduced-motion users start paused.

## Verification and deployment

Run `npm run check`, `npm test`, and `npm run build`. The physics tests exercise attraction, swirl direction, collection, moving controllers, resize and long-running containment in portrait and landscape. The build includes this route in `dist/`; pushing main triggers the existing Cloudflare Pages deployment.
