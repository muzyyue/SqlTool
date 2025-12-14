import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomePage.vue'),
  },
  {
    path: '/insert',
    name: 'insert',
    component: () => import('../views/InsertPage.vue'),
  },
  {
    path: '/update',
    name: 'update',
    component: () => import('../views/UpdatePage.vue'),
  },
  {
    path: '/ddl',
    name: 'ddl',
    component: () => import('../views/DdlPage.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
