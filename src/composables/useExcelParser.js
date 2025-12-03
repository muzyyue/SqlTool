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
          
          resolve({ headers, rows })
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
