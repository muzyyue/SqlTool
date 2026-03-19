/**
 * JSON 工具类型定义
 * 定义JSON处理相关的所有类型接口
 */

/**
 * JSON 格式化选项
 */
export interface JsonFormatOptions {
  /** 缩进空格数，默认为2 */
  indentSpaces: number
  /** 格式化风格：expanded（展开）或 compact（紧凑） */
  formatStyle: 'expanded' | 'compact'
  /** 是否保留键的原始顺序 */
  preserveKeyOrder: boolean
  /** 是否排序键名 */
  sortKeys: boolean
}

/**
 * JSON 统计信息
 */
export interface JsonStats {
  /** 对象数量 */
  objectCount: number
  /** 数组数量 */
  arrayCount: number
  /** 字段总数 */
  fieldCount: number
  /** 数据大小（字节） */
  size: number
  /** 字符串数量 */
  stringCount: number
  /** 数字数量 */
  numberCount: number
  /** 布尔值数量 */
  booleanCount: number
  /** null值数量 */
  nullCount: number
  /** 最大嵌套深度 */
  maxDepth: number
}

/**
 * JSON 差异类型
 */
export type JsonDiffType = 'missing_left' | 'missing_right' | 'different' | 'missing_both'

/**
 * JSON 差异项
 */
export interface JsonDiff {
  /** 差异路径 */
  path: string
  /** 差异类型 */
  type: JsonDiffType
  /** 左侧值 */
  leftValue: unknown
  /** 右侧值 */
  rightValue: unknown
  /** 差异描述 */
  description?: string
}

/**
 * JSON 对比结果
 */
export interface JsonCompareResult {
  /** 结果类型：success/warning/error */
  type: 'success' | 'warning' | 'error'
  /** 结果消息 */
  message: string
  /** 差异列表 */
  differences: JsonDiff[]
  /** 是否完全相同 */
  isEqual: boolean
}

/**
 * JSON 对比选项
 */
export interface JsonCompareOptions {
  /** 对比模式：shallow（浅层）/ deep（深度）/ field（字段） */
  mode: 'shallow' | 'deep' | 'field'
  /** 字段路径（仅 field 模式使用） */
  fieldPath?: string
  /** 是否忽略大小写 */
  ignoreCase: boolean
  /** 是否忽略数组顺序 */
  ignoreArrayOrder: boolean
  /** 是否忽略 null 和 undefined 的差异 */
  ignoreNullUndefined: boolean
}

/**
 * JSON 历史记录项
 */
export interface JsonHistoryItem {
  /** 唯一标识 */
  id: string
  /** JSON 内容 */
  content: string
  /** 时间戳 */
  timestamp: number
  /** 类型：format（格式化）/ compare（对比） */
  type: 'format' | 'compare'
  /** 描述 */
  description?: string
  /** 数据大小 */
  size?: number
}

/**
 * JSON 验证结果
 */
export interface JsonValidationResult {
  /** 是否有效 */
  isValid: boolean
  /** 错误消息 */
  errorMessage?: string
  /** 错误行号 */
  errorLine?: number
  /** 错误列号 */
  errorColumn?: number
  /** 错误位置 */
  errorPosition?: number
}

/**
 * 代码生成选项
 */
export interface CodeGeneratorOptions {
  /** 目标语言 */
  language: 'typescript' | 'java' | 'python' | 'go' | 'csharp' | 'kotlin' | 'swift' | 'dart'
  /** 根类型名称 */
  rootTypeName: string
  /** 是否使用驼峰命名 */
  useCamelCase: boolean
  /** 是否添加注释 */
  addComments: boolean
  /** 是否生成可选字段 */
  optionalFields: boolean
  /** 是否添加 null 检查 */
  nullChecks: boolean
}

/**
 * 格式转换选项
 */
export interface FormatConverterOptions {
  /** 目标格式 */
  targetFormat: 'xml' | 'yaml' | 'csv' | 'sql' | 'toml'
  /** XML 根元素名称 */
  xmlRootName?: string
  /** CSV 分隔符 */
  csvDelimiter?: string
  /** SQL 表名 */
  sqlTableName?: string
  /** 是否包含表头 */
  includeHeader?: boolean
}

/**
 * 树形视图节点
 */
export interface JsonTreeNode {
  /** 节点唯一标识 */
  id: string
  /** 键名 */
  key: string
  /** 值 */
  value: unknown
  /** 值类型 */
  valueType: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  /** 路径 */
  path: string
  /** 深度 */
  depth: number
  /** 是否展开 */
  expanded: boolean
  /** 子节点 */
  children?: JsonTreeNode[]
  /** 是否为数组项 */
  isArrayItem: boolean
  /** 数组索引（如果是数组项） */
  arrayIndex?: number
}

/**
 * 编辑器状态
 */
export interface EditorState {
  /** 当前行号 */
  currentLine: number
  /** 当前列号 */
  currentColumn: number
  /** 选中文本 */
  selectedText: string
  /** 字符总数 */
  charCount: number
  /** 字节总数 */
  byteCount: number
  /** 行总数 */
  lineCount: number
  /** 是否有选中内容 */
  hasSelection: boolean
  /** 选中起始行 */
  selectionStartLine?: number
  /** 选中起始列 */
  selectionStartColumn?: number
  /** 选中结束行 */
  selectionEndLine?: number
  /** 选中结束列 */
  selectionEndColumn?: number
}

/**
 * JSON 工具配置
 */
export interface JsonToolConfig {
  /** 默认缩进空格数 */
  defaultIndentSpaces: number
  /** 默认字体大小 */
  defaultFontSize: number
  /** 是否自动处理中文逗号 */
  autoHandleChineseComma: boolean
  /** 是否启用实时验证 */
  enableRealtimeValidation: boolean
  /** 历史记录最大数量 */
  maxHistoryCount: number
  /** 大文件阈值（字节） */
  largeFileThreshold: number
}
