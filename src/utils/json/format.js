/**
 * JSON 格式转换工具
 * 提供 JSON 转 XML、YAML 等格式转换功能
 */

/**
 * @typedef {Object} FormatResult
 * @property {boolean} success - 操作是否成功
 * @property {string} [data] - 成功时返回的转换结果
 * @property {string} [error] - 失败时返回的错误信息
 */

/**
 * 转义 XML 特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
const escapeXml = (str) => {
  if (typeof str !== 'string') {
    return String(str)
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 检查字符串是否为有效的 XML 标签名
 * @param {string} name - 标签名
 * @returns {boolean} 是否有效
 */
const isValidXmlTagName = (name) => {
  if (typeof name !== 'string' || !name.trim()) {
    return false
  }
  const xmlNameRegex = /^[a-zA-Z_][a-zA-Z0-9_\-.:]*$/
  return xmlNameRegex.test(name)
}

/**
 * 将单个值转换为 XML 字符串
 * @param {string} key - 键名
 * @param {*} value - 值
 * @param {number} indent - 缩进级别
 * @param {number} indentSize - 缩进空格数
 * @returns {string} XML 字符串
 */
const valueToXml = (key, value, indent, indentSize) => {
  const spaces = ' '.repeat(indent * indentSize)

  if (!isValidXmlTagName(key)) {
    const safeKey = 'item'
    return `${spaces}<${safeKey} name="${escapeXml(key)}">${escapeXml(value)}</${safeKey}>`
  }

  if (value === null || value === undefined) {
    return `${spaces}<${key} xsi:nil="true"/>`
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${spaces}<${key}/>`
    }
    const items = value
      .map((item) => valueToXml('item', item, indent + 1, indentSize))
      .join('\n')
    return `${spaces}<${key}>\n${items}\n${spaces}</${key}>`
  }

  if (typeof value === 'object') {
    const nested = objectToXml(value, indent + 1, indentSize)
    return `${spaces}<${key}>\n${nested}\n${spaces}</${key}>`
  }

  return `${spaces}<${key}>${escapeXml(value)}</${key}>`
}

/**
 * 将对象转换为 XML 字符串（内部函数）
 * @param {Object} obj - JSON 对象
 * @param {number} indent - 缩进级别
 * @param {number} indentSize - 缩进空格数
 * @returns {string} XML 字符串
 */
const objectToXml = (obj, indent, indentSize) => {
  const entries = Object.entries(obj)
  return entries
    .map(([key, value]) => valueToXml(key, value, indent, indentSize))
    .join('\n')
}

/**
 * 将 JSON 对象转换为 XML 格式
 * @param {Object} json - JSON 对象
 * @param {string} [rootName='root'] - 根节点名称
 * @param {Object} [options] - 转换选项
 * @param {number} [options.indent=2] - 缩进空格数
 * @param {boolean} [options.declaration=true] - 是否包含 XML 声明
 * @returns {FormatResult} 转换结果
 * @example
 * jsonToXml({ name: '张三', age: 25 }, 'person')
 * // 返回: { success: true, data: '<?xml version="1.0"?>\n<person>\n  <name>张三</name>\n  <age>25</age>\n</person>' }
 */
export const jsonToXml = (json, rootName = 'root', options = {}) => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象',
    }
  }

  if (typeof rootName !== 'string' || !rootName.trim()) {
    return {
      success: false,
      error: '根节点名称不能为空',
    }
  }

  if (!isValidXmlTagName(rootName)) {
    return {
      success: false,
      error: '根节点名称不符合 XML 规范，只能包含字母、数字、下划线、连字符和点号，且不能以数字开头',
    }
  }

  const { indent = 2, declaration = true } = options

  if (typeof indent !== 'number' || indent < 0 || indent > 8) {
    return {
      success: false,
      error: '缩进空格数必须在 0-8 之间',
    }
  }

  try {
    const lines = []

    if (declaration) {
      lines.push('<?xml version="1.0" encoding="UTF-8"?>')
    }

    const content = objectToXml(json, 1, indent)
    lines.push(`<${rootName}>`)
    lines.push(content)
    lines.push(`</${rootName}>`)

    return {
      success: true,
      data: lines.join('\n'),
    }
  } catch (e) {
    return {
      success: false,
      error: `转换为 XML 失败: ${e.message}`,
    }
  }
}

/**
 * 将单个值转换为 YAML 字符串
 * @param {*} value - 值
 * @param {number} indent - 缩进级别
 * @param {number} indentSize - 缩进空格数
 * @returns {string} YAML 字符串
 */
const valueToYaml = (value, indent, indentSize) => {
  const spaces = ' '.repeat(indent * indentSize)

  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'null'
  }

  if (typeof value === 'string') {
    if (value.includes('\n') || value.includes(':') || value.includes('#') || value.includes('"')) {
      const escaped = value.replace(/"/g, '\\"')
      return `"${escaped}"`
    }
    if (value === '' || /^\s|\s$/.test(value)) {
      return `"${value}"`
    }
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    const items = value.map((item) => {
      const itemYaml = valueToYaml(item, indent + 1, indentSize)
      if (typeof item === 'object' && item !== null) {
        return `\n${spaces}${' '.repeat(indentSize)}- ${itemYaml.trimStart()}`
      }
      return `\n${spaces}${' '.repeat(indentSize)}- ${itemYaml}`
    })
    return items.join('')
  }

  if (typeof value === 'object') {
    const nested = objectToYaml(value, indent + 1, indentSize)
    return `\n${nested}`
  }

  return String(value)
}

/**
 * 将对象转换为 YAML 字符串（内部函数）
 * @param {Object} obj - JSON 对象
 * @param {number} indent - 缩进级别
 * @param {number} indentSize - 缩进空格数
 * @returns {string} YAML 字符串
 */
const objectToYaml = (obj, indent, indentSize) => {
  const entries = Object.entries(obj)
  const spaces = ' '.repeat(indent * indentSize)

  return entries
    .map(([key, value]) => {
      const yamlValue = valueToYaml(value, indent, indentSize)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${spaces}${key}:${yamlValue}`
      }
      if (Array.isArray(value) && value.length > 0) {
        return `${spaces}${key}:${yamlValue}`
      }
      return `${spaces}${key}: ${yamlValue}`
    })
    .join('\n')
}

