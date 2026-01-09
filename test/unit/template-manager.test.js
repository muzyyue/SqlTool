import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTemplateManager } from '../../src/composables/useTemplateManager.js'

describe('useTemplateManager - 模板管理模块', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('基本功能', () => {
    it('应该正确初始化模板列表', () => {
      const { initTemplates, templateList, templateCount } = useTemplateManager()

      initTemplates()

      expect(templateCount.value).toBeGreaterThan(0)
      expect(templateList.value.length).toBe(templateCount.value)
    })

    it('应该包含默认模板', () => {
      const { initTemplates, templateList } = useTemplateManager()

      initTemplates()

      const hasStatusTemplate = templateList.value.some((t) => t.name.includes('状态更新'))
      const hasCleanTemplate = templateList.value.some((t) => t.name.includes('数据清理'))

      expect(hasStatusTemplate).toBe(true)
      expect(hasCleanTemplate).toBe(true)
    })
  })

  describe('saveTemplate - 保存模板', () => {
    it('应该能够保存新模板', () => {
      const { initTemplates, saveTemplate } = useTemplateManager()

      initTemplates()

      const newTemplate = {
        name: '测试模板',
        description: '这是一个测试模板',
        rules: [
          {
            fieldName: 'test_field',
            newValue: 'test_value',
            condition: { enabled: false },
          },
        ],
      }

      const saved = saveTemplate(newTemplate)

      expect(saved.id).toBeDefined()
      expect(saved.name).toBe('测试模板')
      expect(saved.createdAt).toBeDefined()
      expect(saved.updatedAt).toBeDefined()
    })

    it('应该能够更新现有模板', () => {
      const { initTemplates, saveTemplate } = useTemplateManager()

      initTemplates()

      const original = saveTemplate({
        name: '原模板',
        description: '原描述',
        rules: [],
      })

      const updated = saveTemplate({
        id: original.id,
        name: '更新后的模板',
        description: '更新后的描述',
        rules: [{ fieldName: 'new_field', newValue: 'new_value' }],
      })

      expect(updated.id).toBe(original.id)
      expect(updated.name).toBe('更新后的模板')
      expect(updated.updatedAt >= original.updatedAt).toBe(true)
    })
  })

  describe('deleteTemplate - 删除模板', () => {
    it('应该能够删除模板', () => {
      const { initTemplates, saveTemplate, deleteTemplate, getTemplateById } = useTemplateManager()

      initTemplates()

      const template = saveTemplate({
        name: '待删除模板',
        rules: [],
      })

      expect(getTemplateById(template.id)).not.toBeUndefined()

      const result = deleteTemplate(template.id)

      expect(result).toBe(true)
      expect(getTemplateById(template.id)).toBeUndefined()
    })

    it('删除不存在的模板应该返回 false', () => {
      const { deleteTemplate } = useTemplateManager()

      const result = deleteTemplate('non_existent_id')

      expect(result).toBe(false)
    })
  })

  describe('duplicateTemplate - 复制模板', () => {
    it('应该能够复制模板', () => {
      const { initTemplates, saveTemplate, duplicateTemplate, templateCount } = useTemplateManager()

      initTemplates()

      const original = saveTemplate({
        name: '原始模板',
        description: '描述',
        rules: [{ fieldName: 'field1', newValue: 'value1' }],
      })

      const countBefore = templateCount.value
      const duplicated = duplicateTemplate(original.id)

      expect(duplicated).not.toBeNull()
      expect(duplicated.id).not.toBe(original.id)
      expect(duplicated.name).toBe('原始模板 (副本)')
      expect(templateCount.value).toBe(countBefore + 1)
    })
  })

  describe('exportTemplate - 导出模板', () => {
    it('应该能够导出模板为 JSON', () => {
      const { initTemplates, saveTemplate, exportTemplate } = useTemplateManager()

      initTemplates()

      const template = saveTemplate({
        name: '导出测试模板',
        description: '测试导出功能',
        rules: [
          {
            fieldName: 'status',
            newValue: 'completed',
            condition: { enabled: true, fieldName: 'old_status', operator: '=', value: 'pending' },
          },
        ],
      })

      const exported = exportTemplate(template.id, 'json')

      expect(exported).not.toBeNull()
      expect(exported.templateName).toBe('导出测试模板')
      expect(exported.rules).toHaveLength(1)
      expect(exported.exportedAt).toBeDefined()
    })
  })

  describe('importTemplate - 导入模板', () => {
    it('应该能够从 JSON 导入模板', () => {
      const { importTemplate } = useTemplateManager()

      const jsonData = {
        templateName: '导入的模板',
        description: '从 JSON 导入的模板',
        rules: [{ fieldName: 'import_field', newValue: 'import_value' }],
      }

      const imported = importTemplate(jsonData)

      expect(imported).not.toBeUndefined()
      expect(imported.name).toBe('导入的模板')
      expect(imported.rules).toHaveLength(1)
    })

    it('应该能够从 JSON 字符串导入模板', () => {
      const { importTemplate } = useTemplateManager()

      const jsonString = JSON.stringify({
        templateName: '字符串导入模板',
        rules: [{ fieldName: 'field', newValue: 'value' }],
      })

      const imported = importTemplate(jsonString)

      expect(imported.name).toBe('字符串导入模板')
    })

    it('导入无效数据应该抛出错误', () => {
      const { importTemplate } = useTemplateManager()

      expect(() => importTemplate({})).toThrow()
      expect(() => importTemplate('invalid json')).toThrow()
    })
  })

  describe('getTemplateById - 获取模板', () => {
    it('应该能够通过 ID 获取模板', () => {
      const { initTemplates, saveTemplate, getTemplateById } = useTemplateManager()

      initTemplates()

      const template = saveTemplate({
        name: '查找测试模板',
        rules: [],
      })

      const found = getTemplateById(template.id)

      expect(found).not.toBeUndefined()
      expect(found.name).toBe('查找测试模板')
    })

    it('查找不存在的模板应该返回 undefined', () => {
      const { getTemplateById } = useTemplateManager()

      const result = getTemplateById('non_existent_id')

      expect(result).toBeUndefined()
    })
  })

  describe('模板列表操作', () => {
    it('clearAllTemplates 应该清空所有模板', () => {
      const { clearAllTemplates, templateCount } = useTemplateManager()

      clearAllTemplates()

      expect(templateCount.value).toBe(0)
    })

    it('resetToDefaultTemplates 应该恢复默认模板', () => {
      const { initTemplates, saveTemplate, resetToDefaultTemplates, templateCount } =
        useTemplateManager()

      initTemplates()
      saveTemplate({ name: '自定义模板', rules: [] })
      const countBefore = templateCount.value

      resetToDefaultTemplates()

      expect(templateCount.value).toBeGreaterThan(0)
      expect(templateCount.value).not.toBe(countBefore)
    })
  })

  describe('模板抽屉控制', () => {
    it('openTemplateDrawer 应该打开抽屉', () => {
      const { openTemplateDrawer, templateDrawerVisible } = useTemplateManager()

      openTemplateDrawer()

      expect(templateDrawerVisible.value).toBe(true)
    })

    it('closeTemplateDrawer 应该关闭抽屉', () => {
      const { openTemplateDrawer, closeTemplateDrawer, templateDrawerVisible } =
        useTemplateManager()

      openTemplateDrawer()
      closeTemplateDrawer()

      expect(templateDrawerVisible.value).toBe(false)
    })
  })
})

