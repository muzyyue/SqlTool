/**
 * GitHub Pages 深链接回退
 *
 * Pages 是静态托管，没有服务端 rewrite：直接访问 /SqlTool/tools/xxx 会拿到
 * 404。构建时生成的 404.html 会把原始路径写入 sessionStorage（并附在 ?p=
 * 查询参数上作为兜底）后跳回根路径，这里负责把 URL 还原成用户原本访问的地址。
 *
 * 为什么独立成模块而不是写在 index.html 内联脚本里：
 *   Vite 构建时会把 <script type="module" src="…/main.js"> 提升到 <head>，
 *   而内联脚本仍留在 body，实际执行顺序与书写顺序相反。要让还原先于
 *   Vue Router 初始化，只能放进 main.js 并在 app.use(router) 之前调用。
 */

/** 站点基础路径，需与 vite.config.js 的 base 保持一致 */
const BASE = "/SqlTool/";

/** sessionStorage 中保存重定向信息的键名，需与 404.html 一致 */
const STORAGE_KEY = "spa-redirect";

/**
 * 还原被 404.html 改写的深链接
 *
 * @param {object} [env] - 便于测试注入，默认使用全局对象
 * @param {object} env.window
 * @param {Function} env.URLSearchParams
 * @returns {boolean} 是否发生了还原
 */
export function restoreDeepLink(env) {
  const win = env?.window ?? (typeof window !== "undefined" ? window : null);
  const Params = env?.URLSearchParams ?? URLSearchParams;

  if (!win) return false;

  let decoded = null;

  // 通道一：sessionStorage（404.html 写入，最可靠）
  try {
    const stored = win.sessionStorage?.getItem(STORAGE_KEY);
    if (stored) {
      // 用完即清，避免影响后续的正常导航
      win.sessionStorage.removeItem(STORAGE_KEY);
      decoded = new Params(stored.replace(/^\?/, "")).get("p");
    }
  } catch {
    // 隐私模式下 sessionStorage 可能抛异常，继续走查询参数
  }

  // 通道二：?p= 查询参数（sessionStorage 不可用时的兜底）
  if (!decoded) {
    decoded = new Params(win.location.search).get("p");
  }

  if (!decoded) return false;

  // 只接受本站路径，防止被构造的 ?p= 跳到外部站点（开放重定向）
  if (!decoded.startsWith(BASE)) return false;

  win.history.replaceState(null, "", decoded);
  return true;
}
