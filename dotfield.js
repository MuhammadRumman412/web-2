// DotField - Pure JavaScript version for non-React websites
// Based on the React component from reactbits.dev/backgrounds/dot-field
console.log("DOTFIELD_JS_LOADED");

(function() {
  const TWO_PI = Math.PI * 2;

  function dotFieldInit(options = {}) {
    console.log('DotField: Initializing...', options);
    const opt = {
      dotRadius: 1.5,
      dotSpacing: 14,
      cursorRadius: 500,
      cursorForce: 0.1,
      bulgeOnly: true,
      bulgeStrength: 67,
      glowRadius: 160,
      sparkle: false,
      waveAmplitude: 0,
      gradientFrom: 'rgba(168, 85, 247, 0.35)',
      gradientTo: 'rgba(180, 151, 207, 0.25)',
      glowColor: '#120F17',
      ...options
    };

    const container = document.querySelector('.dot-field-container');
    if (!container) {
      console.error('DotField: Container .dot-field-container not found');
      return null;
    }

    const canvas = container.querySelector('canvas');
    if (!canvas) {
      console.error('DotField: Canvas not found in container');
      return null;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    const glowCircle = container.querySelector('circle.glow');

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let resizeTimer;
    let animationFrame;
    let isRunning = true;

    const state = {
      w: 0, h: 0,
      offsetX: 0, offsetY: 0,
      dots: [],
      mouse: { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 },
      glowOpacity: 0,
      engagement: 0,
      props: opt,
      crSq: 0
    };

    function resize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    }

    function doResize() {
      console.log('DotField: Resizing...');
      const rect = canvas.parentElement.getBoundingClientRect();
      let w = rect.width || window.innerWidth;
      let h = rect.height || window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      state.w = w;
      state.h = h;
      state.offsetX = rect.left + window.scrollX;
      state.offsetY = rect.top + window.scrollY;

      state.crSq = opt.cursorRadius * opt.cursorRadius;
      buildDots(w, h);
    }

    function buildDots(w, h) {
      const p = state.props;
      const step = p.dotRadius + p.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;
      const dots = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots.push({ ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay });
        }
      }
      state.dots = dots;
    }

    function onMouseMove(e) {
      state.mouse.x = e.pageX - state.offsetX;
      state.mouse.y = e.pageY - state.offsetY;
    }

    function updateMouseSpeed() {
      const m = state.mouse;
      const dx = m.prevX - m.x;
      const dy = m.prevY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      m.speed += (dist - m.speed) * 0.5;
      if (m.speed < 0.001) m.speed = 0;
      m.prevX = m.x;
      m.prevY = m.y;
    }

    const speedInterval = setInterval(updateMouseSpeed, 20);
    let frameCount = 0;

    function tick() {
      if (!isRunning) return;
      frameCount++;
      const dots = state.dots;
      const m = state.mouse;
      const w = state.w;
      const h = state.h;
      const p = state.props;
      const len = dots.length;
      const time_val = frameCount * 0.02;

      const targetEngagement = Math.min(m.speed / 5, 1);
      state.engagement += (targetEngagement - state.engagement) * 0.06;
      if (state.engagement < 0.001) state.engagement = 0;
      const eng = state.engagement;

      state.glowOpacity += (eng - state.glowOpacity) * 0.08;

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, p.gradientFrom);
      grad.addColorStop(1, p.gradientTo);
      ctx.fillStyle = grad;

      const cr = p.cursorRadius;
      const isBulge = p.bulgeOnly;

      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const d = dots[i];
        const dx = m.x - d.ax;
        const dy = m.y - d.ay;
        const distSq = dx * dx + dy * dy;

        if (distSq < state.crSq && eng > 0.01) {
          const dist = Math.sqrt(distSq);
          if (isBulge) {
            const b_t = 1 - dist / cr;
            const push = b_t * b_t * p.bulgeStrength * eng;
            const angle = Math.atan2(dy, dx);
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
          } else {
            const angle = Math.atan2(dy, dx);
            const move = (500 / dist) * (m.speed * p.cursorForce);
            d.vx += Math.cos(angle) * -move;
            d.vy += Math.sin(angle) * -move;
          }
        } else if (isBulge) {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }

        if (!isBulge) {
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x = d.ax + d.vx;
          d.y = d.ay + d.vy;
          d.sx += (d.x - d.sx) * 0.1;
          d.sy += (d.y - d.sy) * 0.1;
        }

        let drawX = d.sx;
        let drawY = d.sy;
        if (p.waveAmplitude > 0) {
          drawY += Math.sin(d.ax * 0.03 + time_val) * p.waveAmplitude;
          drawX += Math.cos(d.ay * 0.03 + time_val * 0.7) * p.waveAmplitude * 0.5;
        }

        const rad = p.dotRadius / 2;
        if (p.sparkle) {
          const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
          if ((hash % 100) < 3) {
            ctx.moveTo(drawX + rad * 1.8, drawY);
            ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
          } else {
            ctx.moveTo(drawX + rad, drawY);
            ctx.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      }
      ctx.fill();
      animationFrame = requestAnimationFrame(tick);
    }

    function start() {
      doResize();
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      animationFrame = requestAnimationFrame(tick);
      return () => {
        isRunning = false;
        cancelAnimationFrame(animationFrame);
        clearInterval(speedInterval);
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
      };
    }

    start();
  }

  window.dotFieldInit = dotFieldInit;
})();
