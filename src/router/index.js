import { createRouter, createWebHashHistory } from 'vue-router'

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

    return {
      path: routePath,
      name: `tool-${toolName.toLowerCase()}`,
      component,
      meta: {
        title: toolName.charAt(0).toUpperCase() + toolName.slice(1),
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
    },
  },
  {
    path: '/sql-tool',
    name: 'sql-tool',
    component: () => import('../views/SqlToolPage.vue'),
    meta: {
      title: 'SQL 生成工具',
    },
  },
]

/**
 * 404 页面
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
 */
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
