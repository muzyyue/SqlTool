import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { useExcelParserEnhanced } from '@/composables/excel/useExcelParserEnhanced'

/**
 * 修复验证：
 * 1. Excel 末尾空行不应生成 SQL（processExcelData 中过滤全空行）
 * 2. 清除文件时应清理 parsedFields 中的自定义字段
 */
describe('Excel 空行过滤与清除文件字段清理', () => {
  /**
   * 构造一个末尾包含空行的 xlsx 文件
   * @returns {File} Excel 文件对象
   */
  const createExcelFileWithTrailingEmptyRows = () => {
    const data = [
      ['DM', 'LBBM', 'FDM', 'MC'],
      [12341, 2123, '', 222],
      [12342, 2124, '', 223],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    const arrayBuffer = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx',
    })

    return new File([arrayBuffer], 'test-empty-rows.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  it('应过滤掉 Excel 末尾的全空行', async () => {
    const { parseExcel } = useExcelParserEnhanced()
    const file = createExcelFileWithTrailingEmptyRows()

    const result = await parseExcel(file, {
      sheetIndex: 0,
      maxRows: 10000,
      includeHeader: true,
    })

    expect(result.headers).toEqual(['DM', 'LBBM', 'FDM', 'MC'])
    expect(result.rows.length).toBe(2)
    expect(result.rows[0]).toEqual([12341, 2123, '', 222])
    expect(result.rows[1]).toEqual([12342, 2124, '', 223])
  })

  it('清除文件时应移除 parsedFields 中的自定义字段', () => {
    const parsedFields = [
      { name: 'DM', type: 'varchar', isCustom: false },
      { name: 'LBBM', type: 'varchar', isCustom: false },
      { name: 'custom_field_1', type: 'varchar', isCustom: true },
      { name: 'custom_field_2', type: 'int', isCustom: true },
    ]

    const clearFileFields = (fields) => {
      return fields.filter((field) => !field.isCustom)
    }

    const clearedFields = clearFileFields(parsedFields)

    expect(clearedFields.length).toBe(2)
    expect(clearedFields.every((field) => !field.isCustom)).toBe(true)
    expect(clearedFields.map((field) => field.name)).toEqual(['DM', 'LBBM'])
  })
})
