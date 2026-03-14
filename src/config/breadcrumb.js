/**
 * 面包屑配置
 * 定义路由路径与面包屑名称的映射关系
 */

/**
 * 面包屑路径映射
 * key: 路由路径
 * value: 面包屑名称
 */
export const breadcrumbMap = {
  '/': '工具箱',
  '/sql-tool': 'SQL 工具',
  '/tools/jsonpage': 'JSON 工具',
  '/tools/timestamppage': '时间戳工具',
  '/tools/excelfillpage': 'Excel 填充',
  '/sql/insertpage': 'INSERT 生成',
  '/sql/updatepage': 'UPDATE 生成',
  '/sql/ddlpage': 'DDL 解析',
}

/**
 * 路由层级关系
 * 定义子路由的父级路径
 */
export const routeHierarchy = {
  '/sql/insertpage': '/sql-tool',
  '/sql/updatepage': '/sql-tool',
  '/sql/ddlpage': '/sql-tool',
}

/**
 * 首页面包屑配置
 */
export const homeBreadcrumb = {
  name: '工具箱',
  path: '/',
}

/**
 * 根据路由路径生成面包屑数组
 * @param {import('vue-router').RouteLocationNormalized} route - Vue Router 路由对象
 * @returns {Array<{name: string, path: string}>} 面包屑数组
 */
export function generateBreadcrumb(route) {
  const breadcrumbs = []
  const currentPath = route.path

  if (currentPath === '/') {
    return [homeBreadcrumb]
  }

  breadcrumbs.push(homeBreadcrumb)

  const parentPath = routeHierarchy[currentPath]
  if (parentPath && breadcrumbMap[parentPath]) {
    breadcrumbs.push({
      name: breadcrumbMap[parentPath],
      path: parentPath,
    })
  }

  if (route.meta?.breadcrumb) {
    breadcrumbs.push({
      name: route.meta.breadcrumb,
      path: currentPath,
    })
  } else if (route.meta?.title) {
    breadcrumbs.push({
      name: route.meta.title,
      path: currentPath,
    })
  } else if (breadcrumbMap[currentPath]) {
    breadcrumbs.push({
      name: breadcrumbMap[currentPath],
      path: currentPath,
    })
  }

  return breadcrumbs
}

/**
 * 根据路径获取面包屑名称
 * @param {string} path - 路由路径
 * @returns {string|undefined} 面包屑名称
 */
export function getBreadcrumbName(path) {
  return breadcrumbMap[path]
}

/**
 * 检查路径是否需要显示面包屑
 * @param {string} path - 路由路径
 * @returns {boolean} 是否需要显示面包屑
 */
export function shouldShowBreadcrumb(path) {
  return path !== '/' && breadcrumbMap[path] !== undefined
}
