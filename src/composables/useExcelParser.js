import * as XLSX from 'xlsx'

export function useExcelParser() {
  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target.result
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]

          // 解析为JSON格式，header: 1 表示第一行作为表头
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (jsonData.length < 2) {
            reject(new Error('Excel文件至少需要包含表头和一行数据'))
            return
          }

          const headers = jsonData[0]
          const rows = jsonData.slice(1)

          // 确保所有数据行的长度与表头一致
          const validRows = rows.map(row => {
            // 如果行长度不够，用空字符串填充
            while (row.length < headers.length) {
              row.push('')
            }
            // 如果行长度过长，截断到表头长度
            return row.slice(0, headers.length)
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

          // 调试日志已移除

          resolve({ headers, rows: processedRows })
        } catch (error) {
          reject(new Error('解析Excel文件失败：' + error.message))
        }
      }

      reader.onerror = () => {
        reject(new Error('读取文件失败'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  return { parseExcel }
}
