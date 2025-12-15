import { expect } from 'vitest'
import { config } from '@vue/test-utils'

// 全局配置Vue Test Utils
config.global.stubs = {
  Transition: false,
  'transition-group': false,
  // 为Ant Design Vue组件创建stub
  'a-card': true,
  'a-button': true,
  'a-input': true,
  'a-textarea': true,
  'a-slider': true,
  'a-radio-group': true,
  'a-radio': true,
  'a-switch': true,
  'a-table': true,
  'a-space': true,
  'a-divider': true,
  'a-tooltip': true,
  'a-upload': true,
  'a-modal': true,
  'a-spin': true,
  'a-alert': true,
  'a-collapse': true,
  'a-collapse-panel': true,
  'a-statistic': true,
  'a-tag': true,
  'a-select': true,
  'a-select-option': true,
  'a-progress': true,
  'a-timeline': true,
  'a-timeline-item': true,
  'a-empty': true
}

// 全局测试辅助函数
globalThis.expect = expect