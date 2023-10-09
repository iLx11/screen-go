import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../window/HomePage.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'homePage',
      component: HomePage
    }
  ]
})

export default router
