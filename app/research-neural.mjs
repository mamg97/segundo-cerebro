// Conceptual geometry only: no scientific values, telemetry or network access.
const COLORS = ['#ff8a28', '#62baf5', '#80d7bc', '#bca6ff'];
const TAU = Math.PI * 2;

export function createNeuralGraph(perHemisphere = 96) {
  const count = Math.max(16, Math.min(120, Math.floor(perHemisphere) || 96));
  const nodes = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < count; i++) {
      const y = 1 - 2 * (i + .5) / count;
      const r = Math.sqrt(1 - y * y), angle = i * Math.PI * (3 - Math.sqrt(5));
      const fold = 1 + .065 * Math.sin(angle * 3 + y * 8);
      const x = side * (.53 + .46 * r * Math.cos(angle) * fold);
      nodes.push({x: x * (1 - .13 * Math.max(0, y)), y: y * .86, z: r * Math.sin(angle) * .57 * fold,
        track: (y > 0 ? 2 : 0) + (side > 0 ? 1 : 0), side});
    }
  }
  const edges = [], seen = new Set();
  const add = (a, b) => {
    const key = [Math.min(a, b), Math.max(a, b)].join(':');
    if (!seen.has(key)) { seen.add(key); edges.push({a, b}); }
  };
  nodes.forEach((n, a) => {
    nodes.map((m, b) => ({b, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 + (m.z - n.z) ** 2}))
      .filter(v => v.b !== a && nodes[v.b].side === n.side).sort((a, b) => a.d - b.d)
      .slice(0, 3).forEach(v => add(a, v.b));
  });
  // Sparse bridges join the two lobes; these are not anatomical measurements.
  for (let i = 3; i < count; i += 13) add(i, count + i);
  return {nodes, edges};
}

// One cancellable frame chain. Pausing freezes visual time, rather than jumping
// forward after backgrounding. A static frame remains available without RAF.
export function createMotionLoop({request, cancel, draw, fps = 30}) {
  let frame = null, enabled = false, disposed = false, previous = null, elapsed = 0;
  const interval = 1000 / fps;
  function tick(now) {
    frame = null;
    if (!enabled || disposed) return;
    if (previous === null) previous = now - interval;
    const delta = now - previous;
    if (delta >= interval - .5) {
      elapsed += Math.min(delta, 80);
      previous = now;
      draw(elapsed / 1000);
    }
    if (enabled && !disposed) frame = request(tick);
  }
  return {
    setEnabled(value) {
      if (disposed || enabled === value) return;
      enabled = value;
      previous = null;
      if (enabled) frame = request(tick);
      else if (frame !== null) { cancel(frame); frame = null; }
    },
    redraw() { if (!disposed) draw(elapsed / 1000); },
    dispose() {
      disposed = true; enabled = false;
      if (frame !== null) cancel(frame);
      frame = null;
    }
  };
}

