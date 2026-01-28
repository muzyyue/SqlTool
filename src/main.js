import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'uno.css'
import { applyTheme, getCurrentTheme } from './design/theme.js'

const app = createApp(App)

app.use(createPinia())

app.use(router)

app.use(Antd)

app.mount('#app')

applyTheme(getCurrentTheme())
