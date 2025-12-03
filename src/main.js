import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Antd from 'ant-design-vue'
import * as Icons from '@ant-design/icons-vue'
import 'ant-design-vue/dist/reset.css'

const app = createApp(App)

// 全局注册所有图标
for (const [key, component] of Object.entries(Icons)) {
  app.component(key, component)
}

app.use(router)
app.use(Antd)

app.mount('#app')
