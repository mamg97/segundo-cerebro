import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeuralGraph, createMotionLoop, mountNeural} from './research-neural.mjs';

test('conceptual graph is deterministic, bounded and connected within both hemispheres', () => {
  for (const size of [48, 96, 10000]) {
    const graph = createNeuralGraph(size);
    assert.deepEqual(graph, createNeuralGraph(size));
    assert.ok(graph.nodes.length <= 240);
    assert.ok(graph.edges.length < graph.nodes.length * 4);
    assert.equal(new Set(graph.nodes.map(n => n.track)).size, 4);
    for (const n of graph.nodes) for (const key of ['x', 'y', 'z']) {
      assert.ok(Number.isFinite(n[key]) && Math.abs(n[key]) < 1.1);
    }
    const reached = new Set([0]);
    for (let pass = 0; pass < graph.nodes.length; pass++) for (const {a, b} of graph.edges) {
      assert.ok(a !== b && a >= 0 && b < graph.nodes.length);
      if (reached.has(a) || reached.has(b)) { reached.add(a); reached.add(b); }
    }
    assert.equal(reached.size, graph.nodes.length);
  }
});

test('motion has one frame chain, freezes on pause and releases every callback on dispose', () => {
  let sequence = 0; const pending = new Map(), times = [];
  const loop = createMotionLoop({request: cb => {pending.set(++sequence, cb); return sequence;},
    cancel: id => pending.delete(id), draw: t => times.push(t)});
  const step = now => { const cb = pending.values().next().value; pending.clear(); cb(now); };
  loop.redraw(); assert.deepEqual(times, [0]); assert.equal(pending.size, 0);
  loop.setEnabled(true); loop.setEnabled(true); assert.equal(pending.size, 1);
  step(100); step(110); step(140); assert.equal(times.length, 3);
  const frozen = times.at(-1);
  loop.setEnabled(false); assert.equal(pending.size, 0);
  loop.redraw(); assert.equal(times.at(-1), frozen);
  loop.setEnabled(true); step(100000);
  assert.ok(times.at(-1) - frozen < .081, 'background time is not replayed');
  loop.dispose(); assert.equal(pending.size, 0);
  loop.setEnabled(true); loop.redraw(); assert.equal(pending.size, 0);
});

test('stage releases frames when hidden, offscreen, reduced, paused or unmounted', t => {
  class Events {
    listeners = new Map();
    addEventListener(name, cb) { this.listeners.set(name, cb); }
    removeEventListener(name) { this.listeners.delete(name); }
    fire(name, event) { this.listeners.get(name)?.(event); }
  }
  let sequence = 0; const frames = new Map(), observers = [];
  const media = Object.assign(new Events(), {matches: false});
  const doc = Object.assign(new Events(), {hidden: false});
  const saved = Object.fromEntries(['window', 'document', 'ResizeObserver', 'IntersectionObserver'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const [key, value] of Object.entries({document: doc, window: {
    matchMedia: () => media, devicePixelRatio: 3,
    requestAnimationFrame: cb => {frames.set(++sequence, cb); return sequence;},
    cancelAnimationFrame: id => frames.delete(id)
  }, ResizeObserver: class {
    constructor(cb) { this.cb = cb; observers.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  }, IntersectionObserver: class {
    constructor(cb) { this.cb = cb; observers.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  }})) Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
  t.after(() => { for (const [key, descriptor] of Object.entries(saved)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }});
  const gradient = {addColorStop() {}};
  const ctx = new Proxy({}, {get: (_, key) => key === 'createRadialGradient' ? () => gradient : () => {}});
  const canvas = {getContext: () => ctx, getBoundingClientRect: () => ({width: 320, height: 370, left: 0, top: 0})};
  const button = Object.assign(new Events(), {setAttribute() {}});
  const stage = Object.assign(new Events(), {dataset: {}, querySelector: selector => selector === 'canvas' ? canvas : button});
  let userPaused = false;
  const dispose = mountNeural(stage, {onPause: value => { userPaused = value; }});
  assert.equal(stage.dataset.motion, 'running'); assert.equal(frames.size, 1);
  assert.equal(canvas.width, 480, 'pixel ratio is capped');
  observers[1].cb([{isIntersecting: false}]); assert.equal(frames.size, 0);
  observers[1].cb([{isIntersecting: true}]); assert.equal(frames.size, 1);
  doc.hidden = true; doc.fire('visibilitychange'); assert.equal(frames.size, 0);
  doc.hidden = false; doc.fire('visibilitychange'); assert.equal(frames.size, 1);
  media.matches = true; media.fire('change'); assert.equal(frames.size, 0);
  assert.equal(button.disabled, true); assert.equal(stage.dataset.motion, 'paused');
  media.matches = false; media.fire('change'); assert.equal(frames.size, 1);
  button.fire('click'); assert.equal(userPaused, true); assert.equal(frames.size, 0);
  button.fire('click'); assert.equal(userPaused, false); assert.equal(frames.size, 1);
  dispose(); assert.equal(frames.size, 0);
  assert.ok(observers.every(o => o.disconnected));
  assert.equal(doc.listeners.size + media.listeners.size + stage.listeners.size + button.listeners.size, 0);
});
