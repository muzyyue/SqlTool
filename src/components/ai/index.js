/**
 * AI 组件模块导出
 * 使用 defineAsyncComponent 实现懒加载
 * 优化策略：
 * 1. AI 组件按需加载，减小首屏体积
 * 2. 提供加载状态和错误处理
 * 3. 支持预加载策略
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
        <div class="ai-component-loading">
          <a-spin size="small" />
          <span style="margin-left: 8px;">加载 AI 组件中...</span>
        </div>
      `,
    },
    errorComponent: {
      template: `
        <div class="ai-component-error">
          <a-alert 
            type="error" 
            message="AI 组件加载失败" 
            description="请刷新页面重试，或检查网络连接"
            show-icon
          />
        </div>
      `,
    },
    delay: 200, // 延迟显示加载组件
    timeout: 10000, // 10秒超时
  })
}

// 导出异步组件
export const AiStatusIndicator = createAsyncComponent(
  'AiStatusIndicator',
  () => import('./AiStatusIndicator.vue')
)

export const AiConfigPanel = createAsyncComponent(
  'AiConfigPanel',
  () => import('./AiConfigPanel.vue')
)

export const AiDialog = createAsyncComponent(
  'AiDialog',
  () => import('./AiDialog.vue')
)

export const AiAssistButton = createAsyncComponent(
  'AiAssistButton',
  () => import('./AiAssistButton.vue')
)

export const SqlAiAssistant = createAsyncComponent(
  'SqlAiAssistant',
  () => import('./SqlAiAssistant.vue')
)

export const RegexAiAssistant = createAsyncComponent(
  'RegexAiAssistant',
  () => import('./RegexAiAssistant.vue')
)

export const JsonAiAssistant = createAsyncComponent(
  'JsonAiAssistant',
  () => import('./JsonAiAssistant.vue')
)

/**
 * 预加载 AI 组件
 * 在用户可能使用 AI 功能时提前加载组件
 * @param {string[]} components - 要预加载的组件名称数组
 */
export const preloadAiComponents = (components = []) => {
  const componentMap = {
    AiStatusIndicator,
    AiConfigPanel,
    AiDialog,
    AiAssistButton,
    SqlAiAssistant,
    RegexAiAssistant,
    JsonAiAssistant,
  }

  components.forEach((name) => {
    const component = componentMap[name]
    if (component && typeof component.__asyncLoader === 'function') {
      component.__asyncLoader()
    }
  })
}

/**
 * 预加载所有 AI 组件
 * 在用户进入工具页面时调用
 */
export const preloadAllAiComponents = () => {
  preloadAiComponents([
    'AiStatusIndicator',
    'AiConfigPanel',
    'AiDialog',
    'AiAssistButton',
    'SqlAiAssistant',
    'RegexAiAssistant',
    'JsonAiAssistant',
  ])
}

// 默认导出所有组件
export default {
  AiStatusIndicator,
  AiConfigPanel,
  AiDialog,
  AiAssistButton,
  SqlAiAssistant,
  RegexAiAssistant,
  JsonAiAssistant,
  preloadAiComponents,
  preloadAllAiComponents,
}
