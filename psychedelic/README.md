# Magic Fingers — Psychedelic edition

A separate, 1970s-inspired design. The original homepage, stylesheet, and script are preserved at the project root.

## Preview

From the project root, run `python -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/psychedelic/`.

## Add footage

Edit `psychedelic/media.js`. There are four large media placements:

| Slot | Recommended content | Desktop composition |
| --- | --- | --- |
| `spells` | Hands demonstrating different particle behaviors | 16:8.5, responsive portrait on phones |
| `room` | Particles colliding with real surfaces | Tall arch, about 4:5 |
| `music` | Audio-reactive light show | 16:8, responsive portrait on phones |
| `film` | Full YouTube trailer or gameplay film | 16:7, responsive square on phones |

Put files in `psychedelic/assets/`. Use `src: 'assets/your-clip.mp4'`, `type: 'video'` for MP4 or WebM. Videos loop muted, have native controls, and respect reduced motion. Keep the important action centered for cropping on mobile.

Use `type: 'image'` for still or animated WebP. Animated WebP works, but video is preferable for long clips, reliable playback controls, and reduced-motion support. For YouTube use `type: 'youtube'` and the 11-character video ID as `src`.

Empty sources retain the designed placeholders. The particle and resonance studies are original procedural canvas animations, clearly labeled as illustrative rather than gameplay. The garden visual is labeled concept art from the original presentation. Supplying `spells` footage replaces the browser study and hides its tabs. Invalid files fall back to the original placeholder.

## Design

The supplied blue ribbon wordmark is used unchanged, with CSS multiply blending to integrate its white background with the warm paper. Other references inform the custom geometric graphics; reference artwork is not reproduced. Typography uses Bricolage Grotesque, Instrument Serif, DM Sans, and DM Mono from Google Fonts, with system fallbacks.

This is a new route, not a replacement homepage. Deploy with the existing root `npm run build` and use `/psychedelic/`.
