/**
 * SqlPreview 组件滚动同步功能测试
 * 验证行号与代码内容的统一滚动机制
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const vueFilePath = path.join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue')
let fileContent

describe('SqlPreview 滚动同步功能', () => {
  beforeAll(() => {
    fileContent = fs.readFileSync(vueFilePath, 'utf-8')
  })

  describe('模板结构验证', () => {
    it('应该包含SQL预览容器', () => {
      expect(fileContent).toContain('sql-preview-container')
      expect(fileContent).toContain('sql-preview-area')
    })

    it('应该包含行号容器', () => {
      expect(fileContent).toContain('line-numbers')
      expect(fileContent).toContain('line-number')
    })

    it('应该包含代码显示区域', () => {
      expect(fileContent).toContain('sql-code')
    })
  })

  describe('滚动同步机制验证', () => {
    it('应该包含scroll事件处理器', () => {
      expect(fileContent).toContain('handleScrollSync')
      expect(fileContent).toContain('@scroll')
    })

    it('应该使用requestAnimationFrame优化滚动性能', () => {
      expect(fileContent).toContain('requestAnimationFrame')
      expect(fileContent).toContain('cancelAnimationFrame')
    })

    it('行号容器应该使用transform进行位置同步', () => {
      expect(fileContent).toContain("style.transform")
      expect(fileContent).toContain('translateY')
    })

    it('应该计算可见行号范围', () => {
      expect(fileContent).toContain('updateVisibleLineNumbers')
      expect(fileContent).toContain('visibleLineNumbers')
      expect(fileContent).toContain('LINE_HEIGHT')
    })
  })

  describe('CSS布局验证', () => {
    it('flex布局应该使用align-items: stretch确保高度同步', () => {
      expect(fileContent).toContain('align-items: stretch')
    })

    it('行号区域应该设置overflow: hidden防止独立滚动', () => {
      const lineNumbersMatch = fileContent.match(/\.line-numbers\s*\{([^}]+)\}/)
      expect(lineNumbersMatch).not.toBeNull()
      expect(lineNumbersMatch[1]).toContain('overflow: hidden')
    })

    it('预览区域应该设置overflow属性', () => {
      const previewAreaMatch = fileContent.match(/\.sql-preview-area\s*\{([^}]+)\}/s)
      expect(previewAreaMatch).not.toBeNull()
      expect(previewAreaMatch[1]).toContain('overflow:')
    })

    it('行号区域不应该有独立的滚动条样式', () => {
      const lineNumbersSection = fileContent.match(/\.line-numbers\s*\{([^}]+)\}/)
      if (lineNumbersSection) {
        expect(lineNumbersSection[1]).not.toContain('overflow: auto')
        expect(lineNumbersSection[1]).not.toContain('overflow: scroll')
      }
    })
  })

  describe('响应式设计验证', () => {
    it('应该包含768px断点的媒体查询', () => {
      expect(fileContent).toContain('@media (max-width: 768px)')
    })

    it('应该包含480px断点的媒体查询', () => {
      expect(fileContent).toContain('@media (max-width: 480px)')
    })

    it('应该包含1440px大屏媒体查询', () => {
      expect(fileContent).toContain('@media (min-width: 1440px)')
    })

    it('应该优化滚动性能（smooth scroll和touch scrolling）', () => {
      expect(fileContent).toContain('scroll-behavior: smooth')
      expect(fileContent).toContain('-webkit-overflow-scrolling: touch')
    })
  })

  describe('行号显示逻辑验证', () => {
    it('应该支持切换行号显示状态', () => {
      expect(fileContent).toContain('showLineNumbers')
      expect(fileContent).toContain('v-if="showLineNumbers"')
    })

    it('压缩模式下应该禁用行号显示', () => {
      expect(fileContent).toContain(':disabled="isCompressedMode"')
    })

    it('应该监听行号开关变化并更新可见行号', () => {
      expect(fileContent).toContain('watch(showLineNumbers')
    })
  })

  describe('ResizeObserver集成验证', () => {
    it('应该使用ResizeObserver监听容器大小变化', () => {
      expect(fileContent).toContain('ResizeObserver')
    })

    it('组件卸载时应该清理观察器', () => {
      expect(fileContent).toContain('resizeObserver.disconnect()')
    })
  })
})
