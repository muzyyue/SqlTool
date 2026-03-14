/**
 * JSON 转换工具
 * 提供 JSON 压缩、转义、反转义功能
 */

/**
 * @typedef {Object} JsonResult
 * @property {boolean} success - 操作是否成功
 * @property {string} [data] - 成功时返回的数据
 * @property {string} [error] - 失败时返回的错误信息
 */

/**
 * 压缩 JSON 字符串，去除所有空白字符
 * @param {string} json - JSON 字符串
 * @returns {JsonResult} 压缩结果
 * @example
 * compressJson('{ "name": "张三", "age": 25 }')
 * // 返回: { success: true, data: '{"name":"张三","age":25}' }
 */
export const compressJson = (json) => {
  if (typeof json !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  if (!json.trim()) {
    return {
      success: false,
      error: '输入字符串不能为空',
    }
  }

  try {
    const parsed = JSON.parse(json)
    const compressed = JSON.stringify(parsed)
    return {
      success: true,
      data: compressed,
    }
  } catch (e) {
    return {
      success: false,
      error: `JSON 解析失败: ${e.message}`,
    }
  }
}

/**
 * 转义 JSON 字符串，使其可以作为字符串值嵌入到另一个 JSON 中
 * @param {string} str - 需要转义的字符串
 * @returns {JsonResult} 转义结果
 * @example
 * escapeJson('{"name":"张三"}')
 * // 返回: { success: true, data: '{"name":"张三"}' }
 */
export const escapeJson = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const escaped = JSON.stringify(str)
    return {
      success: true,
      data: escaped,
    }
  } catch (e) {
    return {
      success: false,
      error: `转义失败: ${e.message}`,
    }
  }
}

/**
 * 反转义 JSON 字符串，将转义后的字符串还原为原始内容
 * @param {string} str - 转义后的 JSON 字符串
 * @returns {JsonResult} 反转义结果
 * @example
 * unescapeJson('"Hello\\nWorld"')
 * // 返回: { success: true, data: 'Hello\nWorld' }
 */
export const unescapeJson = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  if (!str.trim()) {
    return {
      success: false,
      error: '输入字符串不能为空',
    }
  }

  try {
    const unescaped = JSON.parse(str)
    if (typeof unescaped !== 'string') {
      return {
        success: false,
        error: '解析结果不是字符串类型，请确保输入的是被转义的字符串',
      }
    }
    return {
      success: true,
      data: unescaped,
    }
  } catch (e) {
    return {
      success: false,
      error: `反转义失败: ${e.message}`,
    }
  }
}

/**
 * 格式化 JSON 字符串，添加缩进和换行
 * @param {string} json - JSON 字符串
 * @param {number} [indent=2] - 缩进空格数
 * @returns {JsonResult} 格式化结果
 * @example
 * formatJson('{"name":"张三"}')
 * // 返回: { success: true, data: '{\n  "name": "张三"\n}' }
 */
export const formatJson = (json, indent = 2) => {
  if (typeof json !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  if (!json.trim()) {
    return {
      success: false,
      error: '输入字符串不能为空',
    }
  }

  if (typeof indent !== 'number' || indent < 0 || indent > 10) {
    return {
      success: false,
      error: '缩进空格数必须在 0-10 之间',
    }
  }

  try {
    const parsed = JSON.parse(json)
    const formatted = JSON.stringify(parsed, null, indent)
    return {
      success: true,
      data: formatted,
    }
  } catch (e) {
    return {
      success: false,
      error: `JSON 解析失败: ${e.message}`,
    }
  }
}

/**
 * 验证 JSON 字符串是否有效
 * @param {string} json - JSON 字符串
 * @returns {JsonResult} 验证结果
 * @example
 * validateJson('{"name":"张三"}')
 * // 返回: { success: true, data: 'JSON 格式有效' }
 */
export const validateJson = (json) => {
  if (typeof json !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  if (!json.trim()) {
    return {
      success: false,
      error: '输入字符串不能为空',
    }
  }

  try {
    JSON.parse(json)
    return {
      success: true,
      data: 'JSON 格式有效',
    }
  } catch (e) {
    return {
      success: false,
      error: `JSON 格式无效: ${e.message}`,
    }
  }
}
