import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
import "uno.css";
import "./design/theme.css";

// 深链接还原（GitHub Pages 404 回退）在 src/router/index.js 中执行，
// 必须在 createWebHistory 之前。放在这里来不及：上面 import router 时
// router 就已创建，history 也已按旧 URL 初始化完毕。

const app = createApp(App);

app.use(createPinia());

app.use(router);

app.use(Antd);

app.mount("#app");
