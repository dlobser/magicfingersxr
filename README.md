# Magic Fingers

A responsive, static landing page based on the supplied Magic Fingers presentation. No build step or framework dependencies.

## Preview

Run `python -m http.server 4173 --bind 127.0.0.1` in this folder, then visit http://127.0.0.1:4173.

## Add your YouTube video

Open `script.js` and set `YOUTUBE_VIDEO_ID` on line 3 to your video's 11-character ID. For `https://www.youtube.com/watch?v=abcdefghijk`, use `abcdefghijk`. The coming-soon treatment becomes a play button, which loads the privacy-enhanced YouTube player only when clicked.

## Publish

Upload `index.html`, `styles.css`, `script.js`, and the `assets` directory to any static web host. Do not upload the source PDF or temporary working files. Google Fonts supplies DM Sans and Instrument Serif; system font fallbacks are included.

All imagery is extracted from the supplied PDF. Concept images and future-facing features are labeled accordingly. Contact links use info@light.clinic from the presentation.
