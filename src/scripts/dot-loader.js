/**
 * 点阵加载指示器（算法移植自 LeiBox ai-generating）
 *
 * 20×20 点阵，两个焦点按正弦轨迹各自飘移，落进 110px 半径的点按距离
 * 放大并变深——看起来像两个光源在点阵上扫过。
 *
 * 原组件是整页演示（自带 DOMContentLoaded 和 20×20 的固定舞台），
 * 这里只取它的运动算法，做成一个可复用的加载指示器：
 * 评论区懒加载的那几秒原本是纯空白，用它填上。
 *
 * 与原件一致的参数：grid 20×20、间距 18px、效果半径 110px、
 * 缩放 0.333→0.65、基准色 rgb(228,228,231) → 激活色 rgb(152,152,152)、
 * 强度用 pow(1 - d/R, 1.4) 衰减、两个焦点复合强度上限 1.0。
 */

const COLS = 20;
const ROWS = 20;
const GAP = 18;
const EFFECT_RADIUS = 110;
const MIN_SCALE = 0.333;
const MAX_SCALE = 0.65;
const BASE_RGB = [228, 228, 231];
const ACTIVE_RGB = [152, 152, 152];

// 两个焦点：半径、速度、相位、脉动速度
const ORBS = [
  { rx: 90, ry: 70, sx: 0.7, sy: 1.1, px: 0, py: 0, pulseSpeed: 0 },
  { rx: 70, ry: 95, sx: -1.2, sy: 0.8, px: 2, py: 1.5, pulseSpeed: 0.35 },
];

/**
 * 在 host 里创建一个点阵加载器。
 * @returns {{ el: HTMLElement, destroy: () => void }}
 */
export function createDotLoader(host) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;

  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wrap = doc.createElement('div');
  wrap.className = 'dot-loader';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-label', '评论区加载中');

  const grid = doc.createElement('div');
  grid.className = 'dot-loader__grid';
  wrap.appendChild(grid);

  const label = doc.createElement('p');
  label.className = 'dot-loader__label';
  label.textContent = '正在加载评论…';
  wrap.appendChild(label);

  host.appendChild(wrap);

  // 20×20 个点。坐标以点阵中心为原点，和原组件一致。
  const dots = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const el = doc.createElement('i');
    el.className = 'dot-loader__dot';
    grid.appendChild(el);
    dots.push({
      el,
      x: ((i % COLS) - COLS / 2) * GAP,
      y: (Math.floor(i / COLS) - ROWS / 2) * GAP,
    });
  }

  let frame = 0;
  let dead = false;

  function paint(timestamp) {
    const time = timestamp * 0.0012;

    const focuses = ORBS.map((orb) => ({
      x: Math.sin(time * orb.sx + orb.px) * orb.rx,
      y: Math.cos(time * orb.sy + orb.py) * orb.ry,
      weight: orb.pulseSpeed > 0 ? (Math.sin(time * orb.pulseSpeed) + 1) / 2 : 1,
    }));

    for (const dot of dots) {
      let combined = 0;
      for (const f of focuses) {
        const dx = f.x - dot.x;
        const dy = f.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < EFFECT_RADIUS) {
          const intensity = Math.pow(1 - distance / EFFECT_RADIUS, 1.4) * f.weight;
          combined += intensity;
        }
      }
      combined = Math.min(1, combined);

      if (combined > 0.01) {
        const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * combined;
        const r = Math.round(BASE_RGB[0] + (ACTIVE_RGB[0] - BASE_RGB[0]) * combined);
        const g = Math.round(BASE_RGB[1] + (ACTIVE_RGB[1] - BASE_RGB[1]) * combined);
        const b = Math.round(BASE_RGB[2] + (ACTIVE_RGB[2] - BASE_RGB[2]) * combined);
        dot.el.style.transform = `translateZ(0) scale(${scale.toFixed(3)})`;
        dot.el.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      } else {
        dot.el.style.transform = `translateZ(0) scale(${MIN_SCALE})`;
        dot.el.style.backgroundColor = '';
      }
    }
  }

  function tick(timestamp) {
    frame = 0;
    if (dead) return;
    paint(timestamp);
    frame = win.requestAnimationFrame(tick);
  }

  // 减少动效偏好下只画一帧静态图案，不转
  paint(0);
  if (!reduced) frame = win.requestAnimationFrame(tick);

  return {
    el: wrap,
    destroy() {
      dead = true;
      if (frame) win.cancelAnimationFrame(frame);
      wrap.remove();
    },
  };
}
