/**
 * 动态行号功能测试
 * 验证滚动时行号实时更新的正确性
 */

import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('动态行号功能验证', () => {
  const vueFilePath = path.join(__dirname, '../../src/components/SqlPreview/SqlPreview.vue')
  let scriptContent

  beforeAll(() => {
    const fileContent = fs.readFileSync(vueFilePath, 'utf-8')
    const scriptMatch = fileContent.match(/<script setup>([\s\S]*?)<\/script>/)
    if (scriptMatch) {
      scriptContent = scriptMatch[1]
    }
  })

  describe('核心逻辑实现', () => {
    it('应该存在visibleLineNumbers响应式变量', () => {
      expect(scriptContent).toContain('const visibleLineNumbers = ref([])')
    })

    it('应该存在updateVisibleLineNumbers函数', () => {
      expect(scriptContent).toContain('const updateVisibleLineNumbers')
    })

    it('应该使用LINE_HEIGHT常量定义行高', () => {
      expect(scriptContent).toContain('const LINE_HEIGHT = 19.5')
    })

    it('LINE_HEIGHT值应该等于字体大小(13px)乘以line-height(1.5)', () => {
      const match = scriptContent.match(/LINE_HEIGHT\s*=\s*([\d.]+)/)
      expect(match).not.toBeNull()
      
      const lineHeightValue = parseFloat(match[1])
      expect(lineHeightValue).toBeCloseTo(19.5, 0)
    })
  })

  describe('滚动事件处理', () => {
    it('handleScrollSync函数应该调用updateVisibleLineNumbers', () => {
      expect(scriptContent).toMatch(/handleScrollSync.*\{[\s\S]*?updateVisibleLineNumbers/)
    })

    it('应该使用requestAnimationFrame优化性能', () => {
      expect(scriptContent).toContain('requestAnimationFrame')
    })

    it('应该取消之前的requestAnimationFrame避免重复执行', () => {
      expect(scriptContent).toContain('cancelAnimationFrame(scrollRafId)')
    })
  })

  describe('模板绑定更新', () => {
    const templateMatch = fs.readFileSync(vueFilePath, 'utf-8').match(/<template>([\s\S]*?)<\/template>/)

    it('模板中应该使用visibleLineNumbers而非lineCount进行v-for循环', () => {
      expect(templateMatch[1]).toContain('v-for="n in visibleLineNumbers"')
      expect(templateMatch[1]).not.toContain('v-for="n in lineCount"')
    })
  })

  describe('生命周期集成', () => {
    it('应该在onMounted钩子中初始化可见行号', () => {
      expect(scriptContent).toContain('onMounted(() => {')
      expect(scriptContent).toContain('updateVisibleLineNumbers(0)')
    })

    it('应该使用nextTick确保DOM渲染完成后再计算', () => {
      expect(scriptContent).toMatch(/onMounted[\s\S]*?nextTick/)
    })

    it('应该监听props.sql变化并重新计算行号', () => {
      expect(scriptContent).toContain("() => props.sql")
      expect(scriptContent).toContain('updateVisibleLineNumbers(0)')
    })

    it('应该监听showLineNumbers变化', () => {
      expect(scriptContent).toContain("watch(showLineNumbers, (newValue) => {")
    })
  })

  describe('ResizeObserver支持', () => {
    it('应该使用ResizeObserver监听容器大小变化', () => {
      expect(scriptContent).toContain('ResizeObserver')
    })

    it('应该在组件卸载时断开ResizeObserver连接', () => {
      expect(scriptContent).toContain('resizeObserver.disconnect()')
      expect(scriptContent).toContain('onUnmounted(() => {')
    })
  })
})

describe('行号计算算法验证', () => {
  const LINE_HEIGHT = 19.5

  const calculateVisibleLines = (scrollTop, containerHeight = 400, totalLines = 30) => {
    const visibleLinesCount = Math.ceil(containerHeight / LINE_HEIGHT)
    const startLine = Math.max(1, Math.floor(scrollTop / LINE_HEIGHT) + 1)
    const endLine = Math.min(totalLines, startLine + visibleLinesCount - 1)
    
    if (startLine <= endLine) {
      return Array.from(
        { length: endLine - startLine + 1 },
        (_, i) => startLine + i
      )
    }
    return []
  }

  it('初始状态（scrollTop=0）应该从第1行开始显示', () => {
    const result = calculateVisibleLines(0)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toBe(1)
  })

  it('向下滚动一行后，起始行号应该增加', () => {
    const initialStart = calculateVisibleLines(0)[0]
    const scrolledStart = calculateVisibleLines(LINE_HEIGHT)[0]
    
    expect(scrolledStart).toBeGreaterThan(initialStart)
    expect(scrolledStart).toBe(2)
  })

  it('滚动到中间位置时，行号范围应该正确偏移', () => {
    const result = calculateVisibleLines(LINE_HEIGHT * 10)
    
    expect(result[0]).toBe(11)
    expect(result[result.length - 1]).toBeLessThanOrEqual(30)
  })

  it('不应该显示超过总行数的行号', () => {
    const result = calculateVisibleLines(LINE_HEIGHT * 25, 400, 30)
    
    result.forEach(lineNum => {
      expect(lineNum).toBeLessThanOrEqual(30)
    })
    
    if (result.length > 0) {
      expect(result[result.length - 1]).toBe(30)
    }
  })

  it('可视区域应该能容纳约20-21行（400px / 19.5px）', () => {
    const containerHeight = 400
    const visibleLinesCount = Math.ceil(containerHeight / LINE_HEIGHT)
    
    expect(visibleLinesCount).toBeGreaterThanOrEqual(20)
    expect(visibleLinesCount).toBeLessThanOrEqual(22)
  })

  it('空SQL内容时应该返回空数组', () => {
    const result = calculateVisibleLines(0, 400, 0)
    expect(result).toEqual([])
  })

  it('单行SQL内容时只显示第1行', () => {
    const result = calculateVisibleLines(0, 400, 1)
    expect(result).toEqual([1])
  })

  it('短SQL（<20行）时应该显示所有行号', () => {
    const result = calculateVisibleLines(0, 400, 15)
    
    expect(result.length).toBe(15)
    expect(result[0]).toBe(1)
    expect(result[14]).toBe(15)
  })

  it('长SQL（>100行）时滚动到底部应该显示最后约20行', () => {
    const scrollTop = LINE_HEIGHT * 90 // 滚动到接近底部
    const result = calculateVisibleLines(scrollTop, 400, 100)
    
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(22)
    expect(result[result.length - 1]).toBe(100)
  })
})
