// 面板定位的回归测试：直接把 client.js 里的真实实现抽出来跑。
// 起因：面板位置只在点开那一刻算一次，窗口变窄后右半边被窗口边缘裁掉（2026-11-08）。
// 这里覆盖窗口变窄、坐标过期、面板比视口宽、窗口很矮、面板异步长高等情况。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'plugins', 'dsh-quick-compact', 'client.js'), 'utf8');

const start = src.indexOf('// 面板定位：');
const end = src.indexOf('function ringTint(percent)');
if (start < 0 || end < 0) {
  console.error('定位到不 panelPos 实现，client.js 结构变了，先更新这个测试');
  process.exit(1);
}
const block = src.slice(start, end);

function load(w, h) {
  const win = { innerWidth: w, innerHeight: h };
  const doc = { documentElement: { clientWidth: w, clientHeight: h } };
  const factory = new Function('window', 'document', 'PANEL_WIDTH', block + '\nreturn { panelPos, viewportBox };');
  return factory(win, doc, 264);
}

const MARGIN = 8;
const cases = [
  { name: '宽窗口正常锚定', w: 1400, h: 900, rect: { right: 1390, top: 800 }, pw: 264, ph: 400 },
  { name: '窄窗口正常锚定', w: 710, h: 640, rect: { right: 700, top: 560 }, pw: 264, ph: 400 },
  { name: '窗口缩窄后坐标没更新（本次 bug）', w: 710, h: 640, rect: { right: 700, top: 560 }, pw: 264, ph: 400, staleLeft: 900 },
  { name: '面板比视口还宽', w: 250, h: 640, rect: { right: 240, top: 560 }, pw: 234, ph: 300 },
  { name: '窗口很矮，面板顶到屏幕上沿', w: 1200, h: 500, rect: { right: 1190, top: 620 }, pw: 264, ph: 480 },
  { name: '面板异步长高（阈值返回后）', w: 710, h: 300, rect: { right: 700, top: 235 }, pw: 264, ph: 280 },
];

let failed = 0;
for (const c of cases) {
  const { panelPos } = load(c.w, c.h);
  const p = panelPos(c.rect, c.pw, c.ph);
  const left = parseFloat(p.left);
  const bottom = parseFloat(p.bottom);
  const right = left + c.pw;
  const top = c.h - bottom - c.ph;
  const ok = left >= MARGIN - 0.5 && right <= c.w - MARGIN + 0.5 && top >= MARGIN - 0.5 && bottom >= MARGIN - 0.5;
  if (c.staleLeft !== undefined) {
    // 旧实现把坐标留在外面；新实现必须算回视口内，这里顺带断言旧坐标确实越界
    const staleRight = c.staleLeft + c.pw;
    if (staleRight <= c.w - MARGIN) { console.error('FAIL | ' + c.name + '：stale 坐标没越界，用例写错了'); failed++; continue; }
  }
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + c.name + ' → left=' + p.left + ' bottom=' + p.bottom +
    (ok ? '' : '（面板 ' + left + '..' + right + ' / 视口宽 ' + c.w + '，上缘 ' + top + '）'));
  if (!ok) failed++;
}

if (failed) {
  console.error(failed + ' 个用例失败');
  process.exit(1);
}
console.log('面板定位：' + cases.length + ' 个用例全部落在视口内');
