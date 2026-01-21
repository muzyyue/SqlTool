<template>
  <div class="excel-fill-page">
    <div class="page-header">
      <h1 class="page-title">Excel 数据填充工具</h1>
      <p class="page-subtitle">将源列数据填充到目标列，支持合并单元格</p>
    </div>

    <div class="content-container">
      <VbenGlassCard title="上传 Excel 文件" class="upload-card">
        <a-upload-dragger
          :file-list="fileList"
          :before-upload="beforeUpload"
          @remove="handleRemove"
          accept=".xlsx,.xlsm"
          :max-count="1"
        >
          <p class="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p class="ant-upload-hint">支持 .xlsx、.xlsm 格式</p>
        </a-upload-dragger>
      </VbenGlassCard>

      <VbenGlassCard title="参数配置" class="config-card" v-if="workbook">
        <a-form :model="config" layout="vertical">
          <a-form-item label="工作表">
            <a-select
              v-model:value="config.sheetName"
              placeholder="选择源工作表"
              @change="handleSheetChange"
            >
              <a-select-option v-for="sheet in sheetNames" :key="sheet" :value="sheet">
                {{ sheet }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="源列">
            <a-select
              v-model:value="config.sourceColumn"
              placeholder="选择源列"
              show-search
              :filter-option="filterOption"
            >
              <a-select-option v-for="col in columns" :key="col.letter" :value="col.letter">
                {{ col.letter }} ({{ col.name }})
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="目标工作表">
            <a-select
              v-model:value="config.targetSheetName"
              placeholder="选择目标工作表"
              @change="handleTargetSheetChange"
            >
              <a-select-option v-for="sheet in sheetNames" :key="sheet" :value="sheet">
                {{ sheet }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="目标列">
            <a-select
              v-model:value="config.targetColumn"
              placeholder="选择目标列"
              show-search
              :filter-option="filterOption"
            >
              <a-select-option v-for="col in targetColumns" :key="col.letter" :value="col.letter">
                {{ col.letter }} ({{ col.name }})
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="数据起始行">
            <a-input-number
              v-model:value="config.startRow"
              :min="1"
              :max="1000"
              placeholder="默认为 2（跳过表头）"
            />
          </a-form-item>

          <a-form-item label="保持合并单元格格式">
            <a-switch v-model:checked="config.keepMergedFormat" />
            <template #extra>
              <span class="hint-text"> 开启后，合并单元格会先解除合并，填充数据后再重新合并 </span>
            </template>
          </a-form-item>
        </a-form>
      </VbenGlassCard>

      <VbenGlassCard title="数据预览" class="preview-card" v-if="workbook">
        <a-table
          :columns="previewColumns"
          :data-source="previewData"
          :pagination="false"
          :scroll="{ x: 'max-content' }"
          bordered
          size="small"
        />
      </VbenGlassCard>

      <div class="action-buttons">
        <a-button
          type="primary"
          size="large"
          :loading="processing"
          :disabled="!canProcess"
          @click="handleProcess"
        >
          <template #icon>
            <PlayCircleOutlined />
          </template>
          开始处理
        </a-button>
        <a-button size="large" :disabled="!workbook" @click="handleReset">
          <template #icon>
            <ReloadOutlined />
          </template>
          重置
        </a-button>
      </div>

      <VbenGlassCard title="处理结果" class="result-card" v-if="result">
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="输入文件">
            {{ result.inputFile }}
          </a-descriptions-item>
          <a-descriptions-item label="输出文件">
            {{ result.outputFile }}
          </a-descriptions-item>
          <a-descriptions-item label="源工作表">
            {{ result.sourceSheetName }}
          </a-descriptions-item>
          <a-descriptions-item label="目标工作表">
            {{ result.targetSheetName }}
          </a-descriptions-item>
          <a-descriptions-item label="源列">
            {{ result.sourceColumn }} (列号: {{ result.sourceColumnNum }})
          </a-descriptions-item>
          <a-descriptions-item label="目标列">
            {{ result.targetColumn }} (列号: {{ result.targetColumnNum }})
          </a-descriptions-item>
          <a-descriptions-item label="数据起始行">
            {{ result.startRow }}
          </a-descriptions-item>
          <a-descriptions-item label="保持合并格式">
            {{ result.keepMergedFormat ? '是' : '否' }}
          </a-descriptions-item>
          <a-descriptions-item label="源列数据总数">
            {{ result.sourceDataCount }}
          </a-descriptions-item>
          <a-descriptions-item label="总处理单元数">
            {{ result.totalCellsProcessed }}
          </a-descriptions-item>
          <a-descriptions-item label="合并单元格数">
            {{ result.mergedCellsProcessed }}
          </a-descriptions-item>
          <a-descriptions-item label="普通单元格数">
            {{ result.normalCellsProcessed }}
          </a-descriptions-item>
          <a-descriptions-item label="成功填充数据">
            {{ result.dataFilledCount }}
          </a-descriptions-item>
          <a-descriptions-item label="跳过的单元数">
            {{ result.skippedCount }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="result-actions">
          <a-button type="primary" @click="handleDownload">
            <template #icon>
              <DownloadOutlined />
            </template>
            下载结果文件
          </a-button>
          <a-button @click="handleReset">
            <template #icon>
              <ReloadOutlined />
            </template>
            重新处理
          </a-button>
        </div>
      </VbenGlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  InboxOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import * as XLSX from 'xlsx'

const fileList = ref([])
const workbook = ref(null)
const worksheet = ref(null)
const targetWorksheet = ref(null)
const sheetNames = ref([])
const columns = ref([])
const targetColumns = ref([])
const previewData = ref([])
const processing = ref(false)
const result = ref(null)
const outputBlob = ref(null)

const config = ref({
  sheetName: '',
  targetSheetName: '',
  sourceColumn: '',
  targetColumn: '',
  startRow: 2,
  keepMergedFormat: true,
})

const canProcess = computed(() => {
  return (
    workbook.value &&
    config.value.sheetName &&
    config.value.targetSheetName &&
    config.value.sourceColumn &&
    config.value.targetColumn
  )
})

const previewColumns = computed(() => {
  if (!columns.value || !columns.value.length) return []
  return columns.value.map((col) => ({
    title: `${col.letter} (${col.name})`,
    dataIndex: col.letter,
    key: col.letter,
    width: 150,
  }))
})

const beforeUpload = (file) => {
  const isExcel =
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xlsm')

  if (!isExcel) {
    message.error('只能上传 Excel 文件！')
    return false
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result)
    const wb = XLSX.read(data, { type: 'array' })

    workbook.value = wb
    sheetNames.value = wb.SheetNames

    if (wb.SheetNames && wb.SheetNames.length > 0) {
      config.value.sheetName = wb.SheetNames[0]
      config.value.targetSheetName = wb.SheetNames[0]
      loadSheet(wb.SheetNames[0])
      loadTargetSheet(wb.SheetNames[0])
    }

    message.success('文件上传成功！')
  }

  reader.readAsArrayBuffer(file)
  fileList.value = [file]

  return false
}

const handleRemove = () => {
  workbook.value = null
  worksheet.value = null
  targetWorksheet.value = null
  sheetNames.value = []
  columns.value = []
  targetColumns.value = []
  previewData.value = []
  result.value = null
  outputBlob.value = null
  fileList.value = []
  config.value = {
    sheetName: '',
    targetSheetName: '',
    sourceColumn: '',
    targetColumn: '',
    startRow: 2,
    keepMergedFormat: true,
  }
}

const loadSheet = (sheetName) => {
  const ws = workbook.value.Sheets[sheetName]
  worksheet.value = ws

  const range = XLSX.utils.decode_range(ws['!ref'])
  const maxCol = range.e.c + 1

  columns.value = []
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i)
    const cellAddress = colLetter + '1'
    const cell = ws[cellAddress]
    const colName = cell ? cell.v : `列${i + 1}`

    columns.value.push({
      letter: colLetter,
      name: colName,
      index: i,
    })
  }

  loadPreview()
}