describe('useTemplateManager - 模板数据格式', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('模板应该包含必要的字段', () => {
    const { initTemplates, saveTemplate, getTemplateById } = useTemplateManager()

    initTemplates()

    const template = saveTemplate({
      name: '格式测试模板',
      description: '测试模板格式',
      rules: [
        {
          fieldName: 'field1',
          newValue: 'value1',
          condition: {
            enabled: true,
            fieldName: 'cond_field',
            operator: '=',
            value: 'cond_value',
          },
          description: '规则描述',
        },
      ],
    })

    const saved = getTemplateById(template.id)

    expect(saved.id).toBeDefined()
    expect(saved.name).toBe('格式测试模板')
    expect(saved.description).toBe('测试模板格式')
    expect(saved.rules).toHaveLength(1)
    expect(saved.rules[0].fieldName).toBe('field1')
    expect(saved.rules[0].condition.enabled).toBe(true)
    expect(saved.createdAt).toBeDefined()
    expect(saved.updatedAt).toBeDefined()
  })

  it('导出的 JSON 应该包含版本和导出时间', () => {
    const { initTemplates, saveTemplate, exportTemplate } = useTemplateManager()

    initTemplates()

    const template = saveTemplate({
      name: '导出格式测试',
      rules: [],
    })

    const exported = exportTemplate(template.id, 'json')

    expect(exported.version).toBe('1.0')
    expect(exported.exportedAt).toBeDefined()
    expect(new Date(exported.exportedAt).getTime()).not.toBeNaN()
  })
})
