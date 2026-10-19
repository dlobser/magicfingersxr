// Paste the YouTube video's 11-character ID here (the value after ?v=).
// Leave empty to keep the designed “film coming soon” placeholder.
const YOUTUBE_VIDEO_ID = '';

document.querySelector('#year').textContent = new Date().getFullYear();
if (/^[A-Za-z0-9_-]{11}$/.test(YOUTUBE_VIDEO_ID)) {
  const slot = document.querySelector('#video-slot');
  const overlay = slot.querySelector('.video-placeholder');
  const button = document.createElement('button');
  button.className = 'video-placeholder video-play';
  button.setAttribute('aria-label', 'Play the Magic Fingers film');
  button.innerHTML = '<span class="play-outline" aria-hidden="true">▷</span><h3>See the magic in motion.</h3><p>Play the film</p>';
  overlay.replaceWith(button);
  slot.querySelector('.video-corner').textContent = 'MAGIC FINGERS / THE FILM';
  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`;
    frame.title = 'Magic Fingers film';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    slot.replaceChildren(frame);
    frame.focus();
  });
}

// A quiet layer of drifting particles. Honors reduced motion and pauses offscreen.
const canvas = document.querySelector('#dust');
const context = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let width, height, animation, visible = true;
const particles = Array.from({length: 55}, () => ({x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + .3, speed: Math.random() * .00007 + .000025, phase: Math.random() * Math.PI * 2}));
function resize() {
  width = canvas.clientWidth; height = canvas.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * ratio; canvas.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
let lastTime = 0;
function draw(time) {
  const delta = Math.min(time - (lastTime || time), 40); lastTime = time;
  context.clearRect(0, 0, width, height);
  for (const p of particles) {
    p.y -= p.speed * delta / 16.67; if (p.y < 0) p.y = 1;
    context.fillStyle = `rgba(190,224,232,${.15 + (Math.sin(time / 2200 + p.phase) + 1) * .16})`;
    context.beginPath(); context.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2); context.fill();
  }
  animation = requestAnimationFrame(draw);
}
function updateAnimation() {
  cancelAnimationFrame(animation); lastTime = 0;
  if (!reducedMotion.matches && visible && !document.hidden) animation = requestAnimationFrame(draw);
}
resize();
addEventListener('resize', resize);
document.addEventListener('visibilitychange', updateAnimation);
reducedMotion.addEventListener('change', updateAnimation);
new IntersectionObserver(entries => {visible = entries[0].isIntersecting; updateAnimation();}).observe(canvas);
