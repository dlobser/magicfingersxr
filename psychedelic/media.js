// Drop footage in psychedelic/assets/, then set a src below.
// type: 'video' for MP4/WebM, 'image' for still/animated WebP, or 'youtube'.
// For YouTube, src is the 11-character video ID, not a URL.
// Videos loop muted and inline; visitors can pause. Reduced motion disables autoplay.
// Animated WebP is supported, but MP4/WebM offers a reliable pause control.
window.MAGIC_MEDIA = {
  spells: { type: 'video', src: '', label: 'MAGIC FINGERS / IN THE HANDS', alt: 'Magic Fingers particle interactions', poster: '' },
  room: { type: 'video', src: '', label: 'MAGIC FINGERS / REAL-WORLD MAGIC', alt: 'Particles interacting with real objects', poster: '' },
  music: { type: 'video', src: '', label: 'MAGIC FINGERS / AUDIO REACTIVITY', alt: 'A music-reactive light show', poster: '' },
  film: { type: 'youtube', src: '', label: 'MAGIC FINGERS / THE FILM', alt: 'Watch the Magic Fingers film', poster: '' }
};
