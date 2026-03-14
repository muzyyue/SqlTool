/**
 * JSON 组件模块导出
 * 使用 defineAsyncComponent 实现懒加载
 * 优化策略：
 * 1. JSON 组件按需加载，减小首屏体积
 * 2. 提供加载状态和错误处理
 */
import { defineAsyncComponent } from 'vue'

/**
 * 创建异步组件包装器
 * @param {string} componentName - 组件名称
 * @param {Function} loader - 组件加载函数
 * @returns {Object} 异步组件
 */
const createAsyncComponent = (componentName, loader) => {
  return defineAsyncComponent({
    loader,
    loadingComponent: {
      template: `
        <div class="json-component-loading">
          <a-spin size="small" />
          <span style="margin-left: 8px;">加载组件中...</span>
        </div>
      `,
    },
    errorComponent: {
      template: `
        <div class="json-component-error">
          <a-alert
            type="error"
            message="组件加载失败"
            description="请刷新页面重试"
            show-icon
          />
        </div>
      `,
    },
    delay: 200,
    timeout: 10000,
  })
}

/**
 * 代码生成面板组件
 * 根据 JSON 数据生成 TypeScript、Java、Python、Go 等语言的类型定义代码
 */
export const CodeGenPanel = createAsyncComponent(
  'CodeGenPanel',
  () => import('./CodeGenPanel.vue')
)

/**
 * 预加载 JSON 组件
 * @param {string[]} components - 要预加载的组件名称数组
 */
export const preloadJsonComponents = (components = []) => {
  const componentMap = {
    CodeGenPanel,
  }

  components.forEach((name) => {
    const component = componentMap[name]
    if (component && typeof component.__asyncLoader === 'function') {
      component.__asyncLoader()
    }
  })
}

/**
 * 预加载所有 JSON 组件
 */
export const preloadAllJsonComponents = () => {
  preloadJsonComponents(['CodeGenPanel'])
}

// 默认导出所有组件
export default {
  CodeGenPanel,
  preloadJsonComponents,
  preloadAllJsonComponents,
}