/**
 * 将 JSON 对象转换为 YAML 格式
 * @param {Object} json - JSON 对象
 * @param {number} [indent=2] - 缩进空格数
 * @returns {FormatResult} 转换结果
 * @example
 * jsonToYaml({ name: '张三', age: 25 })
 * // 返回: { success: true, data: 'name: 张三\nage: 25' }
 */
export const jsonToYaml = (json, indent = 2) => {
  if (typeof json !== 'object' || json === null) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象或数组',
    }
  }

  if (typeof indent !== 'number' || indent < 1 || indent > 8) {
    return {
      success: false,
      error: '缩进空格数必须在 1-8 之间',
    }
  }

  try {
    if (Array.isArray(json)) {
      if (json.length === 0) {
        return {
          success: true,
          data: '[]',
        }
      }
      const yaml = valueToYaml(json, 0, indent)
      return {
        success: true,
        data: yaml.trimStart(),
      }
    }

    const yaml = objectToYaml(json, 0, indent)
    return {
      success: true,
      data: yaml,
    }
  } catch (e) {
    return {
      success: false,
      error: `转换为 YAML 失败: ${e.message}`,
    }
  }
}

/**
 * 将 JSON 对象转换为 TOML 格式
 * @param {Object} json - JSON 对象
 * @returns {FormatResult} 转换结果
 * @example
 * jsonToToml({ name: '张三', age: 25 })
 * // 返回: { success: true, data: 'name = "张三"\nage = 25' }
 */
export const jsonToToml = (json) => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象',
    }
  }

  try {
    const lines = []

    const processValue = (value) => {
      if (value === null) {
        return 'null'
      }
      if (typeof value === 'string') {
        const escaped = value
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
        return `"${escaped}"`
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
      }
      if (Array.isArray(value)) {
        const items = value.map(processValue).join(', ')
        return `[${items}]`
      }
      if (typeof value === 'object') {
        return '[complex object]'
      }
      return String(value)
    }

    const entries = Object.entries(json)
    entries.forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(`[${key}]`)
        Object.entries(value).forEach(([subKey, subValue]) => {
          lines.push(`${subKey} = ${processValue(subValue)}`)
        })
        lines.push('')
      } else {
        lines.push(`${key} = ${processValue(value)}`)
      }
    })

    return {
      success: true,
      data: lines.join('\n').trim(),
    }
  } catch (e) {
    return {
      success: false,
      error: `转换为 TOML 失败: ${e.message}`,
    }
  }
}

/**
 * 将 JSON 对象转换为 Properties 格式（Java 配置文件）
 * @param {Object} json - JSON 对象
 * @returns {FormatResult} 转换结果
 * @example
 * jsonToProperties({ app: { name: 'MyApp', version: '1.0' } })
 * // 返回: { success: true, data: 'app.name=MyApp\napp.version=1.0' }
 */
export const jsonToProperties = (json) => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      success: false,
      error: '输入参数必须是有效的 JSON 对象',
    }
  }

  try {
    const lines = []

    const flatten = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (value === null || value === undefined) {
          lines.push(`${fullKey}=`)
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, fullKey)
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              flatten(item, `${fullKey}[${index}]`)
            } else {
              lines.push(`${fullKey}[${index}]=${item}`)
            }
          })
        } else {
          const escaped = String(value)
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
          lines.push(`${fullKey}=${escaped}`)
        }
      })
    }

    flatten(json)

    return {
      success: true,
      data: lines.join('\n'),
    }
  } catch (e) {
    return {
      success: false,
      error: `转换为 Properties 失败: ${e.message}`,
    }
  }
}
