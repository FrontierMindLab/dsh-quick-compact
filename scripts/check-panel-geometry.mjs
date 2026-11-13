// 面板定位的回归测试：直接把 client.js 里的真实实现抽出来跑。
// 起因：面板位置只在点开那一刻算一次，窗口变窄后右半边被窗口边缘裁掉（2026-11-08）。
// 这里覆盖窗口变窄、面板比视口宽、窗口很矮、面板异步长高，
// 以及 2026-11-13 补的：小环挪位置（输入框变高、侧栏开合）和界面缩放。
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
  // Chrome 实测（157，html 上设 CSS zoom）：innerWidth 和 documentElement.clientWidth 都是屏幕 px，
  // 不随缩放变；2026-11-13 第一版把这里桩成 w / scale，写反了，「缩小 80%」成了假通过。
  const win = { innerWidth: w, innerHeight: h };
  const doc = { documentElement: { clientWidth: w, clientHeight: h } };
  const factory = new Function('window', 'document', 'PANEL_WIDTH', block + '\nreturn { panelPos, viewportBox };');
  return factory(win, doc, 264);
}

const MARGIN = 8;
// rect / pw / ph 都是屏幕坐标；scale 是界面缩放比例；above=true 表示上方放得下，面板底边应贴在小环上方 8px
const cases = [
  { name: '宽窗口正常锚定', w: 1400, h: 900, rect: { right: 1390, top: 800 }, pw: 264, ph: 400, above: true },
  { name: '窄窗口正常锚定', w: 710, h: 640, rect: { right: 700, top: 560 }, pw: 264, ph: 400, above: true },
  { name: '窄视口里面板已被样式限宽', w: 250, h: 640, rect: { right: 240, top: 560 }, pw: 234, ph: 300 },
  { name: '面板比可视区还大（放大 150% 的小窗口）', w: 400, h: 300, rect: { right: 390, top: 280 }, pw: 396, ph: 420, scale: 1.5, oversize: true },
  { name: '窗口很矮，面板顶到屏幕上沿', w: 1200, h: 500, rect: { right: 1190, top: 620 }, pw: 264, ph: 480 },
  { name: '面板异步长高（阈值返回后）', w: 710, h: 300, rect: { right: 700, top: 235 }, pw: 264, ph: 280 },
  { name: '输入框变高，小环上移（2026-11-13 漂移）', w: 1400, h: 900, rect: { right: 1390, top: 640 }, pw: 264, ph: 400, above: true },
  { name: '侧栏展开，小环左移（2026-11-13 漂移）', w: 1400, h: 900, rect: { right: 1100, top: 800 }, pw: 264, ph: 400, above: true },
  { name: '界面放大 150%（2026-11-13 偏移）', w: 1400, h: 900, rect: { right: 1390, top: 800 }, pw: 396, ph: 600, scale: 1.5, above: true },
  { name: '界面缩小 80%', w: 1400, h: 900, rect: { right: 1390, top: 800 }, pw: 211, ph: 320, scale: 0.8, above: true },
  { name: '小环量不到时退回右下角', w: 1400, h: 900, rect: null, pw: 264, ph: 400 },
];

let failed = 0;
for (const c of cases) {
  const k = c.scale || 1;
  const { panelPos } = load(c.w, c.h);
  const p = panelPos(c.rect, c.pw, c.ph, k);
  // 样式里的尺寸上限换回屏幕 px：面板实际不会比它更大
  const pw = Math.min(c.pw, p.maxW * k);
  const ph = Math.min(c.ph, p.maxH * k);
  const right = p.left + pw;
  const bottom = p.top + ph;
  const problems = [];
  if (p.left < MARGIN - 0.5 || right > c.w - MARGIN + 0.5) problems.push('左右出屏 ' + p.left + '..' + right + ' / 宽 ' + c.w);
  if (p.top < MARGIN - 0.5 || bottom > c.h - MARGIN + 0.5) problems.push('上下出屏 ' + p.top + '..' + bottom + ' / 高 ' + c.h);
  if (c.oversize && (pw >= c.pw || ph >= c.ph)) problems.push('没有给出尺寸上限：maxW=' + p.maxW + ' maxH=' + p.maxH);
  if (c.above) {
    if (Math.abs(bottom - (c.rect.top - MARGIN)) > 0.5) problems.push('底边没贴在小环上方：' + bottom + ' ≠ ' + (c.rect.top - MARGIN));
    if (Math.abs(right - c.rect.right) > 0.5) problems.push('右边没对齐小环：' + right + ' ≠ ' + c.rect.right);
  }
  // 写进样式的值 × 缩放比例，必须回到屏幕上想要的位置（差不超过取整的 1px）
  if (Math.abs(p.x * k - p.left) > k || Math.abs(p.y * k - p.top) > k) problems.push('缩放换算不对：x=' + p.x + ' y=' + p.y);
  const ok = problems.length === 0;
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + c.name + ' → 屏幕 left=' + p.left + ' top=' + p.top + '，样式 x=' + p.x + ' y=' + p.y +
    (ok ? '' : '（' + problems.join('；') + '）'));
  if (!ok) failed++;
}

if (failed) {
  console.error(failed + ' 个用例失败');
  process.exit(1);
}
console.log('面板定位：' + cases.length + ' 个用例全部通过');
