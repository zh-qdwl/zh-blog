// 顶部导航的图标图形。
//
// 只存 <svg> 的内容，外层的 <svg> 由 Header 统一包裹（尺寸、描边、viewBox 都在那里定），
// 这样加图标时不用重复一遍那堆属性，也不会出现有的 16px 有的 20px。
//
// 为什么放在 .ts 而不是直接写进 Header.astro：
// vitest 只收 src/**/*.test.ts，.astro 里的东西测不到。放在这里，
// consts.test.ts 就能断言「每个 NAV_LINKS 项都有对应图形」——
// 漏配的话页面上只会静默多出一个 16px 的空框，肉眼很容易漏掉。
// 只有顶级项带图标，下拉里的子项是纯文字——小面板里再塞一列图标会更吵。
// 因此这里的条目应当与 NAV_LINKS 的顶级项一一对应，多了少了都由 consts.test.ts 拦下。
export const NAV_ICONS: Record<string, string> = {
  // 房子
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
  // 折角文稿
  post: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12.5h6M9 16h4"/>',
  // 人像
  about: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
};
