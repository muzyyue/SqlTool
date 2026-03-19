/**
 * JSON 工具模块统一导出
 * 提供所有 JSON 相关工具函数的统一入口
 * @module utils/json
 */

export * from './jsonFormatter'
export * from './jsonCompare'
export * from './jsonCodeGenerator'
export * from './jsonConverter'

// 导出别名，兼容旧代码
export {
  deepCompare as deepCompareJson,
  shallowCompare as shallowCompareJson,
  compareByField,
  getDiffTypeText,
  formatValue,
} from './jsonCompare'
