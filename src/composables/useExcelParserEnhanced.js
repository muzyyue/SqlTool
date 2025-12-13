import * as XLSX from 'xlsx'
import { ref } from 'vue'

/**
 * 增强版Excel解析器
 * 支持大型文件处理、多工作表、进度回调
 */
export function useExcelParserEnhanced() {
  const processingProgress = ref(0)
  const currentWorksheet = ref('')
  const totalRows = ref(0)
  const processedRows = ref(0)

  /**
   * 解析Excel文件
   * @param {File} file - Excel文件
   * @param {Object} options - 解析选项
   * @returns {Promise} 解析结果
   */
  const parseExcel = async (file, options = {}) => {
    resetProgress()

    // 验证文件
    const validationResult = validateFile(file)
    if (!validationResult.valid) {
      throw new Error(validationResult.error)
    }

    // 设置默认选项
    const defaultOptions = {
      sheetIndex: 0, // 默认读取第一个工作表
      maxRows: 10000, // 最大处理行数
      chunkSize: 1000, // 分块大小
      onProgress: null, // 进度回调
      onWorksheetChange: null // 工作表切换回调
    }

    const finalOptions = { ...defaultOptions, ...options }

    try {
      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Excel解析超时，请检查文件格式或尝试重新上传')), 30000)
      })

      // 读取文件
      const workbook = await Promise.race([
        readWorkbook(file),
        timeoutPromise
      ])

      // 获取工作表信息
      const worksheetInfo = getWorksheetInfo(workbook)

      if (worksheetInfo.length === 0) {
        throw new Error('Excel文件中没有找到有效的工作表')
      }

      // 选择工作表
      const selectedSheet = selectWorksheet(workbook, worksheetInfo, finalOptions.sheetIndex)
      currentWorksheet.value = selectedSheet.name

      if (finalOptions.onWorksheetChange) {
        finalOptions.onWorksheetChange(selectedSheet.name)
      }

      // 解析工作表数据
      const result = await parseWorksheet(selectedSheet, finalOptions)

      processingProgress.value = 100

      return result
    } catch (error) {
      console.error('Excel解析失败:', error)

      // 提供更友好的错误信息
      let errorMessage = `Excel文件解析失败: ${error.message}`

      if (error.message.includes('timeout')) {
        errorMessage = '文件解析超时，可能是文件过大或格式异常，请尝试重新上传或使用较小的文件'
      } else if (error.message.includes('格式')) {
        errorMessage = '文件格式不支持，请确保上传的是有效的Excel文件（.xlsx, .xls, .csv）'
      } else if (error.message.includes('工作表')) {
        errorMessage = '未找到有效的工作表数据，请检查Excel文件内容'
      }

      throw new Error(errorMessage)
    }
  }

  /**
   * 验证文件
   */
  const validateFile = (file) => {
    if (!file) {
      return { valid: false, error: '文件对象为空' }
    }

    const fileName = file.name || ''
    const fileExtension = fileName.split('.').pop()?.toLowerCase()

    if (!fileExtension) {
      return { valid: false, error: '无法确定文件类型' }
    }

    const supportedFormats = ['xlsx', 'xls', 'csv']
    if (!supportedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `不支持的文件格式: .${fileExtension}。支持的格式: ${supportedFormats.join(', ')}`
      }
    }

    // 检查文件大小（限制为50MB）
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB > 50MB`
      }
    }

    return { valid: true }
  }

  /**
   * 读取工作簿
   */
  const readWorkbook = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target.result

          const readOptions = {
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false,
            dense: true // 使用密集模式提高性能
          }

          const workbook = XLSX.read(data, readOptions)
          resolve(workbook)
        } catch (error) {
          reject(new Error(`读取Excel工作簿失败: ${error.message}`))
        }
      }

      reader.onerror = (error) => {
        reject(new Error(`文件读取错误: ${error.message}`))
      }

      reader.onabort = () => {
        reject(new Error('文件读取被中断'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 获取工作表信息
   */
  const getWorksheetInfo = (workbook) => {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return []
    }

    return workbook.SheetNames.map((name, index) => {
      const worksheet = workbook.Sheets[name]
      const range = worksheet ? XLSX.utils.decode_range(worksheet['!ref'] || 'A1') : null

      return {
        name,
        index,
        rowCount: range ? range.e.r + 1 : 0,
        columnCount: range ? range.e.c + 1 : 0,
        hasData: worksheet && Object.keys(worksheet).length > 1
      }
    }).filter(sheet => sheet.hasData)
  }

  /**
   * 选择工作表
   */
  const selectWorksheet = (workbook, worksheetInfo, sheetIndex) => {
    const selectedSheet = worksheetInfo[sheetIndex]

    if (!selectedSheet) {
      throw new Error(`工作表索引 ${sheetIndex} 超出范围，共有 ${worksheetInfo.length} 个工作表`)
    }

    return {
      ...selectedSheet,
      worksheet: workbook.Sheets[selectedSheet.name]
    }
  }

  /**
   * 解析工作表数据
   */
  const parseWorksheet = async (selectedSheet, options) => {
    const { worksheet, rowCount, name: sheetName } = selectedSheet

    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 为空`)
    }

    totalRows.value = Math.min(rowCount, options.maxRows)
    processedRows.value = 0

    console.log(`开始解析工作表 "${sheetName}"，共 ${totalRows.value} 行数据`)

    // 分块处理大型文件
    if (totalRows.value > options.chunkSize) {
      return await parseWorksheetChunked(worksheet, totalRows.value, options)
    } else {
      return await parseWorksheetDirect(worksheet, options)
    }
  }

  /**
   * 直接解析工作表（小型文件）
   */
  const parseWorksheetDirect = async (worksheet, options) => {
    const parseOptions = {
      header: 1,
      defval: '',
      raw: true,
      rawNumbers: true,
      blankrows: false // 跳过空行
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, parseOptions)

    if (jsonData.length < 1) {
      throw new Error('工作表中没有数据')
    }

    if (jsonData.length < 2) {
      throw new Error('工作表至少需要包含表头和一行数据')
    }

    processedRows.value = jsonData.length - 1
    processingProgress.value = 100

    return processExcelData(jsonData)
  }

  /**
   * 分块解析工作表（大型文件）
   */
  const parseWorksheetChunked = async (worksheet, totalRows, options) => {
    const chunkSize = options.chunkSize
    const headers = extractHeaders(worksheet)
    const allRows = []

    // 处理表头
    allRows.push(headers)

    // 分块处理数据行
    for (let startRow = 1; startRow < totalRows; startRow += chunkSize) {
      const endRow = Math.min(startRow + chunkSize, totalRows)

      const chunkData = extractChunkData(worksheet, headers.length, startRow, endRow)
      allRows.push(...chunkData)

      processedRows.value = endRow - 1
      processingProgress.value = Math.round((endRow / totalRows) * 100)

      if (options.onProgress) {
        options.onProgress(processingProgress.value)
      }

      // 短暂延迟以避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    return processExcelData(allRows)
  }

  /**
   * 提取表头
   */
  const extractHeaders = (worksheet) => {
    const headers = []
    let col = 0

    while (true) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = worksheet[cellAddress]

      if (!cell) break

      headers.push(cell.v !== undefined ? String(cell.v) : `Column_${col + 1}`)
      col++
    }

    if (headers.length === 0) {
      throw new Error('无法识别表头信息')
    }

    return headers
  }

  /**
   * 提取分块数据
   */
  const extractChunkData = (worksheet, columnCount, startRow, endRow) => {
    const chunkData = []

    for (let row = startRow; row < endRow; row++) {
      const rowData = []
      let hasData = false

      for (let col = 0; col < columnCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = worksheet[cellAddress]

        const value = cell ? (cell.v !== undefined ? cell.v : '') : ''
        rowData.push(value)

        if (value !== '') {
          hasData = true
        }
      }

      // 只添加有数据的行
      if (hasData) {
        chunkData.push(rowData)
      }
    }

    return chunkData
  }

  /**
   * 处理Excel数据
   */
  const processExcelData = (jsonData) => {
    const headers = jsonData[0]
    const rawRows = jsonData.slice(1)

    // 验证表头
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new Error('无法识别表头信息')
    }

    // 标准化数据行
    const standardizedRows = standardizeRows(rawRows, headers.length)

    // 处理一对多关系
    const processedRows = processOneToManyRelations(standardizedRows)

    console.log(`Excel解析完成: ${headers.length} 列, ${processedRows.length} 行`)

    return {
      headers,
      rows: processedRows,
      totalRows: processedRows.length,
      totalColumns: headers.length
    }
  }

  /**
   * 标准化数据行
   */
  const standardizeRows = (rows, headerCount) => {
    return rows.map((row, index) => {
      if (!Array.isArray(row)) {
        console.warn(`第${index + 2}行数据格式异常，已转换为数组`)
        row = Array.isArray(row) ? row : [row]
      }

      // 填充或截断到表头长度
      const standardizedRow = Array(headerCount).fill('')

      for (let i = 0; i < Math.min(row.length, headerCount); i++) {
        standardizedRow[i] = row[i] !== undefined ? row[i] : ''
      }

      return standardizedRow
    })
  }

  /**
   * 处理一对多关系
   */
  const processOneToManyRelations = (rows) => {
    if (rows.length <= 1) return rows

    const processedRows = [rows[0]] // 第一行保持不变

    for (let i = 1; i < rows.length; i++) {
      const currentRow = [...rows[i]]
      const previousRow = processedRows[i - 1]

      // 检查是否为真正的一对多关系行
      const hasAnyValue = currentRow.some(value =>
        value !== '' && value !== null && value !== undefined
      )
      const hasAnyEmpty = currentRow.some(value =>
        value === '' || value === null || value === undefined
      )

      // 如果是真正的一对多关系行，继承上一行的非空值
      if (hasAnyValue && hasAnyEmpty) {
        for (let j = 0; j < currentRow.length; j++) {
          if (currentRow[j] === '' || currentRow[j] === null || currentRow[j] === undefined) {
            currentRow[j] = previousRow[j]
          }
        }
      }

      processedRows.push(currentRow)

      // 添加安全保护，防止无限循环
      if (processedRows.length > rows.length * 2) {
        console.warn('检测到可能的无限循环，终止处理')
        break
      }
    }

    return processedRows
  }

  /**
   * 重置进度
   */
  const resetProgress = () => {
    processingProgress.value = 0
    currentWorksheet.value = ''
    totalRows.value = 0
    processedRows.value = 0
  }

  /**
   * 获取解析进度
   */
  const getProgress = () => {
    return {
      progress: processingProgress.value,
      currentWorksheet: currentWorksheet.value,
      totalRows: totalRows.value,
      processedRows: processedRows.value
    }
  }

  return {
    parseExcel,
    getProgress,
    resetProgress
  }
}
