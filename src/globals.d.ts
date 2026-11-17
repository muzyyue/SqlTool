/**
 * 全局构建时常量声明
 *
 * __APP_VERSION__ 由 vite.config.js 的 define 从 package.json 注入，
 * 这里声明其类型，避免在 .ts / .vue(ts) 中标红。
 */
declare const __APP_VERSION__: string;
