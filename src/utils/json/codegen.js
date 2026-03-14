/**
 * JSON 代码生成工具
 * 根据 JSON 对象生成 TypeScript、Java、Python 等语言的类型定义
 */

/**
 * @typedef {Object} CodegenResult
 * @property {boolean} success - 操作是否成功
 * @property {string} [data] - 成功时返回的代码
 * @property {string} [error] - 失败时返回的错误信息
 */

/**
 * 推断值的 TypeScript 类型
 * @param {*} value - 要推断类型的值
 * @returns {string} TypeScript 类型字符串
 */
const inferTypeScriptType = (value) => {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'any[]'
    }
    const itemTypes = new Set(value.map(inferTypeScriptType))
    if (itemTypes.size === 1) {
      return `${Array.from(itemTypes)[0]}[]`
    }
    return `(${Array.from(itemTypes).join(' | ')})[]`
  }
  if (typeof value === 'object') {
    return 'object'
  }
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'any'
  }
}

/**
 * 推断值的 Java 类型
 * @param {*} value - 要推断类型的值
 * @returns {string} Java 类型字符串
 */
const inferJavaType = (value) => {
  if (value === null || value === undefined) {
    return 'Object'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'List<Object>'
    }
    const itemTypes = new Set(value.map(inferJavaType))
    if (itemTypes.size === 1) {
      return `List<${Array.from(itemTypes)[0]}>`
    }
    return 'List<Object>'
  }
  if (typeof value === 'object') {
    return 'Object'
  }
  switch (typeof value) {
    case 'string':
      return 'String'
    case 'number':
      if (Number.isInteger(value)) {
        return 'Integer'
      }
      return 'Double'
    case 'boolean':
      return 'Boolean'
    default:
      return 'Object'
  }
}

/**
 * 推断值的 Python 类型
 * @param {*} value - 要推断类型的值
 * @returns {string} Python 类型字符串
 */
const inferPythonType = (value) => {
  if (value === null || value === undefined) {
    return 'Any'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'list'
    }
    const itemTypes = new Set(value.map(inferPythonType))
    if (itemTypes.size === 1) {
      return `list[${Array.from(itemTypes)[0]}]`
    }
    return 'list'
  }
  if (typeof value === 'object') {
    return 'dict'
  }
  switch (typeof value) {
    case 'string':
      return 'str'
    case 'number':
      if (Number.isInteger(value)) {
        return 'int'
      }
      return 'float'
    case 'boolean':
      return 'bool'
    default:
      return 'Any'
  }
}

/**
 * 将字符串转换为 PascalCase（大驼峰）
 * @param {string} str - 输入字符串
 * @returns {string} PascalCase 字符串
 */
const toPascalCase = (str) => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase())
}

/**
 * 将字符串转换为 camelCase（小驼峰）
 * @param {string} str - 输入字符串
 * @returns {string} camelCase 字符串
 */
const toCamelCase = (str) => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase())
}

/**
 * 生成 TypeScript 接口定义
 * @param {Object} json - JSON 对象
 * @param {string} interfaceName - 接口名称
 * @returns {CodegenResult} 生成结果
 * @example
 * jsonToTypeScript({ name: '张三', age: 25 }, 'Person')
 * // 返回: { success: true, data: 'export interface Person {\n  name: string;\n  age: number;\n}' }
 */
export const jsonToTypeScript = (json, interfaceName) => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象',
    }
  }

  if (typeof interfaceName !== 'string' || !interfaceName.trim()) {
    return {
      success: false,
      error: '接口名称不能为空',
    }
  }

  try {
    const lines = []
    lines.push(`export interface ${toPascalCase(interfaceName)} {`)

    const entries = Object.entries(json)
    entries.forEach(([key, value]) => {
      const type = inferTypeScriptType(value)
      const optional = value === null || value === undefined ? '?' : ''
      lines.push(`  ${key}${optional}: ${type};`)
    })

    lines.push('}')

    return {
      success: true,
      data: lines.join('\n'),
    }
  } catch (e) {
    return {
      success: false,
      error: `生成 TypeScript 接口失败: ${e.message}`,
    }
  }
}

