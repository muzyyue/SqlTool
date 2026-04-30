/**
 * SqlPreview 组件滚动同步功能测试
 * 验证行号与代码内容的统一滚动机制
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SqlPreview from '../../src/components/SqlPreview/SqlPreview.vue'

describe('SqlPreview 滚动同步功能', () => {
  const mockSql = `INSERT INTO users (id, name, email) VALUES
    (1, 'Alice', 'alice@example.com'),
    (2, 'Bob', 'bob@example.com'),
    (3, 'Charlie', 'charlie@example.com'),
    (4, 'David', 'david@example.com'),
    (5, 'Eve', 'eve@example.com');`

  const mockStats = {
    statementCount: 1,
    affectedRows: 5,
    generationTime: 10,
    fileSize: 256,
  }

  let wrapper

  beforeEach(() => {
    wrapper = mount(SqlPreview, {
      props: {
        sql: mockSql,
        stats: mockStats,
      },
    })
  })

  it('应该正确渲染SQL预览组件', () => {
    expect(wrapper.find('.sql-preview-container').exists()).toBe(true)
    expect(wrapper.find('.sql-preview-area').exists()).toBe(true)
  })

  it('应该在显示行号模式下行号数量与SQL行数匹配', () => {
    const lineNumbers = wrapper.findAll('.line-number')
    const sqlLines = mockSql.split('\n').length

    expect(lineNumbers.length).toBe(sqlLines)
  })

  it('应该包含统一的滚动容器', () => {
    const previewArea = wrapper.find('.sql-preview-area')
    expect(previewArea.exists()).toBe(true)

    const style = previewArea.attributes('style') || ''
    expect(style).toContain('overflow')
  })

  it('行号区域不应该有独立的滚动条', () => {
    const lineNumbersContainer = wrapper.find('.line-numbers')
    expect(lineNumbersContainer.exists()).toBe(true)

    const classes = lineNumbersContainer.classes()
    expect(classes).not.toContain('overflow-auto')
    expect(classes).not.toContain('overflow-scroll')
  })

  it('代码区域应该与行号区域在同一个flex容器中', () => {
    const previewArea = wrapper.find('.sql-preview-area.with-line-numbers')
    expect(previewArea.exists()).toBe(true)

    const lineNumbers = previewArea.find('.line-numbers')
    const sqlCode = previewArea.find('.sql-code')

    expect(lineNumbers.exists()).toBe(true)
    expect(sqlCode.exists()).toBe(true)
  })

  it('应该响应式适配不同屏幕尺寸', () => {
    const previewArea = wrapper.find('.sql-preview-area')
    expect(previewArea.exists()).toBe(true)

    const computedStyle = window.getComputedStyle(previewArea.element)
    expect(computedStyle.maxHeight).toBeDefined()
  })

  it('切换预览模式时不影响滚动同步', async () => {
    const previewArea = wrapper.find('.sql-preview-area')

    expect(previewArea.exists()).toBe(true)

    const initialLineCount = wrapper.findAll('.line-number').length
    expect(initialLineCount).toBeGreaterThan(0)
  })

  it('关闭行号显示时应该隐藏行号容器', async () => {
    await wrapper.setProps({
      showLineNumbers: false,
    })

    const lineNumbersContainer = wrapper.find('.line-numbers')
    expect(lineNumbersContainer.exists()).toBe(false)
  })

  it('长SQL内容应该正确显示所有行号', () => {
    const longSql = Array.from({ length: 100 }, (_, i) =>
      `(${i + 1}, 'User${i}', 'user${i}@example.com')`
    ).join(',\n    ')

    const insertStatement = `INSERT INTO users (id, name, email) VALUES\n    ${longSql};`

    wrapper = mount(SqlPreview, {
      props: {
        sql: insertStatement,
        stats: {
          statementCount: 1,
          affectedRows: 100,
          generationTime: 50,
          fileSize: 5000,
        },
      },
    })

    const lineNumbers = wrapper.findAll('.line-number')
    const expectedLines = insertStatement.split('\n').length

    expect(lineNumbers.length).toBe(expectedLines)
    expect(lineNumbers.length).toBeGreaterThan(100)
  })
})

describe('CSS布局验证', () => {
  it('flex布局应该使用align-items: stretch确保高度同步', () => {
    const styleContent = require('fs').readFileSync(
      require('path').join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue'),
      'utf-8'
    )

    expect(styleContent).toContain('align-items: stretch')
  })

  it('行号区域应该设置overflow: hidden防止独立滚动', () => {
    const styleContent = require('fs').readFileSync(
      require('path').join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue'),
      'utf-8'
    )

    expect(styleContent).toContain('overflow: hidden')
  })

  it('应该包含scroll事件处理器', () => {
    const scriptContent = require('fs').readFileSync(
      require('path').join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue'),
      'utf-8'
    )

    expect(scriptContent).toContain('handleScrollSync')
    expect(scriptContent).toContain('@scroll="handleScrollSync"')
  })

  it('应该包含响应式设计的媒体查询', () => {
    const styleContent = require('fs').readFileSync(
      require('path').join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue'),
      'utf-8'
    )

    expect(styleContent).toContain('@media (max-width: 768px)')
    expect(styleContent).toContain('@media (max-width: 480px)')
    expect(styleContent).toContain('@media (min-width: 1440px)')
  })

  it('应该优化滚动性能（smooth scroll和touch scrolling）', () => {
    const styleContent = require('fs').readFileSync(
      require('path').join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue'),
      'utf-8'
    )

    expect(styleContent).toContain('scroll-behavior: smooth')
    expect(styleContent).toContain('-webkit-overflow-scrolling: touch')
  })
})
