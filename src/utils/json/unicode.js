/**
 * Unicode 编码转换工具
 * 提供中文与 Unicode 编码之间的相互转换功能
 */

/**
 * @typedef {Object} UnicodeResult
 * @property {boolean} success - 操作是否成功
 * @property {string} [data] - 成功时返回的转换结果
 * @property {string} [error] - 失败时返回的错误信息
 */

/**
 * 检查字符是否为中文字符
 * @param {string} char - 单个字符
 * @returns {boolean} 是否为中文字符
 */
const isChineseChar = (char) => {
  const code = char.charCodeAt(0)
  return code >= 0x4e00 && code <= 0x9fff
}

/**
 * 将中文字符转换为 Unicode 编码
 * @param {string} char - 单个中文字符
 * @returns {string} Unicode 编码字符串（如 \u4e2d）
 */
const charToUnicode = (char) => {
  const code = char.charCodeAt(0)
  const hex = code.toString(16).padStart(4, '0')
  return `\\u${hex}`
}

/**
 * 将 Unicode 编码字符串转换为字符
 * @param {string} unicode - Unicode 编码字符串（如 \u4e2d 或 U+4E2D）
 * @returns {string} 对应的字符
 */
const unicodeToChar = (unicode) => {
  let hexCode
  if (unicode.startsWith('\\u')) {
    hexCode = unicode.slice(2)
  } else if (unicode.startsWith('U+') || unicode.startsWith('u+')) {
    hexCode = unicode.slice(2)
  } else {
    hexCode = unicode
  }
  const code = parseInt(hexCode, 16)
  return String.fromCharCode(code)
}

/**
 * 将字符串中的中文转换为 Unicode 编码
 * @param {string} str - 包含中文的字符串
 * @returns {UnicodeResult} 转换结果
 * @example
 * chineseToUnicode('你好世界')
 * // 返回: { success: true, data: '\\u4f60\\u597d\\u4e16\\u754c' }
 */
export const chineseToUnicode = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    let result = ''
    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      if (isChineseChar(char)) {
        result += charToUnicode(char)
      } else {
        result += char
      }
    }
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `转换失败: ${e.message}`,
    }
  }
}

/**
 * 将 Unicode 编码转换为中文字符
 * @param {string} str - 包含 Unicode 编码的字符串
 * @returns {UnicodeResult} 转换结果
 * @example
 * unicodeToChinese('\\u4f60\\u597d\\u4e16\\u754c')
 * // 返回: { success: true, data: '你好世界' }
 */
export const unicodeToChinese = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const result = str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `转换失败: ${e.message}`,
    }
  }
}

/**
 * 将字符串完全转换为 Unicode 编码（包括非中文字符）
 * @param {string} str - 任意字符串
 * @returns {UnicodeResult} 转换结果
 * @example
 * stringToUnicode('ABC')
 * // 返回: { success: true, data: '\\u0041\\u0042\\u0043' }
 */
export const stringToUnicode = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    let result = ''
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      const hex = code.toString(16).padStart(4, '0')
      result += `\\u${hex}`
    }
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `转换失败: ${e.message}`,
    }
  }
}

/**
 * 将 Unicode 编码字符串还原为原始字符串
 * @param {string} str - Unicode 编码字符串
 * @returns {UnicodeResult} 转换结果
 * @example
 * unicodeToString('\\u0041\\u0042\\u0043')
 * // 返回: { success: true, data: 'ABC' }
 */
export const unicodeToString = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const result = str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `转换失败: ${e.message}`,
    }
  }
}

/**
 * 将字符串转换为 Unicode 码点数组
 * @param {string} str - 输入字符串
 * @returns {UnicodeResult} 转换结果
 * @example
 * stringToCodePoints('你好')
 * // 返回: { success: true, data: '[20320, 22909]' }
 */
export const stringToCodePoints = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const codePoints = []
    for (const char of str) {
      codePoints.push(char.codePointAt(0))
    }
    return {
      success: true,
      data: JSON.stringify(codePoints),
    }
  } catch (e) {
    return {
      success: false,
      error: `转换失败: ${e.message}`,
    }
  }
}

/**
 * 将 Unicode 码点数组转换为字符串
 * @param {string|number[]} codePoints - 码点数组或 JSON 字符串
 * @returns {UnicodeResult} 转换结果
 * @example
 * codePointsToString('[20320, 22909]')
 * // 返回: { success: true, data: '你好' }
 */
export const codePointsToString = (codePoints) => {
  try {
    let points
    if (typeof codePoints === 'string') {
      points = JSON.parse(codePoints)
    } else if (Array.isArray(codePoints)) {
      points = codePoints
    } else {
      return {
        success: false,
        error: '输入参数必须是码点数组或 JSON 字符串',
      }
    }

    if (!Array.isArray(points)) {
      return {
        success: false,
        error: '输入必须是有效的码点数组',
      }
    }

    const result = String.fromCodePoint(...points)
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `转换失败: ${e.message}`,
    }
  }
}

/**
 * 将字符串转换为 URL 编码（百分号编码）
 * @param {string} str - 输入字符串
 * @returns {UnicodeResult} 转换结果
 * @example
 * encodeUrl('你好世界')
 * // 返回: { success: true, data: '%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C' }
 */
export const encodeUrl = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const result = encodeURIComponent(str)
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `编码失败: ${e.message}`,
    }
  }
}

/**
 * 将 URL 编码字符串解码
 * @param {string} str - URL 编码字符串
 * @returns {UnicodeResult} 解码结果
 * @example
 * decodeUrl('%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C')
 * // 返回: { success: true, data: '你好世界' }
 */
export const decodeUrl = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const result = decodeURIComponent(str)
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `解码失败: ${e.message}`,
    }
  }
}

/**
 * 将字符串转换为 Base64 编码
 * @param {string} str - 输入字符串
 * @returns {UnicodeResult} 编码结果
 * @example
 * encodeBase64('你好')
 * // 返回: { success: true, data: '5L2g5aW9' }
 */
export const encodeBase64 = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const result = btoa(unescape(encodeURIComponent(str)))
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `编码失败: ${e.message}`,
    }
  }
}

/**
 * 将 Base64 编码字符串解码
 * @param {string} str - Base64 编码字符串
 * @returns {UnicodeResult} 解码结果
 * @example
 * decodeBase64('5L2g5aW9')
 * // 返回: { success: true, data: '你好' }
 */
export const decodeBase64 = (str) => {
  if (typeof str !== 'string') {
    return {
      success: false,
      error: '输入参数必须是字符串类型',
    }
  }

  try {
    const result = decodeURIComponent(escape(atob(str)))
    return {
      success: true,
      data: result,
    }
  } catch (e) {
    return {
      success: false,
      error: `解码失败: ${e.message}`,
    }
  }
}
