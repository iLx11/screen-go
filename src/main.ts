import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import 'virtual:svg-icons-register'
import SvgIcon from './components/tools/SvgIcon.vue'

const app = createApp(App)
app.component('svg-icon', SvgIcon)

app.use(createPinia())
app.use(router)

app.mount('#app')
