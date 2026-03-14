import { createRouter, createWebHistory } from 'vue-router'

/**
 * 动态导入工具页面
 * 自动扫描 views/tools 目录
 */
const toolModules = import.meta.glob('../views/tools/**/*.vue')

/**
 * 工具名称映射表
 * 用于生成友好的面包屑名称
 */
const toolNameMap = {
  insertpage: 'INSERT语句生成',
  updatepage: 'UPDATE语句生成',
  jsonpage: 'JSON格式化',
  timestamppage: '时间戳转换',
  excelfillpage: 'Excel数据填充',
}

/**
 * 生成工具路由
 * 自动添加面包屑配置
 */
const toolRoutes = Object.entries(toolModules)
  .map(([path, component]) => {
    // 匹配 tools/sql/*.vue 或 tools/*.vue
    const sqlMatch = path.match(/\.\/views\/tools\/sql\/(.*)\.vue$/)
    const toolMatch = path.match(/\.\/views\/tools\/(.*)\.vue$/)

    if (!sqlMatch && !toolMatch) return null

    let toolName, routePath, toolTitle
    if (sqlMatch) {
      // SQL 相关页面
      toolName = sqlMatch[1]
      routePath = `/sql/${toolName.toLowerCase().replace('page', '')}`
      toolTitle = toolNameMap[toolName.toLowerCase()] || toolName
      return {
        path: routePath,
        name: `tool-${toolName.toLowerCase()}`,
        component,
        meta: {
          title: toolTitle,
          breadcrumb: [
            { name: '首页', path: '/' },
            { name: 'SQL工具', path: '/sql-tool' },
            { name: toolTitle },
          ],
        },
      }
    } else {
      // 其他工具页面
      toolName = toolMatch[1]
      routePath = `/tools/${toolName.toLowerCase().replace('page', '')}`
      toolTitle = toolNameMap[toolName.toLowerCase()] || toolName
      return {
        path: routePath,
        name: `tool-${toolName.toLowerCase()}`,
        component,
        meta: {
          title: toolTitle,
          breadcrumb: [
            { name: '首页', path: '/' },
            { name: '工具箱', path: '/' },
            { name: toolTitle },
          ],
        },
      }
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
