/**
 * 鼠标跟随的卡片光斑。
 *
 * 作用两类卡片：文章卡（.post-card，article 包着多个链接）和
 * 分类/系列卡（a.card，本身就是链接）。侧栏 widget 那种纯展示的 div.card
 * 不参与，免得满屏都是光斑。
 *
 * 实现要点：
 * - 光斑是 ::after 的一层径向渐变，位置由 --mx/--my 控制（百分比），
 *   由这里写入，CSS 只负责画。
 * - 指针坐标换算成卡片内的百分比，所以卡片缩放、滚动都不需要重算。
 * - 用事件委托挂一次，不随卡片数量增加监听器。
 * - 触屏设备不启用（没有 hover 语义，留着只是白白耗电）。
 */
(function () {
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let current = null;

  function set(el, event) {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mx', x.toFixed(2) + '%');
    el.style.setProperty('--my', y.toFixed(2) + '%');
  }

  document.addEventListener(
    'pointermove',
    function (event) {
      const el = event.target instanceof Element ? event.target.closest('.post-card, a.card') : null;
      if (el === current) {
        if (el) set(el, event);
        return;
      }
      // 把前一格的 --active 收掉，光斑淡出而不是瞬切
      if (current) current.removeAttribute('data-glow');
      current = el;
      if (el) {
        el.setAttribute('data-glow', '');
        set(el, event);
      }
    },
    { passive: true }
  );

  // 指针离开文档（切到别的窗口）时收掉光斑
  document.addEventListener('pointerleave', function () {
    if (current) current.removeAttribute('data-glow');
    current = null;
  });
})();
