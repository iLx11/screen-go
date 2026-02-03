import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../window/HomePage.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
      component: () => import('../window/HomePage.vue'),
    },
    {
      path: '/screen',
      component: () => import('../window/ScreenEditorPage.vue'),
    },
  ],
})

export default router