const loadTargetSheet = (sheetName) => {
  const ws = workbook.value.Sheets[sheetName]
  targetWorksheet.value = ws

  const range = XLSX.utils.decode_range(ws['!ref'])
  const maxCol = range.e.c + 1

  targetColumns.value = []
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i)
    const cellAddress = colLetter + '1'
    const cell = ws[cellAddress]
    const colName = cell ? cell.v : `列${i + 1}`

    targetColumns.value.push({
      letter: colLetter,
      name: colName,
      index: i,
    })
  }
}

const handleSheetChange = (sheetName) => {
  loadSheet(sheetName)
}

const handleTargetSheetChange = (sheetName) => {
  loadTargetSheet(sheetName)
}

const loadPreview = () => {
  if (!worksheet.value) return

  const ws = worksheet.value
  const range = XLSX.utils.decode_range(ws['!ref'])
  const maxRow = Math.min(range.e.r + 1, 10)
  const maxCol = Math.min(range.e.c + 1, 10)

  previewData.value = []
  for (let row = 0; row < maxRow; row++) {
    const rowData = {}
    for (let col = 0; col < maxCol; col++) {
      const colLetter = XLSX.utils.encode_col(col)
      const cellAddress = colLetter + (row + 1)
      const cell = ws[cellAddress]
      rowData[colLetter] = cell ? cell.v : ''
    }
    previewData.value.push(rowData)
  }
}

