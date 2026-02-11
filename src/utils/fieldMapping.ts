/**
 * 字段映射工具
 * 提供字段映射相关的工具函数，包括置信度处理、相似度计算等
 */

/**
 * 置信度等级
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'manual' | string

/**
 * 置信度配置
 */
export interface ConfidenceConfig {
  high: { color: string; text: string; threshold: number }
  medium: { color: string; text: string; threshold: number }
  low: { color: string; text: string; threshold: number }
}

/**
 * 默认置信度配置
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  high: { color: '#52c41a', text: '高', threshold: 0.8 },
  medium: { color: '#faad14', text: '中', threshold: 0.5 },
  low: { color: '#ff4d4f', text: '低', threshold: 0 },
}

/**
 * 获取置信度颜色
 * @param {ConfidenceLevel} confidence - 置信度等级
 * @returns {string} 颜色值
 */
export const getConfidenceColor = (confidence: ConfidenceLevel): string => {
  if (confidence === 'manual') {
    return '#722ed1'
  }

  const config = DEFAULT_CONFIDENCE_CONFIG

  switch (confidence) {
    case 'high':
      return config.high.color
    case 'medium':
      return config.medium.color
    case 'low':
      return config.low.color
    default:
      return '#8c8c8c'
  }
}

/**
 * 获取置信度文本
 * @param {ConfidenceLevel} confidence - 置信度等级
 * @returns {string} 置信度文本
 */
export const getConfidenceText = (confidence: ConfidenceLevel): string => {
  if (confidence === 'manual') {
    return '手动'
  }

  const config = DEFAULT_CONFIDENCE_CONFIG

  switch (confidence) {
    case 'high':
      return config.high.text
    case 'medium':
      return config.medium.text
    case 'low':
      return config.low.text
    default:
      return '未知'
  }
}

/**
 * 根据相似度获取置信度等级
 * @param {number} similarity - 相似度值（0-1）
 * @returns {ConfidenceLevel} 置信度等级
 */
export const similarityToConfidence = (similarity: number): ConfidenceLevel => {
  if (similarity >= DEFAULT_CONFIDENCE_CONFIG.high.threshold) {
    return 'high'
  } else if (similarity >= DEFAULT_CONFIDENCE_CONFIG.medium.threshold) {
    return 'medium'
  }
  return 'low'
}

/**
 * 获取相似度颜色
 * @param {number} similarity - 相似度值（0-1）
 * @returns {string} 颜色值
 */
export const getSimilarityColor = (similarity: number): string => {
  if (similarity >= 0.8) {
    return '#52c41a'
  } else if (similarity >= 0.5) {
    return '#faad14'
  } else if (similarity >= 0.3) {
    return '#1890ff'
  }
  return '#ff4d4f'
}

/**
 * 字段映射状态
 */
export type MappingStatus = 'matched' | 'unmatched' | 'bound' | 'custom'

/**
 * 获取映射状态
 * @param {any} mapping - 映射对象
 * @returns {MappingStatus} 映射状态
 */
export const getMappingStatus = (mapping: any): MappingStatus => {
  if (mapping.status) {
    return mapping.status
  }

  if (mapping.excelIndex === -1 || mapping.excelIndex === undefined) {
    return 'unmatched'
  }

  if (mapping.ddlField?.isCustom) {
    return 'custom'
  }

  return 'matched'
}

/**
 * 过滤已被使用的列索引
 * @param {number[]} columnIndices - 所有列索引
 * @param {any[]} mappings - 现有映射列表
 * @returns {number[]} 未被使用的列索引
 */
export const getUnusedColumnIndices = (
  columnIndices: number[],
  mappings: any[],
): number[] => {
  const usedIndices = new Set(
    mappings
      .filter((m) => m.excelIndex >= 0)
      .map((m) => m.excelIndex),
  )
  return columnIndices.filter((idx) => !usedIndices.has(idx))
}

/**
 * 检查列是否已被使用
 * @param {number} columnIndex - 列索引
 * @param {any[]} mappings - 现有映射列表
 * @returns {boolean} 是否已被使用
 */
export const isColumnUsed = (columnIndex: number, mappings: any[]): boolean => {
  return mappings.some(
    (m) => m.excelIndex >= 0 && m.excelIndex === columnIndex,
  )
}

/**
 * 创建手动映射模板
 * @param {any[]} ddlFields - DDL字段列表
 * @param {string[]} excelHeaders - Excel表头列表
 * @returns {any[]} 映射列表
 */
export const createManualMappings = (
  ddlFields: any[],
  excelHeaders: string[],
): any[] => {
  return ddlFields.map((ddlField) => ({
    ddlField,
    excelHeader: null,
    excelIndex: -1,
    similarity: 0,
    confidence: 'manual',
    status: 'unmatched',
    generatedByFunction: ddlField.isCustom || false,
  }))
}