export function mountNeural(stage, {activeTrack = 'V2', paused = false, onPause = () => {}} = {}) {
  const canvas = stage.querySelector('canvas'), button = stage.querySelector('[data-motion-toggle]');
  const ctx = canvas.getContext('2d');
  if (!ctx) { stage.dataset.motion = 'unavailable'; button.hidden = true; return () => {}; }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = !document.hidden, intersecting = true, width = 1, height = 1, dpr = 1;
  let graph, compact, pointer = {x: 0, y: 0};
  const selected = Math.max(0, ['V1', 'V2', 'V3', 'V4'].indexOf(activeTrack));
  const loop = createMotionLoop({request: cb => window.requestAnimationFrame(cb), cancel: id => window.cancelAnimationFrame(id), draw});

  function draw(time) {
    if (!graph) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const cx = width / 2, cy = height * .47;
    const scale = Math.min(width * .29, height * .345);
    const yaw = -.13 + Math.sin(time * .19) * .17 + pointer.x * .14;
    const pitch = .1 + Math.cos(time * .16) * .045 + pointer.y * .07;
    const cos = Math.cos(yaw), sin = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const projected = graph.nodes.map(n => {
      const x = n.x * cos + n.z * sin, z = -n.x * sin + n.z * cos;
      const y = n.y * cp - z * sp, depth = n.y * sp + z * cp;
      const perspective = 3.8 / (3.8 - depth);
      return {x: cx + x * scale * perspective, y: cy + y * scale * perspective, depth};
    });
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.55);
    glow.addColorStop(0, '#15395d90'); glow.addColorStop(1, '#07132200');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    // Orbital guides establish depth without imposing fake scientific scales.
    ctx.strokeStyle = '#548ab333'; ctx.lineWidth = .8;
    for (const tilt of [-.28, .28]) {
      ctx.beginPath(); ctx.ellipse(cx, cy, scale * 1.48, scale * .37, tilt, 0, TAU); ctx.stroke();
    }
    for (let track = 0; track < 4; track++) {
      const right = track % 2, bottom = track > 1;
      const from = {x: right ? width - 56 : 56, y: bottom ? height - 160 : 70};
      const to = {x: cx + (right ? 1 : -1) * scale * .7, y: cy + (bottom ? 1 : -1) * scale * .48};
      ctx.strokeStyle = COLORS[track]; ctx.globalAlpha = track === selected ? .3 : .09;
      ctx.setLineDash([2, 7]); ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const {a, b} of graph.edges) {
      const p = projected[a], q = projected[b], n = graph.nodes[a];
      const focused = n.track === selected || graph.nodes[b].track === selected;
      ctx.globalAlpha = (focused ? .36 : .12) + (p.depth + .7) * .10;
      ctx.strokeStyle = focused ? COLORS[selected] : '#74b9e9';
      ctx.lineWidth = focused ? .85 : .65;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    const pulseCount = compact ? 12 : 24;
    for (let i = 0; i < pulseCount; i++) {
      const edge = graph.edges[(i * 23 + selected * 7) % graph.edges.length];
      const a = projected[edge.a], b = projected[edge.b];
      const t = (time * (.19 + (i % 4) * .035) + i * .173) % 1;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      ctx.globalAlpha = .15; ctx.fillStyle = COLORS[graph.nodes[edge.a].track];
      ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
      ctx.globalAlpha = .9; ctx.fillStyle = '#e5f4ff';
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
    }
    projected.forEach((p, i) => {
      const n = graph.nodes[i], focused = n.track === selected;
      ctx.globalAlpha = focused ? .95 : .35 + (p.depth + .7) * .23;
      ctx.fillStyle = focused ? COLORS[selected] : '#83c9fa';
      ctx.beginPath(); ctx.arc(p.x, p.y, (focused ? 1.7 : 1.1) + (p.depth + .7) * .5, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    const coreY = cy + scale * .2, breathe = 1 + Math.sin(time * 1.4) * .08;
    const core = ctx.createRadialGradient(cx, coreY, 0, cx, coreY, 29 * breathe);
    core.addColorStop(0, '#fff1d9'); core.addColorStop(.09, '#ffbb76');
    core.addColorStop(.25, '#ff8a2899'); core.addColorStop(1, '#ff8a2800');
    ctx.fillStyle = core; ctx.fillRect(cx - 32, coreY - 32, 64, 64);
  }
  function sync() {
    const running = !paused && !motion.matches && visible && intersecting;
    stage.dataset.motion = running ? 'running' : 'paused';
    button.disabled = motion.matches;
    button.textContent = motion.matches ? 'Movimiento reducido' : paused ? '▶ Reanudar movimiento' : 'Ⅱ Pausar movimiento';
    button.setAttribute('aria-pressed', String(paused || motion.matches));
    loop.setEnabled(running);
    loop.redraw();
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const nextCompact = width < 540;
    if (!graph || compact !== nextCompact) { compact = nextCompact; graph = createNeuralGraph(compact ? 48 : 96); }
    loop.redraw();
  }
  function move(event) {
    if (motion.matches || paused || event.pointerType === 'touch') return;
    const box = canvas.getBoundingClientRect();
    pointer = {x: (event.clientX - box.left) / width - .5, y: (event.clientY - box.top) / height - .5};
  }
  function leave() { pointer = {x: 0, y: 0}; }
  function toggle() { paused = !paused; onPause(paused); sync(); }
  function visibility() { visible = !document.hidden; sync(); }
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    intersecting = entries.some(e => e.isIntersecting); sync();
  }, {threshold: 0});
  resizeObserver.observe(canvas); intersectionObserver.observe(stage);
  stage.addEventListener('pointermove', move, {passive: true});
  stage.addEventListener('pointerleave', leave);
  button.addEventListener('click', toggle);
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', sync);
  resize(); sync();
  return () => {
    loop.dispose(); resizeObserver.disconnect(); intersectionObserver.disconnect();
    stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerleave', leave);
    button.removeEventListener('click', toggle); document.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', sync);
  };
}