const filterOption = (input, option) => {
  return option.value.toLowerCase().includes(input.toLowerCase())
}

const handleProcess = async () => {
  if (!canProcess.value) {
    message.warning('请先配置所有参数！')
    return
  }

  processing.value = true

  try {
    const sourceWs = worksheet.value
    const targetWs = targetWorksheet.value

    const sourceColNum =
      columns.value.find((c) => c.letter === config.value.sourceColumn)?.index + 1
    const targetColNum =
      targetColumns.value.find((c) => c.letter === config.value.targetColumn)?.index + 1

    if (!sourceColNum || !targetColNum) {
      throw new Error('无效的列选择')
    }

    const sourceRange = XLSX.utils.decode_range(sourceWs['!ref'])
    const maxSourceRow = sourceRange.e.r + 1

    const sourceData = []
    for (let row = config.value.startRow - 1; row < maxSourceRow; row++) {
      const colLetter = XLSX.utils.encode_col(sourceColNum - 1)
      const cellAddress = colLetter + (row + 1)
      const cell = sourceWs[cellAddress]
      if (cell && cell.v !== undefined && cell.v !== '') {
        sourceData.push(cell.v)
      }
    }

    const merges = targetWs['!merges'] || []
    const targetMergedCells = []
    const targetMergedRows = new Set()

    for (const merge of merges) {
      if (merge.s.c === targetColNum - 1 && merge.e.c === targetColNum - 1) {
        if (merge.e.r >= config.value.startRow - 1) {
          targetMergedCells.push({
            startRow: merge.s.r + 1,
            endRow: merge.e.r + 1,
            range: merge,
          })
          for (let row = merge.s.r; row <= merge.e.r; row++) {
            targetMergedRows.add(row)
          }
        }
      }
    }

    const targetRange = XLSX.utils.decode_range(targetWs['!ref'])
    const maxTargetRow = targetRange.e.r + 1

    const allTargetCells = []

    targetMergedCells.sort((a, b) => a.startRow - b.startRow)
    for (const mergedCell of targetMergedCells) {
      allTargetCells.push({
        type: 'merged',
        startRow: mergedCell.startRow,
        endRow: mergedCell.endRow,
        range: mergedCell.range,
      })
    }

    for (let row = config.value.startRow - 1; row < maxTargetRow; row++) {
      if (!targetMergedRows.has(row)) {
        allTargetCells.push({
          type: 'normal',
          row: row + 1,
        })
      }
    }

    allTargetCells.sort((a, b) => {
      const rowA = a.type === 'merged' ? a.startRow : a.row
      const rowB = b.type === 'merged' ? b.startRow : b.row
      return rowA - rowB
    })

    let dataFilledCount = 0
    let skippedCount = 0

    for (let i = 0; i < allTargetCells.length; i++) {
      if (i < sourceData.length) {
        const value = sourceData[i]
        const cellInfo = allTargetCells[i]

        if (cellInfo.type === 'merged') {
          if (config.value.keepMergedFormat) {
            for (let row = cellInfo.startRow - 1; row < cellInfo.endRow; row++) {
              const colLetter = XLSX.utils.encode_col(targetColNum - 1)
              const cellAddress = colLetter + (row + 1)
              if (!targetWs[cellAddress]) {
                targetWs[cellAddress] = {}
              }
              targetWs[cellAddress].v = value
              targetWs[cellAddress].t = 's'
            }
          } else {
            const colLetter = XLSX.utils.encode_col(targetColNum - 1)
            const cellAddress = colLetter + cellInfo.startRow
            if (!targetWs[cellAddress]) {
              targetWs[cellAddress] = {}
            }
            targetWs[cellAddress].v = value
            targetWs[cellAddress].t = 's'
          }
        } else {
          const colLetter = XLSX.utils.encode_col(targetColNum - 1)
          const cellAddress = colLetter + cellInfo.row
          if (!targetWs[cellAddress]) {
            targetWs[cellAddress] = {}
          }
          targetWs[cellAddress].v = value
          targetWs[cellAddress].t = 's'
        }

        dataFilledCount++
      } else {
        skippedCount++
      }
    }

    const newWb = XLSX.utils.book_new()
    for (const sheetName of sheetNames.value) {
      XLSX.utils.book_append_sheet(newWb, workbook.value.Sheets[sheetName], sheetName)
    }

    const excelBuffer = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' })
    outputBlob.value = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    result.value = {
      inputFile: fileList.value[0]?.name || 'unknown',
      outputFile: `filled_${fileList.value[0]?.name || 'output.xlsx'}`,
      sourceSheetName: config.value.sheetName,
      targetSheetName: config.value.targetSheetName,
      sourceColumn: config.value.sourceColumn,
      sourceColumnNum: sourceColNum,
      targetColumn: config.value.targetColumn,
      targetColumnNum: targetColNum,
      startRow: config.value.startRow,
      keepMergedFormat: config.value.keepMergedFormat,
      sourceDataCount: sourceData.length,
      totalCellsProcessed: allTargetCells.length,
      mergedCellsProcessed: targetMergedCells.length,
      normalCellsProcessed: allTargetCells.length - targetMergedCells.length,
      dataFilledCount,
      skippedCount,
    }

    message.success('处理完成！')
  } catch (error) {
    console.error('处理失败:', error)
    message.error(`处理失败: ${error.message}`)
  } finally {
    processing.value = false
  }
}

