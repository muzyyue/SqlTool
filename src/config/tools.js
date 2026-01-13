/**
 * 工具配置
 * 定义所有可用的工具及其元数据
 */
export const tools = [
  {
    id: 'excel-fill',
    name: 'Excel 数据填充',
    description: '将源列数据填充到目标列，支持合并单元格',
    icon: 'FileExcelOutlined',
    category: 'data',
    route: '/tools/excelfillpage',
    tags: ['excel', 'fill', 'merge', 'data'],
  },
  {
    id: 'json-format',
    name: 'JSON 格式化',
    description: '格式化和美化 JSON 数据，支持语法高亮和错误检查',
    icon: 'CodeOutlined',
    category: 'data',
    route: '/tools/json-format',
    tags: ['json', 'format', 'beautify'],
  },
  {
    id: 'sql-generator',
    name: 'SQL 生成',
    description: '基于数据快速生成 INSERT、UPDATE 等 SQL 语句',
    icon: 'DatabaseOutlined',
    category: 'database',
    route: '/tools/sql-generator',
    tags: ['sql', 'generator', 'database'],
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    description: '时间戳与日期时间格式相互转换',
    icon: 'ClockCircleOutlined',
    category: 'converter',
    route: '/tools/timestamp',
    tags: ['timestamp', 'date', 'time', 'converter'],
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    description: 'Base64 编码和解码工具',
    icon: 'LockOutlined',
    category: 'converter',
    route: '/tools/base64',
    tags: ['base64', 'encode', 'decode'],
  },
  {
    id: 'url-encode',
    name: 'URL 编解码',
    description: 'URL 编码和解码工具',
    icon: 'LinkOutlined',
    category: 'converter',
    route: '/tools/url-encode',
    tags: ['url', 'encode', 'decode'],
  },
  {
    id: 'md5',
    name: 'MD5 加密',
    description: '计算字符串的 MD5 哈希值',
    icon: 'SafetyCertificateOutlined',
    category: 'security',
    route: '/tools/md5',
    tags: ['md5', 'hash', 'encrypt'],
  },
  {
    id: 'uuid',
    name: 'UUID 生成',
    description: '生成随机 UUID/GUID',
    icon: 'KeyOutlined',
    category: 'generator',
    route: '/tools/uuid',
    tags: ['uuid', 'guid', 'generator'],
  },
  {
    id: 'qr-code',
    name: '二维码生成',
    description: '生成文本或 URL 的二维码',
    icon: 'QrcodeOutlined',
    category: 'generator',
    route: '/tools/qr-code',
    tags: ['qr', 'qrcode', 'generator'],
  },
  {
    id: 'color-picker',
    name: '颜色选择器',
    description: 'HEX、RGB、HSL 颜色格式转换',
    icon: 'BgColorsOutlined',
    category: 'converter',
    route: '/tools/color-picker',
    tags: ['color', 'hex', 'rgb', 'hsl'],
  },
  {
    id: 'regex-tester',
    name: '正则表达式测试',
    description: '在线测试和调试正则表达式',
    icon: 'SearchOutlined',
    category: 'developer',
    route: '/tools/regex-tester',
    tags: ['regex', 'regular', 'expression', 'test'],
  },
]

/**
 * 工具分类
 */
export const categories = [
  { id: 'all', name: '全部', icon: 'AppstoreOutlined' },
  { id: 'data', name: '数据处理', icon: 'FileExcelOutlined' },
  { id: 'database', name: '数据库', icon: 'DatabaseOutlined' },
  { id: 'converter', name: '转换工具', icon: 'SwapOutlined' },
  { id: 'security', name: '安全工具', icon: 'SafetyCertificateOutlined' },
  { id: 'generator', name: '生成器', icon: 'PlusSquareOutlined' },
  { id: 'developer', name: '开发者', icon: 'CodeOutlined' },
]

/**
 * 根据分类过滤工具
 */
export function filterToolsByCategory(categoryId) {
  if (categoryId === 'all') {
    return tools
  }
  return tools.filter((tool) => tool.category === categoryId)
}

/**
 * 根据搜索关键词过滤工具
 */
export function searchTools(keyword) {
  if (!keyword) {
    return tools
  }
  const lowerKeyword = keyword.toLowerCase()
  return tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerKeyword) ||
      tool.description.toLowerCase().includes(lowerKeyword) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword)),
  )
}

/**
 * 获取工具详情
 */
export function getToolById(id) {
  return tools.find((tool) => tool.id === id)
}
