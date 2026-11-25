/**
 * 文字选区开花（算法移植自 LeiBox selection-flower）
 *
 * 拖选文章正文时，每个被选中的字符在它背后长出一株小花；松手后花茎收回。
 * 原组件自带一套英文演示文章并用 shadow DOM 渲染，这里只取它的生成算法，
 * 挂到页面真实的 .prose 上——选的还是你自己的文字。
 *
 * 关键实现（与原件一致）：
 * - 一株花 = 一个 plant 对象：起点(x,y)、控制点(cx,cy)、终点(ex,ey) 构成二次贝塞尔茎，
 *   外加花瓣数、半径、叶片数、颜色。所有参数由「种子 + 字符索引 + 字符位置」哈希出的
 *   伪随机数决定，同一个位置每次选中都长同一株花。
 * - 生长用 progress 0→1 驱动：茎先长（g/0.62），叶片依次展开，花瓣再一瓣瓣张开。
 * - 收缩就是 progress 反向走，不是消失——看起来是"缩回土里"。
 * - 最多 160 个取样点，超长选区不会一次性长出上千株花。
 */

const COLOURS = ['#f21b3f', '#ffb35b', '#f4d64c', '#9bc9ec', '#a47bdf', '#f1afd0', '#fff7db'];
const CENTRES = ['#f6d65d', '#f8b54c', '#f5b4c8'];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 线性同余风格的伪随机：同一个 seed 永远得到同一串数 */
function randomFor(value) {
  let x = value || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** 二次贝塞尔取点，t 从 0（起点/文字处）到 1（花冠） */
function point(p, t) {
  const inv = 1 - t;
  return {
    x: inv * inv * p.x + 2 * inv * t * p.cx + t * t * p.ex,
    y: inv * inv * p.y + 2 * inv * t * p.cy + t * t * p.ey,
  };
}

export function mountSelectionFlower(article) {
  if (!article) return null;
  const doc = article.ownerDocument;
  const win = doc.defaultView;

  const reducedQuery = win.matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => reducedQuery.matches;

  // 触屏没有"拖选"这个动作，长按是系统菜单，直接不启用
  if (win.matchMedia('(hover: none)').matches) return null;

  // 画布铺满整个 .prose，盖在文字下面（z-index 0，文字 z-index 1）
  const canvas = doc.createElement('canvas');
  canvas.className = 'flower-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  article.classList.add('has-flower-canvas');
  article.appendChild(canvas);

  const plants = new Map();
  let nodes = [];
  let seed = 1;
  let session = 0;
  let active = false;
  let frame = 0;
  let last = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let dead = false;
  let visible = true;

  // 正文里的所有文本节点。文章内容静态，初始化收集一次即可；
  // 若日后有动态插入的段落，重新 mount 或外部调用 collect() 更新。
  function collect() {
    nodes = [];
    const walker = doc.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) if (n.data.trim()) nodes.push(n);
  }
  collect();

  function resize() {
    // 【关键】必须用 offsetWidth/offsetHeight 而不是 getBoundingClientRect()。
    // canvas 是 .prose 的绝对定位子元素，一旦 canvas 尺寸写大，container 的
    // 滚动高度会跟着变大，下一帧再测量就更大 —— 死循环，实测能涨到百万像素。
    // offsetHeight 不受绝对定位子元素溢出影响，是安全的测量方式。
    const w = article.clientWidth;
    const h = article.offsetHeight;
    if (!w || !h) return;
    width = w;
    height = h;
    dpr = Math.min(2, win.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(win.performance.now());
  }

  function currentRange() {
    const sel = doc.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    // 只认完全落在正文里的选区，防止选中目录/导航时也开花
    if (!article.contains(range.startContainer) || !article.contains(range.endContainer)) return null;
    return range;
  }

  function draw(p, now) {
    const g = p.progress;
    const s = clamp01(g / 0.62);
    if (s <= 0) return;

    // 茎：28 段折线逼近贝塞尔曲线
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (let i = 1; i <= 28; i++) {
      const q = point(p, (s * i) / 28);
      ctx.lineTo(q.x, q.y);
    }
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#24482c';
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#67b868';
    ctx.stroke();

    // 叶片：两片，各自错开时间展开
    if (p.leaves[0]) drawLeaf(p, 0.42, p.side, clamp01((g - 0.22) / 0.34));
    if (p.leaves[1]) drawLeaf(p, 0.7, -p.side, clamp01((g - 0.34) / 0.34));

    // 花头
    const tip = point(p, s);
    const sway = active && !isReduced() ? Math.sin(now * 0.009 + p.rotation) * 0.9 * clamp01((g - 0.5) * 2) : 0;
    ctx.save();
    ctx.translate(tip.x + sway, tip.y);
    ctx.rotate(p.rotation);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#20241b';

    // 花蕾
    const bud = clamp01((g - 0.25) / 0.22) * Math.min(p.radius * 0.24, 2.4);
    if (bud > 0.05) {
      ctx.beginPath();
      ctx.ellipse(0, 0, bud, bud * 1.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.colour;
      ctx.fill();
      ctx.stroke();
    }

    // 花瓣：每瓣延迟 0.027 依次张开，形成"一瓣一瓣开"的节奏
    for (let k = 0; k < p.petals; k++) {
      const t = clamp01((g - 0.42 - k * 0.027) / 0.32);
      if (!t) continue;
      const a = t - 1;
      const open = 1 + 2.1 * a * a * a + 1.1 * a * a;
      ctx.save();
      ctx.rotate((2 * Math.PI * k) / p.petals);
      ctx.beginPath();
      ctx.ellipse(
        p.radius * 0.52 * open,
        0,
        Math.max(0.05, p.radius * 0.56 * open),
        Math.max(0.05, p.radius * p.petalWidth * open),
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = p.colour;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 花心
    const core = p.petals ? clamp01((g - 0.54) / 0.3) * p.radius * 0.25 : 0;
    if (core > 0.05) {
      ctx.beginPath();
      ctx.arc(0, 0, core, 0, Math.PI * 2);
      ctx.fillStyle = p.centre;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLeaf(p, at, side, progress) {
    if (progress <= 0) return;
    const q = point(p, at);
    const size = p.leaf * progress;
    const dx = side * size;
    const dy = p.direction * size * 0.48;
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.quadraticCurveTo(q.x + dx * 0.1, q.y + dy * 1.8, q.x + dx, q.y + dy);
    ctx.quadraticCurveTo(q.x + dx * 0.85, q.y - dy * 0.18, q.x, q.y);
    ctx.fillStyle = '#6fbe72';
    ctx.fill();
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = '#243725';
    ctx.stroke();
  }

  function paint(now = 0) {
    if (dead) return;
    ctx.clearRect(0, 0, width, height);
    for (const p of plants.values()) draw(p, now);
  }

  function schedule() {
    if (!frame && !dead && visible && !doc.hidden && plants.size && !isReduced()) {
      frame = win.requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    frame = 0;
    if (dead || !visible || doc.hidden) return;
    const dt = Math.min(last ? (now - last) / 1000 : 1 / 60, 0.04);
    last = now;
    for (const [key, p] of plants) {
      // 生长 3.3/s，收缩 2.7/s —— 长出比收回稍快，手感更自然
      p.progress = clamp01(p.progress + (p.target ? 3.3 : -2.7) * dt);
      if (!p.target && p.progress === 0) plants.delete(key);
    }
    paint(now);
    schedule();
  }

  function release() {
    active = false;
    for (const p of plants.values()) p.target = 0;
    if (isReduced()) {
      plants.clear();
      paint();
    } else schedule();
  }

  function begin() {
    if (active) return;
    active = true;
    seed = (Math.random() * 4294967295) >>> 0;
    session++;
    for (const p of plants.values()) p.target = 0;
  }

  /** 按当前选区同步花的分布 */
  function sync() {
    if (dead) return;
    const range = currentRange();
    if (!range) {
      for (const p of plants.values()) p.target = 0;
      schedule();
      return;
    }
    if (!active) return;

    // 用 offsetLeft/offsetTop 相对正文定位。getBoundingClientRect 会受滚动和
    // 外部布局影响，而这里要的是"在 .prose 坐标系里的位置"，offset 系更稳。
    const baseRect = article.getBoundingClientRect();

    // 收集被选中的非空白字符
    const selected = [];
    nodes.forEach((text, index) => {
      if (!range.intersectsNode(text)) return;
      const from = text === range.startContainer ? range.startOffset : 0;
      const to = text === range.endContainer ? range.endOffset : text.length;
      for (let i = from; i < to; i++) {
        if (!/\s/.test(text.data[i])) selected.push({ text, index, i });
      }
    });

    // 长选区降采样，最多 160 个点
    const stride = Math.max(1, Math.ceil(selected.length / 160));
    const wanted = new Set();
    selected.forEach(({ text, index, i }, order) => {
      if (order % stride !== 0) return;
      const key = `${session}:${index}:${i}`;
      const rng = randomFor(seed ^ Math.imul(index + 1, 73856093) ^ Math.imul(i + 1, 19349663));
      // 65% 的概率才长花，全字开花会糊成一片
      if (rng() > 0.65) return;
      wanted.add(key);
      const existing = plants.get(key);
      if (existing) {
        existing.target = 1;
        return;
      }

      // 字符的实际位置
      const charRange = doc.createRange();
      charRange.setStart(text, i);
      charRange.setEnd(text, i + 1);
      const r = charRange.getBoundingClientRect();
      if (!r.width) return;

      // 花长在行的上方或下方（direction），所以不会盖住正在读的字
      const direction = rng() < 0.38 ? 1 : -1;
      const x = r.left + r.width / 2 - baseRect.left;
      const y = r.top + r.height / 2 - baseRect.top;

      const length = 10 + rng() * 24; // 茎长：缩小版，避免伸到相邻行
      const bend = (rng() - 0.5) * 36;
      const family = Math.floor(rng() * 5);
      const petals = [5, 6, 8, 4, 0][family];
      const size = rng();
      const radius =
        family === 4
          ? 2 + rng() * 1.2
          : size < 0.35
            ? 3 + rng() * 2.6
            : size < 0.8
              ? 5.4 + rng() * 3.8
              : 9 + rng() * 2.6;
      const curve = (rng() - 0.5) * 14;

      plants.set(key, {
        x,
        y,
        cx: x + bend * 0.35 + curve,
        cy: y + direction * length * 0.48,
        ex: x + bend,
        ey: y + direction * length,
        direction,
        petals,
        radius,
        petalWidth: family === 2 ? 0.28 : 0.46,
        leaf: 4 + rng() * 4,
        leaves: [rng() < 0.65, rng() < 0.35],
        side: rng() < 0.5 ? -1 : 1,
        rotation: rng() * Math.PI * 2,
        colour: COLOURS[Math.floor(rng() * COLOURS.length)],
        centre: CENTRES[Math.floor(rng() * 3)],
        progress: isReduced() ? 1 : 0,
        target: 1,
      });
    });

    for (const [key, p] of plants) if (!wanted.has(key)) p.target = 0;
    if (isReduced()) {
      for (const [key, p] of plants) if (!p.target) plants.delete(key);
      else p.progress = 1;
    }
    paint(win.performance.now());
    schedule();
  }

  // ---- 事件 ----
  const onDown = (event) => {
    if (event.button !== 0) return;
    begin();
  };
  const onUp = () => {
    if (!active) return;
    sync();
    release();
  };
  const onSelectionChange = () => {
    if (active) sync();
  };

  article.addEventListener('pointerdown', onDown);
  win.addEventListener('pointerup', onUp);
  win.addEventListener('pointercancel', onUp);
  doc.addEventListener('selectionchange', onSelectionChange);

  // 只在正文可见时跑动画
  let resizeFrame = 0;
  const onResize = () => {
    if (resizeFrame) return;
    resizeFrame = win.requestAnimationFrame(() => {
      resizeFrame = 0;
      // 高度突变兜底：正常的 resize 只可能因为窗口变窄/字体变化，
      // 单次超过 1.5 倍基本就是测量失控，直接忽略并复位画布尺寸。
      const next = article.offsetHeight;
      if (height > 0 && next > height * 1.5) {
        canvas.style.height = height + 'px';
        return;
      }
      resize();
    });
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(article);

  let io = null;
  if ('IntersectionObserver' in win) {
    io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        last = 0;
        if (visible) schedule();
        else if (frame) {
          win.cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { threshold: 0 }
    );
    io.observe(article);
  }

  const onVisibility = () => {
    last = 0;
    if (doc.hidden && frame) {
      win.cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  };
  doc.addEventListener('visibilitychange', onVisibility);

  resize();

  return {
    destroy() {
      dead = true;
      if (frame) win.cancelAnimationFrame(frame);
      if (resizeFrame) win.cancelAnimationFrame(resizeFrame);
      article.removeEventListener('pointerdown', onDown);
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onUp);
      doc.removeEventListener('selectionchange', onSelectionChange);
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('resize', onResize);
      ro.disconnect();
      io?.disconnect();
      plants.clear();
      ctx.clearRect(0, 0, width, height);
      canvas.remove();
      article.classList.remove('has-flower-canvas');
    },
    collect,
    resize,
  };
}
