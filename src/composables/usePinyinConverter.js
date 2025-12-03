import { pinyin } from 'pinyin-pro'

export function usePinyinConverter() {
  const convertToPinyinFirstLetter = (text) => {
    if (!text) return ''
    
    let result = ''
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      // 判断是否为中文字符
      if (/[\u4e00-\u9fa5]/.test(char)) {
        // 获取拼音首字母并转换为大写
        const firstLetter = pinyin(char, { style: 'firstLetter', type: 'string' })
        result += firstLetter.toUpperCase()
      } else {
        // 非中文字符原样保留
        result += char
      }
    }
    
    return result
  }
  
  const convertHeaders = (headers) => {
    return headers.map(header => convertToPinyinFirstLetter(header))
  }
  
  return { convertToPinyinFirstLetter, convertHeaders }
}
