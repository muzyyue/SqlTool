import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/insert',
    name: 'insert',
    component: () => import('../views/insert.vue')
  },
  {
    path: '/update',
    name: 'update',
    component: () => import('../views/update.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
