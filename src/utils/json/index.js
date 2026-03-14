/**
 * JSON 工具模块统一导出
 * 提供 JSON 转换、代码生成、格式转换、Unicode 编码等功能
 */

export {
  compressJson,
  escapeJson,
  unescapeJson,
  formatJson,
  validateJson,
} from './convert.js'

export {
  jsonToTypeScript,
  jsonToJava,
  jsonToPython,
  jsonToGo,
} from './codegen.js'

export {
  jsonToXml,
  jsonToYaml,
  jsonToToml,
  jsonToProperties,
} from './format.js'

export {
  chineseToUnicode,
  unicodeToChinese,
  stringToUnicode,
  unicodeToString,
  stringToCodePoints,
  codePointsToString,
  encodeUrl,
  decodeUrl,
  encodeBase64,
  decodeBase64,
} from './unicode.js'