/**
 * 生成 Java 实体类
 * @param {Object} json - JSON 对象
 * @param {string} className - 类名
 * @returns {CodegenResult} 生成结果
 * @example
 * jsonToJava({ name: '张三', age: 25 }, 'Person')
 * // 返回 Java 实体类代码
 */
export const jsonToJava = (json, className) => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象',
    }
  }

  if (typeof className !== 'string' || !className.trim()) {
    return {
      success: false,
      error: '类名不能为空',
    }
  }

  try {
    const lines = []
    const pascalName = toPascalCase(className)
    lines.push(`public class ${pascalName} {`)

    const entries = Object.entries(json)
    entries.forEach(([key, value]) => {
      const type = inferJavaType(value)
      lines.push(`    private ${type} ${toCamelCase(key)};`)
    })

    lines.push('')

    entries.forEach(([key, value]) => {
      const type = inferJavaType(value)
      const camelKey = toCamelCase(key)
      const pascalKey = toPascalCase(key)
      lines.push(`    public ${type} get${pascalKey}() {`)
      lines.push(`        return ${camelKey};`)
      lines.push('    }')
      lines.push('')
      lines.push(`    public void set${pascalKey}(${type} ${camelKey}) {`)
      lines.push(`        this.${camelKey} = ${camelKey};`)
      lines.push('    }')
      lines.push('')
    })

    lines.push('}')

    return {
      success: true,
      data: lines.join('\n'),
    }
  } catch (e) {
    return {
      success: false,
      error: `生成 Java 实体类失败: ${e.message}`,
    }
  }
}

/**
 * 生成 Python dataclass
 * @param {Object} json - JSON 对象
 * @param {string} className - 类名
 * @returns {CodegenResult} 生成结果
 * @example
 * jsonToPython({ name: '张三', age: 25 }, 'Person')
 * // 返回 Python dataclass 代码
 */
export const jsonToPython = (json, className) => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象',
    }
  }

  if (typeof className !== 'string' || !className.trim()) {
    return {
      success: false,
      error: '类名不能为空',
    }
  }

  try {
    const lines = []
    lines.push('from dataclasses import dataclass')
    lines.push('from typing import Any')
    lines.push('')
    lines.push('@dataclass')
    lines.push(`class ${toPascalCase(className)}:`)

    const entries = Object.entries(json)
    if (entries.length === 0) {
      lines.push('    pass')
    } else {
      entries.forEach(([key, value]) => {
        const type = inferPythonType(value)
        lines.push(`    ${key}: ${type}`)
      })
    }

    return {
      success: true,
      data: lines.join('\n'),
    }
  } catch (e) {
    return {
      success: false,
      error: `生成 Python dataclass 失败: ${e.message}`,
    }
  }
}

/**
 * 生成 Go 结构体
 * @param {Object} json - JSON 对象
 * @param {string} structName - 结构体名
 * @returns {CodegenResult} 生成结果
 * @example
 * jsonToGo({ name: '张三', age: 25 }, 'Person')
 * // 返回 Go 结构体代码
 */
export const jsonToGo = (json, structName) => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象',
    }
  }

  if (typeof structName !== 'string' || !structName.trim()) {
    return {
      success: false,
      error: '结构体名不能为空',
    }
  }

  const inferGoType = (value) => {
    if (value === null || value === undefined) {
      return 'interface{}'
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]interface{}'
      }
      const itemType = inferGoType(value[0])
      return `[]${itemType}`
    }
    if (typeof value === 'object') {
      return 'interface{}'
    }
    switch (typeof value) {
      case 'string':
        return 'string'
      case 'number':
        if (Number.isInteger(value)) {
          return 'int'
        }
        return 'float64'
      case 'boolean':
        return 'bool'
      default:
        return 'interface{}'
    }
  }

  try {
    const lines = []
    lines.push(`type ${toPascalCase(structName)} struct {`)

    const entries = Object.entries(json)
    entries.forEach(([key, value]) => {
      const type = inferGoType(value)
      const fieldName = toPascalCase(key)
      lines.push(`    ${fieldName} ${type} \`json:"${key}"\``)
    })

    lines.push('}')

    return {
      success: true,
      data: lines.join('\n'),
    }
  } catch (e) {
    return {
      success: false,
      error: `生成 Go 结构体失败: ${e.message}`,
    }
  }
}
