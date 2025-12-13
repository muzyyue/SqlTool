import * as XLSX from 'xlsx'

export function useExcelParser() {
  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      // 检查文件对象
      if (!file) {
        reject(new Error('文件对象为空'))
        return
      }

      // 检查文件类型
      const fileName = file.name || ''
      const fileExtension = fileName.split('.').pop()?.toLowerCase()
      
      if (!fileExtension) {
        reject(new Error('无法确定文件类型'))
        return
      }

      // 支持的文件格式检查
      const supportedFormats = ['xlsx', 'xls', 'csv']
      if (!supportedFormats.includes(fileExtension)) {
        reject(new Error(`不支持的文件格式: .${fileExtension}。支持的格式: ${supportedFormats.join(', ')}`))
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target.result
          
          // 记录文件大小
          const fileSize = file.size || 0
          console.log(`正在解析文件: ${fileName}, 大小: ${fileSize} bytes, 格式: ${fileExtension}`)
          
          // 根据文件类型确定读取选项
          const readOptions = { 
            type: 'array',
            cellDates: true, // 自动解析日期
            cellNF: false, // 不保留单元格格式
            cellText: false, // 不强制文本格式
            sheet: 0 // 只读取第一个工作表
          }
          
          // 尝试解析工作簿
          let workbook
          try {
            workbook = XLSX.read(data, readOptions)
          } catch (readError) {
            console.error('工作簿解析错误:', readError)
            // 尝试使用更简单的选项重新解析
            try {
              const simpleOptions = { type: 'array' }
              workbook = XLSX.read(data, simpleOptions)
              console.log('使用简化选项成功解析工作簿')
            } catch (simpleError) {
              console.error('简化选项解析也失败:', simpleError)
              reject(new Error(`无法解析Excel工作簿: ${readError.message}`))
              return
            }
          }
          
          // 检查工作表
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('Excel文件中没有找到工作表'))
            return
          }
          
          const firstSheetName = workbook.SheetNames[0]
          console.log(`正在读取工作表: ${firstSheetName}`)
          
          const worksheet = workbook.Sheets[firstSheetName]
          
          // 检查工作表是否为空
          if (!worksheet) {
            reject(new Error(`工作表 "${firstSheetName}" 为空`))
            return
          }
          
          // 尝试不同的解析选项
          const parseOptions = { 
            header: 1, // 第一行作为表头
            defval: '', // 默认值为空字符串
            raw: true, // 保持原始数据类型
            rawNumbers: true // 保持数字格式
          }
          
          // 解析为JSON格式
          let jsonData
          try {
            jsonData = XLSX.utils.sheet_to_json(worksheet, parseOptions)
          } catch (parseError) {
            console.error('数据解析错误:', parseError)
            reject(new Error(`解析工作表数据失败: ${parseError.message}`))
            return
          }
          
          console.log(`解析得到 ${jsonData.length} 行数据`)
          
          // 检查数据是否足够
          if (jsonData.length < 1) {
            reject(new Error('Excel文件中没有数据'))
            return
          }
          
          if (jsonData.length < 2) {
            reject(new Error('Excel文件至少需要包含表头和一行数据'))
            return
          }

          const headers = jsonData[0]
          const rows = jsonData.slice(1)
          
          console.log(`表头: ${JSON.stringify(headers)}`)
          console.log(`数据行数: ${rows.length}`)

          // 验证表头
          if (!headers || !Array.isArray(headers) || headers.length === 0) {
            reject(new Error('无法识别表头信息'))
            return
          }

          // 确保所有数据行的长度与表头一致
          const validRows = rows.map((row, index) => {
            // 检查行数据类型
            if (!Array.isArray(row)) {
              console.warn(`第${index + 2}行数据格式异常，已转换为数组`)
              row = Array.isArray(row) ? row : [row]
            }
            
            // 如果行长度不够，用空字符串填充
            while (row.length < headers.length) {
              row.push('')
            }
            // 如果行长度过长，截断到表头长度
            if (row.length > headers.length) {
              console.warn(`第${index + 2}行数据列数超出表头，已截断`)
              row = row.slice(0, headers.length)
            }
            return row
          })

          // 处理一对多数据，继承上一行的非空值
          const processedRows = [...validRows]

          // 从第二行开始处理，确保可以访问上一行
          for (let index = 1; index < processedRows.length; index++) {
            const currentRow = [...processedRows[index]]
            const previousRow = processedRows[index - 1]

            // 检查当前行是否为真正的一对多关系行
            // 一对多关系行的特征：不是空行（至少有一个非空字段），但也不是完整行（至少有一个空字段）
            const hasAnyValue = currentRow.some(value => value || value === 0 || value === false)
            const hasAnyEmpty = currentRow.some(value => !value && value !== 0 && value !== false)

            // 如果是真正的一对多关系行，继承上一行的非空值
            if (hasAnyValue && hasAnyEmpty) {
              // 遍历每个字段
              for (let i = 0; i < currentRow.length; i++) {
                // 如果当前字段为空，继承上一行的值
                if (!currentRow[i] && currentRow[i] !== 0 && currentRow[i] !== false) {
                  currentRow[i] = previousRow[i]
                }
              }
            }

            processedRows[index] = currentRow
          }

          console.log('Excel文件解析完成')
          resolve({ headers, rows: processedRows })
        } catch (error) {
          console.error('解析Excel文件时发生未预期错误:', error)
          reject(new Error('解析Excel文件失败：' + (error.message || '未知错误')))
        }
      }

      reader.onerror = (error) => {
        console.error('文件读取错误:', error)
        reject(new Error('读取文件失败: ' + (error.message || '未知错误')))
      }
      
      reader.onabort = () => {
        reject(new Error('文件读取被中断'))
      }

      // 根据文件类型使用适当的读取方法
      try {
        reader.readAsArrayBuffer(file)
      } catch (readError) {
        console.error('启动文件读取失败:', readError)
        reject(new Error('无法读取文件: ' + (readError.message || '未知错误')))
      }
    })
  }

  return { parseExcel }
}