const handleDownload = () => {
  if (!outputBlob.value) {
    message.warning('请先处理数据！')
    return
  }

  const url = URL.createObjectURL(outputBlob.value)
  const link = document.createElement('a')
  link.href = url
  link.download = result.value?.outputFile || 'output.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  message.success('文件下载成功！')
}

const handleReset = () => {
  workbook.value = null
  worksheet.value = null
  targetWorksheet.value = null
  sheetNames.value = []
  columns.value = []
  targetColumns.value = []
  previewData.value = []
  result.value = null
  outputBlob.value = null
  fileList.value = []
  config.value = {
    sheetName: '',
    targetSheetName: '',
    sourceColumn: '',
    targetColumn: '',
    startRow: 2,
    keepMergedFormat: true,
  }
  message.info('已重置，可以重新处理')
}
</script>

<style scoped>
.excel-fill-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 16px;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 20px;
  color: #666;
  margin-bottom: 0;
  line-height: 1.6;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.upload-card,
.config-card,
.preview-card,
.result-card {
  padding: 32px;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin: 32px 0;
}

.hint-text {
  font-size: 12px;
  color: #999;
}

.result-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
  justify-content: center;
}

[data-theme='dark'] .excel-fill-page {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

[data-theme='dark'] .page-title {
  color: #60a5fa;
}

[data-theme='dark'] .page-subtitle {
  color: #9ca3af;
}

[data-theme='dark'] .hint-text {
  color: #6b7280;
}

@media (max-width: 1024px) {
  .page-title {
    font-size: 36px;
  }

  .page-subtitle {
    font-size: 18px;
  }

  .upload-card,
  .config-card,
  .preview-card,
  .result-card {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 16px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .result-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .excel-fill-page {
    padding: 20px 15px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-subtitle {
    font-size: 14px;
  }
}
</style>
