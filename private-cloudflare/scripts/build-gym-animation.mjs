// Offline authoring tool. Requires ImageMagick and the explicitly supplied RIFE binary/model.
// No downloads, credentials, private plan data or runtime dependencies.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, existsSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const [source, output, rife, model, orderArg = '0,1,2,3,4,5,6,7', anchorArg = '0.72'] = process.argv.slice(2);
if (!source || !output || !rife || !model) throw new Error('Usage: node build-gym-animation.mjs source.png output-stem rife model [frame-order] [anchor-y-fraction]');
const gif = resolve(output + '.gif');
const poster = resolve(output + '-poster.png');
const reviewDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../design/gym-animations');
if (existsSync(gif) || existsSync(poster)) throw new Error('Use a new version; outputs already exist.');
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const im = (...args) => run('magick', args.map(String));
const dir = mkdtempSync(join(tmpdir(), 'gym-animation-'));
const [sheetW, sheetH] = im('identify', '-format', '%w %h', source).split(' ').map(Number);
const order = orderArg.split(',').map(Number);
if (order.length !== 8 || order.some(n => !Number.isInteger(n) || n < 0 || n > 7)) throw new Error('Need eight valid phase indexes');
const anchorFraction = Number(anchorArg);
if (!(anchorFraction > 0 && anchorFraction < 1)) throw new Error('Invalid stationary-anchor fraction');
const geometry = path => {
  const raw = im(path, '-alpha', 'extract', '-threshold', '25%', '-format', '%@', 'info:');
  const m = raw.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!m || +m[1] === 0 || +m[2] === 0) throw new Error('Empty frame or anchor: ' + path);
  return { w: +m[1], h: +m[2], x: +m[3], y: +m[4] };
};
const phases = [];
for (let i = 0; i < 8; i++) {
  const col = i % 4, row = Math.floor(i / 4);
  const x = Math.round(col * sheetW / 4), y = Math.round(row * sheetH / 2);
  const w = Math.round((col + 1) * sheetW / 4) - x, h = Math.round((row + 1) * sheetH / 2) - y;
  const raw = join(dir, `raw-${i}.png`), anchor = join(dir, `anchor-${i}.png`);
  im(source, '-crop', `${w}x${h}+${x}+${y}`, '+repage', raw);
  const ay = Math.round(h * anchorFraction);
  im(raw, '-crop', `${w}x${h-ay}+0+${ay}`, '+repage', anchor);
  const box = geometry(raw), fixed = geometry(anchor);
  phases.push({ raw, w, h, box, cx: fixed.x + fixed.w/2, bottom: ay + fixed.y + fixed.h });
}
// One scale for the entire cycle. Only translation aligns stationary supports.
const left = Math.max(...phases.map(f => f.cx - f.box.x));
const right = Math.max(...phases.map(f => f.box.x + f.box.w - f.cx));
const height = Math.max(...phases.map(f => f.bottom - f.box.y));
const scale = Math.min(160/left, 160/right, 430/height);
const originals = [];
for (let k = 0; k < 8; k++) {
  const f = phases[order[k]], path = join(dir, `phase-${k}.png`);
  const dx = Math.round(180 - f.cx * scale), dy = Math.round(454 - f.bottom * scale);
  im('-size', '360x480', 'xc:none', '(', f.raw, '-resize', `${scale*100}%`, ')', '-geometry', `${dx>=0?'+':''}${dx}${dy>=0?'+':''}${dy}`, '-compose', 'Over', '-composite', path);
  originals.push(path);
  im(path, '-background', 'black', '-alpha', 'remove', '-alpha', 'off', join(dir, `rgb-${k}.png`));
  im(path, '-alpha', 'extract', '-alpha', 'off', '-type', 'TrueColor', join(dir, `mask-${k}.png`));
}
const frames=[];
for (let k = 0; k < 8; k++) {
  const next = (k+1)%8, rgb = join(dir,`mid-rgb-${k}.png`), mask=join(dir,`mid-mask-${k}.png`), mid=join(dir,`mid-${k}.png`);
  for (const [prefix,target] of [['rgb',rgb],['mask',mask]]) {
    run(rife,['-0',join(dir,`${prefix}-${k}.png`),'-1',join(dir,`${prefix}-${next}.png`),'-o',target,'-m',model,'--tier','hq','--timesteps','0.5']);
  }
  im(rgb,'(',mask,'-colorspace','Gray',')','-alpha','off','-compose','CopyOpacity','-composite',mid);
  frames.push(originals[k],mid);
}
mkdirSync(resolve(output, '..'), { recursive: true });
const palette=join(dir,'palette.png');
// Include the transparent color in the shared palette; flattening would erase alpha.
im(...frames,'+append','-alpha','on','-channel','A','-threshold','50%','+channel','+dither','-colors','255','-unique-colors',palette);
im('-delay','7','-dispose','Background',...frames,'-alpha','on','-channel','A','-threshold','50%','+channel','+dither','-remap',palette,'-loop','0',gif);
copyFileSync(originals[0],poster);
mkdirSync(reviewDir, { recursive: true });
im(...originals,'-background','white','-alpha','remove','-alpha','off','+append',join(reviewDir,basename(output)+'-contact.png'));
writeFileSync(join(reviewDir,basename(output)+'-build.json'),JSON.stringify({width:360,height:480,frames:16,delayCentiseconds:7,order,scale,stationaryAnchor:anchorFraction,authoring:'ImageGen + RifeMetal HQ',sourceDimensions:[sheetW,sheetH]},null,2)+'\n');
console.log(JSON.stringify({gif,poster,workingDirectory:dir,frames:16}));
