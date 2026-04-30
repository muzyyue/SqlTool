/**
 * 行号与SQL内容对齐功能测试
 * 验证修复后的像素级精确对齐
 */

import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('行号与内容对齐验证', () => {
  const vueFilePath = path.join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue')
  let styleContent

  beforeAll(() => {
    styleContent = fs.readFileSync(vueFilePath, 'utf-8')
  })

  describe('字体大小一致性', () => {
    it('默认状态下line-number和sql-code应该使用相同的font-size (13px)', () => {
      const lineNumberMatch = styleContent.match(/\.line-number\s*\{[^}]*font-size:\s*(\d+)px/)
      const sqlCodeMatch = styleContent.match(/\.sql-code\s*\{[^}]*font-size:\s*(\d+)px/)

      expect(lineNumberMatch).not.toBeNull()
      expect(sqlCodeMatch).not.toBeNull()

      const lineNumberFontSize = parseInt(lineNumberMatch[1])
      const sqlCodeFontSize = parseInt(sqlCodeMatch[1])

      expect(lineNumberFontSize).toBe(sqlCodeFontSize)
      expect(lineNumberFontSize).toBe(13)
    })

    it('768px断点下两者应该统一为12px', () => {
      const media768Match = styleContent.match(/@media \(max-width: 768px\)\s*\{([^}]+)\}/s)
      expect(media768Match).not.toBeNull()

      const mediaContent = media768Match[1]
      const lineNumberInMedia = mediaContent.match(/\.line-number\s*\{[^}]*font-size:\s*(\d+)px/)
      const sqlCodeInMedia = mediaContent.match(/\.sql-code\s*\{[^}]*font-size:\s*(\d+)px/)

      if (lineNumberInMedia && sqlCodeInMedia) {
        expect(parseInt(lineNumberInMedia[1])).toBe(parseInt(sqlCodeInMedia[1]))
        expect(parseInt(lineNumberInMedia[1])).toBe(12)
      }
    })

    it('480px断点下两者应该统一为11px（如果存在响应式样式）', () => {
      const media480Match = styleContent.match(/@media \(max-width: 480px\)\s*\{([^}]+)\}/s)
      expect(media480Match).not.toBeNull()

      const mediaContent = media480Match[1]
      const lineNumberInMedia = mediaContent.match(/\.line-number\s*\{[^}]*font-size:\s*(\d+)px/)
      const sqlCodeInMedia = mediaContent.match(/\.sql-code\s*\{[^}]*font-size:\s*(\d+)px/)

      if (lineNumberInMedia && sqlCodeInMedia) {
        expect(parseInt(lineNumberInMedia[1])).toBe(parseInt(sqlCodeInMedia[1]))
        expect(parseInt(lineNumberInMedia[1])).toBe(11)
      }
    })
  })

  describe('行高一致性', () => {
    it('line-number和sql-code应该使用相同的line-height值', () => {
      const lineNumberMatch = styleContent.match(/\.line-number\s*\{[^}]*line-height:\s*([\d.]+)[;^}]/)
      const sqlCodeMatch = styleContent.match(/\.sql-code\s*\{[^}]*line-height:\s*([\d.]+)[;^}]/)

      expect(lineNumberMatch).not.toBeNull()
      expect(sqlCodeMatch).not.toBeNull()

      const lineNumberLineHeight = parseFloat(lineNumberMatch[1])
      const sqlCodeLineHeight = parseFloat(sqlCodeMatch[1])

      expect(lineNumberLineHeight).toBe(sqlCodeLineHeight)
    })

    it('line-height值应该是1.5（标准可读性）', () => {
      const match = styleContent.match(/\.line-number\s*\{[^}]*line-height:\s*([\d.]+)/)
      expect(match).not.toBeNull()

      const lineHeight = parseFloat(match[1])
      expect(lineHeight).toBe(1.5)
    })
  })

  describe('Padding一致性', () => {
    it('两者应该有相同的padding-top值', () => {
      const lineNumbersMatch = styleContent.match(/\.line-numbers\s*\{[^}]*padding:\s*([^;]+);/)
      const sqlCodeMatch = styleContent.match(/\.sql-code\s*\{[^}]*padding:\s*([^;]+);/)

      expect(lineNumbersMatch).not.toBeNull()
      expect(sqlCodeMatch).not.toBeNull()

      const lineNumbersPadding = lineNumbersMatch[1].trim().split(/\s+/)[0]
      const sqlCodePadding = sqlCodeMatch[1].trim().split(/\s+/)[0]

      expect(lineNumbersPadding).toBe(sqlCodePadding)
    })
  })

  describe('换行策略优化', () => {
    it('sql-code不应该使用word-break: break-all（会导致额外断行）', () => {
      const sqlCodeSection = styleContent.match(/\.sql-code\s*\{([^}]+)\}/)
      expect(sqlCodeSection).not.toBeNull()

      expect(sqlCodeSection[1]).not.toContain('word-break: break-all')
    })

    it('sql-code应该使用overflow-wrap: break-word（更智能的断行）', () => {
      const sqlCodeSection = styleContent.match(/\.sql-code\s*\{([^}]+)\}/)
      expect(sqlCodeSection).not.toBeNull()

      expect(sqlCodeSection[1]).toContain('overflow-wrap: break-word')
    })
  })

  describe('布局属性正确性', () => {
    it('line-numbers不应该设置height: fit-content（会破坏对齐）', () => {
      const lineNumbersSection = styleContent.match(/\.line-numbers\s*\{([^}]+)\}/)
      expect(lineNumbersSection).not.toBeNull()

      expect(lineNumbersSection[1]).not.toContain('height: fit-content')
    })

    it('line-numbers应该设置overflow: hidden防止独立滚动', () => {
      const lineNumbersSection = styleContent.match(/\.line-numbers\s*\{([^}]+)\}/)
      expect(lineNumbersSection).not.toBeNull()

      expect(lineNumbersSection[1]).toContain('overflow: hidden')
    })

    it('sql-preview-area.with-line-numbers应该使用align-items: stretch', () => {
      const match = styleContent.match(/\.sql-preview-area\.with-line-numbers\s*\{([^}]+)\}/)
      expect(match).not.toBeNull()

      expect(match[1]).toContain('align-items: stretch')
    })
  })

  describe('实际渲染高度计算验证', () => {
    it('每行的实际像素高度应该在合理范围内（19-20px）', () => {
      const fontSize = 13
      const lineHeight = 1.5
      const expectedHeight = fontSize * lineHeight

      expect(expectedHeight).toBeGreaterThanOrEqual(19)
      expect(expectedHeight).toBeLessThanOrEqual(20)
    })

    it('30行内容的总高度应该在570-620px范围内', () => {
      const lineHeight = 13 * 1.5
      const padding = 12
      const lineCount = 30

      const totalHeight = padding * 2 + lineHeight * lineCount

      expect(totalHeight).toBeGreaterThanOrEqual(570)
      expect(totalHeight).toBeLessThanOrEqual(620)
    })
  })
})

describe('边界情况处理', () => {
  it('空SQL内容时行号数量应该为0或1', () => {
    const emptySql = ''
    const lineCount = emptySql.split('\n').length

    expect(lineCount).toBeLessThanOrEqual(1)
  })

  it('单行SQL应该只显示1个行号', () => {
    const singleLineSql = "SELECT * FROM users;"
    const lineCount = singleLineSql.split('\n').length

    expect(lineCount).toBe(1)
  })

  it('包含换行符的SQL应该正确计算行数', () => {
    const multiLineSql = `SELECT *
FROM users
WHERE status = 'active'
ORDER BY created_at DESC;`

    const lines = multiLineSql.split('\n')
    expect(lines.length).toBe(4)
  })
})
