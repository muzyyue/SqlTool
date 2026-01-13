import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 动态导入工具页面
 * 自动扫描 views/tools 目录
 */
const toolModules = import.meta.glob('../views/tools/*.vue')

/**
 * 生成工具路由
 */
const toolRoutes = Object.entries(toolModules)
  .map(([path, component]) => {
    const match = path.match(/\.\/views\/tools\/(.*)\.vue$/)
    if (!match) return null

    const toolName = match[1]
    const routePath = `/tools/${toolName.toLowerCase()}`

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
  {
    path: '/insert',
    name: 'insert',
    component: () => import('../views/InsertPage.vue'),
    meta: {
      title: 'INSERT 语句生成',
    },
  },
  {
    path: '/update',
    name: 'update',
    component: () => import('../views/UpdatePage.vue'),
    meta: {
      title: 'UPDATE 语句生成',
    },
  },
  {
    path: '/ddl',
    name: 'ddl',
    component: () => import('../views/DdlPage.vue'),
    meta: {
      title: 'DDL 语句生成',
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
