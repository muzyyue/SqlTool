import { createRouter, createWebHistory } from 'vue-router'

/**
 * 路由标题映射表
 * 用于显示友好的中文标题
 */
const TITLE_MAP = {
  home: '首页',
  'sql-tool': 'SQL工具',
  insert: 'INSERT生成',
  update: 'UPDATE生成',
  json: 'JSON工具',
  timestamp: '时间戳工具',
  excelfill: 'Excel填充工具',
}

/**
 * 路由层级关系映射表
 * 定义每个路由的父级路径
 */
const ROUTE_HIERARCHY = {
  '/sql-tool': ['/'],
  '/sql/insert': ['/', '/sql-tool'],
  '/sql/update': ['/', '/sql-tool'],
  '/tools/json': ['/'],
  '/tools/timestamp': ['/'],
  '/tools/excelfill': ['/'],
}

/**
 * 路由元信息映射表
 * 用于获取路由的标题等信息
 */
const ROUTE_META_MAP = {
  '/': { title: '首页' },
  '/sql-tool': { title: 'SQL工具' },
  '/sql/insert': { title: 'INSERT生成' },
  '/sql/update': { title: 'UPDATE生成' },
  '/tools/json': { title: 'JSON工具' },
  '/tools/timestamp': { title: '时间戳工具' },
  '/tools/excelfill': { title: 'Excel填充工具' },
}

/**
 * 根据路由路径生成面包屑配置
 * @param {string} routePath - 路由路径
 * @returns {Array} 面包屑配置数组
 */
function generateBreadcrumb(routePath) {
  const breadcrumb = []
  const parentPaths = ROUTE_HIERARCHY[routePath] || []

  // 添加父级路由（所有父级都需要 path）
  parentPaths.forEach((path) => {
    const meta = ROUTE_META_MAP[path]
    if (meta) {
      breadcrumb.push({
        name: meta.title,
        path,
      })
    }
  })

  // 添加当前路由（不需要 path）
  const currentMeta = ROUTE_META_MAP[routePath]
  if (currentMeta) {
    breadcrumb.push({
      name: currentMeta.title,
    })
  }

  return breadcrumb
}

/**
 * 获取父级路由信息
 * @param {string} routeName - 路由名称
 * @returns {Object|null} 父级路由信息 { name, path, title }
 */
export function getParentRoute(routeName) {
  // 根据路由名称查找路径
  const routePath = Object.entries(ROUTE_META_MAP).find(
    ([path, meta]) => meta.title === routeName || path.includes(routeName)
  )?.[0]

  if (!routePath) return null

  const parentPaths = ROUTE_HIERARCHY[routePath]
  if (!parentPaths || parentPaths.length === 0) return null

  // 获取直接父级
  const parentPath = parentPaths[parentPaths.length - 1]
  const parentMeta = ROUTE_META_MAP[parentPath]

  return parentMeta
    ? {
        name: parentMeta.title,
        path: parentPath,
        title: parentMeta.title,
      }
    : null
}

/**
 * 动态导入工具页面
 * 自动扫描 views/tools 目录
 */
const toolModules = import.meta.glob('../views/tools/**/*.vue')

/**
 * 生成工具路由
 */
const toolRoutes = Object.entries(toolModules)
  .map(([path, component]) => {
    // 匹配 tools/sql/*.vue 或 tools/*.vue
    const sqlMatch = path.match(/\.\/views\/tools\/sql\/(.*)\.vue$/)
    const toolMatch = path.match(/\.\/views\/tools\/(.*)\.vue$/)

    if (!sqlMatch && !toolMatch) return null

    let toolName, routePath
    if (sqlMatch) {
      // SQL 相关页面
      toolName = sqlMatch[1]
      routePath = `/sql/${toolName.toLowerCase().replace('page', '')}`
    } else {
      // 其他工具页面
      toolName = toolMatch[1]
      routePath = `/tools/${toolName.toLowerCase().replace('page', '')}`
    }

    // 获取友好的标题
    const title = TITLE_MAP[toolName.toLowerCase().replace('page', '')] || toolName

    return {
      path: routePath,
      name: `tool-${toolName.toLowerCase()}`,
      component,
      meta: {
        title,
        breadcrumb: generateBreadcrumb(routePath),
      },
    }
  })
  .filter(Boolean)

/**
 * 静态路由
 */
const staticRoutes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomePage.vue'),
    meta: {
      title: '工具箱',
      breadcrumb: [{ name: '首页' }],
    },
  },
  {
    path: '/sql-tool',
    name: 'sql-tool',
    component: () => import('../views/SqlToolPage.vue'),
    meta: {
      title: 'SQL 生成工具',
      breadcrumb: [
        { name: '首页', path: '/' },
        { name: 'SQL工具' },
      ],
    },
  },
]

/**
 * 404 页面 - 捕获所有不匹配的路由
 */
const notFoundRoute = {
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('../views/NotFound.vue'),
  meta: {
    title: '页面未找到',
    breadcrumb: [{ name: '页面未找到' }],
  },
}

/**
 * 合并所有路由
 */
const routes = [...staticRoutes, ...toolRoutes, notFoundRoute]

/**
 * 创建路由实例
 * 使用 HTML5 History 模式
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * 路由守卫
 */
router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '在线工具箱'} - 在线工具箱`
  next()
})

export default router
