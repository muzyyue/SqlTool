import * as XLSX from "xlsx";
import { ref } from "vue";

/**
 * 增强版Excel解析器
 * 支持大型文件处理、多工作表、进度回调
 */
export function useExcelParserEnhanced() {
  const processingProgress = ref(0);
  const currentWorksheet = ref("");
  const totalRows = ref(0);
  const processedRows = ref(0);

  /**
   * 解析Excel文件
   * @param {File} file - Excel文件
   * @param {Object} options - 解析选项
   * @param {number} options.sheetIndex - 工作表索引，默认0
   * @param {number} options.maxRows - 最大处理行数，默认10000
   * @param {number} options.chunkSize - 分块大小，默认1000
   * @param {Function} options.onProgress - 进度回调
   * @param {Function} options.onWorksheetChange - 工作表切换回调
   * @param {number} options.startRow - 起始行（包含表头为1），默认null表示从第一行开始
   * @param {number} options.endRow - 结束行，默认null表示到最后一行
   * @param {boolean} options.includeHeader - 是否包含表头，默认true
   * @returns {Promise} 解析结果
   */
  const parseExcel = async (
    file,
    options = {}, // 🔧 [v2026.05.11-003] 修复 Dense 模式兼容性问题
  ) => {
    console.log(
      "[✅ useExcelParserEnhanced] 版本 v2026.05.11-003 已加载 - 支持 Dense/Sparse 双模式",
    );
    resetProgress();

    // 防御性检查：确保 options 不是 null/undefined
    if (!options || typeof options !== "object") {
      console.warn("parseExcel: options 参数无效，使用默认配置");
      options = {};
    }

    // 验证文件
    const validationResult = validateFile(file);
    if (!validationResult.valid) {
      throw new Error(validationResult.error);
    }

    // 设置默认选项
    const defaultOptions = {
      sheetIndex: 0, // 默认读取第一个工作表
      maxRows: 10000, // 最大处理行数
      chunkSize: 1000, // 分块大小
      onProgress: null, // 进度回调
      onWorksheetChange: null, // 工作表切换回调
      startRow: null, // 起始行（包含表头为1）
      endRow: null, // 结束行
      includeHeader: true, // 是否包含表头
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(new Error("Excel解析超时，请检查文件格式或尝试重新上传")),
          30000,
        );
      });

      // 读取文件
      const workbook = await Promise.race([readWorkbook(file), timeoutPromise]);

      // 获取工作表信息
      const worksheetInfo = getWorksheetInfo(workbook);

      if (worksheetInfo.length === 0) {
        throw new Error("Excel文件中没有找到有效的工作表");
      }

      // 选择工作表
      const selectedSheet = selectWorksheet(
        workbook,
        worksheetInfo,
        finalOptions.sheetIndex,
      );
      currentWorksheet.value = selectedSheet.name;

      if (finalOptions.onWorksheetChange) {
        finalOptions.onWorksheetChange(selectedSheet.name);
      }

      // 解析工作表数据
      const result = await parseWorksheet(selectedSheet, finalOptions);

      processingProgress.value = 100;

      return result;
    } catch (error) {
      console.error("Excel解析失败:", error);

      // 提供更友好的错误信息
      let errorMessage = `Excel文件解析失败: ${error.message}`;

      if (error.message.includes("timeout")) {
        errorMessage =
          "文件解析超时，可能是文件过大或格式异常，请尝试重新上传或使用较小的文件";
      } else if (error.message.includes("格式")) {
        errorMessage =
          "文件格式不支持，请确保上传的是有效的Excel文件（.xlsx, .xls, .csv）";
      } else if (error.message.includes("工作表")) {
        errorMessage = "未找到有效的工作表数据，请检查Excel文件内容";
      }

      throw new Error(errorMessage);
    }
  };

  /**
   * 验证文件
   */
  const validateFile = (file) => {
    if (!file) {
      return { valid: false, error: "文件对象为空" };
    }

    const fileName = file.name || "";
    const fileExtension = fileName.split(".").pop()?.toLowerCase();

    if (!fileExtension) {
      return { valid: false, error: "无法确定文件类型" };
    }

    const supportedFormats = ["xlsx", "xls", "csv"];
    if (!supportedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `不支持的文件格式: .${fileExtension}。支持的格式: ${supportedFormats.join(", ")}`,
      };
    }

    // 检查文件大小（限制为50MB）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB > 50MB`,
      };
    }

    return { valid: true };
  };

  /**
   * 读取工作簿
   */
  const readWorkbook = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;

          const readOptions = {
            type: "array",
            cellDates: true,
            cellNF: false,
            cellText: false,
            dense: true, // 使用密集模式提高性能
          };

          const workbook = XLSX.read(data, readOptions);
          resolve(workbook);
        } catch (error) {
          reject(new Error(`读取Excel工作簿失败: ${error.message}`));
        }
      };

      reader.onerror = (error) => {
        reject(new Error(`文件读取错误: ${error.message}`));
      };

      reader.onabort = () => {
        reject(new Error("文件读取被中断"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * 获取工作表信息
   */
  const getWorksheetInfo = (workbook) => {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return [];
    }

    return workbook.SheetNames.map((name, index) => {
      const worksheet = workbook.Sheets[name];
      const range = worksheet
        ? XLSX.utils.decode_range(worksheet["!ref"] || "A1")
        : null;

      return {
        name,
        index,
        rowCount: range ? range.e.r + 1 : 0,
        columnCount: range ? range.e.c + 1 : 0,
        hasData: worksheet && Object.keys(worksheet).length > 1,
      };
    }).filter((sheet) => sheet.hasData);
  };

  /**
   * 选择工作表
   */
  const selectWorksheet = (workbook, worksheetInfo, sheetIndex) => {
    const selectedSheet = worksheetInfo[sheetIndex];

    if (!selectedSheet) {
      throw new Error(
        `工作表索引 ${sheetIndex} 超出范围，共有 ${worksheetInfo.length} 个工作表`,
      );
    }

    return {
      ...selectedSheet,
      worksheet: workbook.Sheets[selectedSheet.name],
    };
  };

  /**
   * 解析工作表数据
   * @param {Object} selectedSheet - 选中的工作表对象
   * @param {Object} options - 解析选项
   * @returns {Promise} 解析结果
   */
  const parseWorksheet = async (selectedSheet, options) => {
    const { worksheet, rowCount, name: sheetName } = selectedSheet;

    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 为空`);
    }

    // 验证行范围参数
    const { startRow, endRow } = options;
    const actualStartRow = startRow !== null ? Math.max(1, startRow) : 1;
    const actualEndRow =
      endRow !== null ? Math.min(rowCount, endRow) : rowCount;

    if (actualStartRow > actualEndRow) {
      throw new Error(
        `起始行 (${actualStartRow}) 不能大于结束行 (${actualEndRow})`,
      );
    }

    if (actualStartRow > rowCount) {
      throw new Error(
        `起始行 (${actualStartRow}) 超出文件总行数 (${rowCount})`,
      );
    }

    // 计算实际需要处理的行数
    const rowsToProcess = actualEndRow - actualStartRow + 1;
    totalRows.value = Math.min(rowsToProcess, options.maxRows);
    processedRows.value = 0;

    console.log(`[🔍 parseWorksheet] 工作表 "${sheetName}" 解析参数:`);
    console.log("  - 总行数:", rowCount);
    console.log("  - 选择范围:", actualStartRow, "-", actualEndRow);
    console.log("  - 需处理行数:", rowsToProcess);
    console.log("  - maxRows:", options.maxRows);
    console.log("  - chunkSize:", options.chunkSize);
    console.log("  - totalRows.value:", totalRows.value);

    // 分块处理大型文件
    if (totalRows.value > options.chunkSize) {
      console.log(
        "[🔍 parseWorksheet] 选择分块解析路径 (parseWorksheetChunked)",
      );
      return await parseWorksheetChunked(
        worksheet,
        actualStartRow,
        actualEndRow,
        totalRows.value,
        options.chunkSize,
        options,
      );
    } else {
      console.log(
        "[🔍 parseWorksheet] 选择直接解析路径 (parseWorksheetDirect)",
      );
      return await parseWorksheetDirect(
        worksheet,
        actualStartRow,
        actualEndRow,
        options,
      );
    }
  };

  /**
   * 直接解析工作表（小型文件）
   * @param {Object} worksheet - 工作表对象
   * @param {number} startRow - 起始行（1-based）
   * @param {number} endRow - 结束行（1-based）
   * @param {Object} options - 解析选项
   * @returns {Promise} 解析结果
   */
  const parseWorksheetDirect = async (worksheet, startRow, endRow, options) => {
    // 防御性检查：确保 options 有效
    if (!options || typeof options !== "object") {
      console.warn("parseWorksheetDirect: options 参数无效，使用默认配置");
      options = {};
    }

    const { includeHeader } = options;

    const parseOptions = {
      header: 1,
      defval: "",
      raw: true,
      rawNumbers: true,
      blankrows: false, // 跳过空行
      range:
        startRow === 1 && endRow === null
          ? undefined
          : `${XLSX.utils.encode_cell({ r: startRow - 1, c: 0 })}:${XLSX.utils.encode_cell({ r: endRow - 1, c: 999 })}`, // 指定行范围
    };

    const jsonData = XLSX.utils.sheet_to_json(worksheet, parseOptions);

    console.log("[🔍 parseWorksheetDirect] sheet_to_json 结果:");
    console.log("  - 解析选项:", parseOptions);
    console.log("  - 数据行数:", jsonData.length);
    console.log("  - 前3行数据:", jsonData.slice(0, 3));
    if (jsonData.length > 0) {
      console.log("  - 第一行（表头）:", jsonData[0]);
    }

    if (jsonData.length < 1) {
      throw new Error("工作表中没有数据");
    }

    if (jsonData.length < 2 && includeHeader) {
      throw new Error("工作表至少需要包含表头和一行数据");
    }

    processedRows.value = jsonData.length - (includeHeader ? 1 : 0);
    processingProgress.value = 100;

    return processExcelData(jsonData, includeHeader);
  };

  /**
   * 分块解析工作表（大型文件）
   * @param {Object} worksheet - 工作表对象
   * @param {number} startRow - 起始行（1-based）
   * @param {number} endRow - 结束行（1-based）
   * @param {number} totalRows - 总行数
   * @param {number} chunkSize - 分块大小
   * @param {Object} options - 解析选项
   * @returns {Promise} 解析结果
   */
  const parseWorksheetChunked = async (
    worksheet,
    startRow,
    endRow,
    totalRows,
    chunkSize,
    options,
  ) => {
    // 防御性检查：确保 options 有效
    if (!options || typeof options !== "object") {
      console.warn("parseWorksheetChunked: options 参数无效，使用默认配置");
      options = {};
    }

    const { includeHeader } = options;

    const headers = extractHeaders(worksheet, startRow - 1);
    const allRows = [];

    // 处理表头（如果包含表头）
    if (includeHeader) {
      allRows.push(headers);
    }

    // 计算数据行的起始位置
    const dataStartRow = includeHeader ? startRow : startRow + 1;
    const dataEndRow = includeHeader ? endRow : endRow;

    // 分块处理数据行
    for (let row = dataStartRow; row <= dataEndRow; row += chunkSize) {
      const chunkEndRow = Math.min(row + chunkSize - 1, dataEndRow);

      const chunkData = extractChunkData(
        worksheet,
        headers.length,
        row - 1,
        chunkEndRow - 1,
      );
      allRows.push(...chunkData);

      processedRows.value = chunkEndRow - dataStartRow + 1;
      processingProgress.value = Math.round(
        ((chunkEndRow - dataStartRow + 1) / (dataEndRow - dataStartRow + 1)) *
          100,
      );

      // 使用requestAnimationFrame和更长的延迟以避免阻塞UI，特别是在Win7上
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 10);
        });
      });
    }

    return processExcelData(allRows, includeHeader);
  };

  /**
   * 提取表头
   * @param {Object} worksheet - 工作表对象
   * @param {number} headerRowIndex - 表头所在行索引（0-based），默认0
   * @returns {Array} 表头数组
   */
  const extractHeaders = (worksheet, headerRowIndex = 0) => {
    console.log("[🔍 extractHeaders] 开始提取表头，行索引:", headerRowIndex);
    console.log(
      "[🔍 extractHeaders] worksheet 类型:",
      Array.isArray(worksheet) ? "Dense (二维数组)" : "Sparse (键值对)",
    );
    console.log("[🔍 extractHeaders] worksheet[!ref]:", worksheet["!ref"]);

    const headers = [];
    let col = 0;

    while (true) {
      const cell = getCell(worksheet, headerRowIndex, col);

      console.log(
        `[🔍 extractHeaders] 列 ${col}:`,
        cell ? { v: cell.v, t: cell.t } : "undefined/null",
      );

      if (!cell) break;

      headers.push(cell.v !== undefined ? String(cell.v) : `Column_${col + 1}`);
      col++;
    }

    console.log(
      "[🔍 extractHeaders] 提取结果:",
      headers,
      "长度:",
      headers.length,
    );

    if (headers.length === 0) {
      throw new Error("无法识别表头信息");
    }

    return headers;
  };

  /**
   * 提取分块数据
   */
  const extractChunkData = (worksheet, columnCount, startRow, endRow) => {
    const chunkData = [];

    for (let row = startRow; row <= endRow; row++) {
      const rowData = [];
      let hasData = false;

      for (let col = 0; col < columnCount; col++) {
        const cell = getCell(worksheet, row, col);

        const value = cell ? (cell.v !== undefined ? cell.v : "") : "";
        rowData.push(value);

        if (value !== "") {
          hasData = true;
        }
      }

      // 只添加有数据的行
      if (hasData) {
        chunkData.push(rowData);
      }
    }

    return chunkData;
  };

  /**
   * 找到最后一列有数据的列索引
   * @param {Array} headers - 表头数组
   * @param {Array} rows - 数据行数组
   * @returns {number} 最后一列有数据的列索引
   */
  const findLastNonEmptyColumn = (headers, rows) => {
    // 检查表头，找到最后一列有数据的列索引
    let maxIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header !== "" && header !== null && header !== undefined) {
        maxIndex = i;
      }
    }

    // 如果表头没有数据，检查数据行（只检查前100行，避免遍历所有行）
    if (maxIndex === -1 && rows.length > 0) {
      const checkRows = Math.min(rows.length, 100);
      for (let i = 0; i < checkRows; i++) {
        const row = rows[i];
        if (Array.isArray(row)) {
          for (let j = 0; j < row.length; j++) {
            const value = row[j];
            if (value !== "" && value !== null && value !== undefined) {
              maxIndex = Math.max(maxIndex, j);
            }
          }
        }
      }
    }

    // 如果所有列都为空，至少保留1列
    return maxIndex === -1 ? 0 : maxIndex;
  };

  /**
   * 处理Excel数据
   * @param {Array} jsonData - Excel解析后的JSON数据
   * @param {boolean} includeHeader - 是否包含表头，默认true
   * @returns {Object} 处理后的数据对象
   */
  const processExcelData = (jsonData, includeHeader = true) => {
    console.log("[🔍 processExcelData] 开始处理数据");
    console.log("  - jsonData 长度:", jsonData.length);
    console.log("  - includeHeader:", includeHeader);

    const headers = includeHeader ? jsonData[0] : [];
    const rawRows = includeHeader ? jsonData.slice(1) : jsonData;

    console.log("  - headers:", headers);
    console.log("  - headers 类型:", typeof headers, Array.isArray(headers));
    console.log("  - rawRows 长度:", rawRows.length);

    // 验证表头
    if (includeHeader) {
      if (!headers || !Array.isArray(headers) || headers.length === 0) {
        console.error("[❌ processExcelData] 表头验证失败!");
        console.error("  - headers 值:", headers);
        console.error("  - isArray:", Array.isArray(headers));
        console.error("  - length:", headers ? headers.length : "N/A");
        throw new Error("无法识别表头信息");
      }
    }

    // 找到最后一列有数据的列索引，优化性能
    const maxColumnIndex = findLastNonEmptyColumn(headers, rawRows);

    // 截取到最大列数
    const trimmedHeaders = headers.slice(0, maxColumnIndex + 1);
    const trimmedRows = rawRows.map((row) => row.slice(0, maxColumnIndex + 1));

    // 标准化数据行
    const standardizedRows = standardizeRows(
      trimmedRows,
      trimmedHeaders.length,
    );

    // 处理一对多关系
    const rowsWithInheritance = processOneToManyRelations(standardizedRows);

    // 过滤掉所有值为空的行，避免 Excel 末尾空行生成 SQL
    const processedRows = rowsWithInheritance.filter((row) =>
      row.some((value) => value !== "" && value !== null && value !== undefined),
    );

    console.log(
      `Excel解析完成: ${trimmedHeaders.length} 列, ${processedRows.length} 行`,
    );

    return {
      headers: trimmedHeaders,
      rows: processedRows,
      totalRows: processedRows.length,
      totalColumns: trimmedHeaders.length,
    };
  };

  /**
   * 标准化数据行
   */
  const standardizeRows = (rows, headerCount) => {
    return rows.map((row, index) => {
      if (!Array.isArray(row)) {
        console.warn(`第${index + 2}行数据格式异常，已转换为数组`);
        row = Array.isArray(row) ? row : [row];
      }

      // 填充或截断到表头长度
      const standardizedRow = Array(headerCount).fill("");

      for (let i = 0; i < Math.min(row.length, headerCount); i++) {
        standardizedRow[i] = row[i] !== undefined ? row[i] : "";
      }

      return standardizedRow;
    });
  };

  /**
   * 处理一对多关系
   */
  const processOneToManyRelations = (rows) => {
    if (rows.length <= 1) return rows;

    const processedRows = [rows[0]]; // 第一行保持不变

    for (let i = 1; i < rows.length; i++) {
      const currentRow = [...rows[i]];
      const previousRow = processedRows[i - 1];

      // 检查是否为真正的一对多关系行
      const hasAnyValue = currentRow.some(
        (value) => value !== "" && value !== null && value !== undefined,
      );
      const hasAnyEmpty = currentRow.some(
        (value) => value === "" || value === null || value === undefined,
      );

      // 如果是真正的一对多关系行，继承上一行的非空值
      if (hasAnyValue && hasAnyEmpty) {
        for (let j = 0; j < currentRow.length; j++) {
          if (
            currentRow[j] === "" ||
            currentRow[j] === null ||
            currentRow[j] === undefined
          ) {
            currentRow[j] = previousRow[j];
          }
        }
      }

      processedRows.push(currentRow);

      // 添加安全保护，防止无限循环
      if (processedRows.length > rows.length * 2) {
        console.warn("检测到可能的无限循环，终止处理");
        break;
      }
    }

    return processedRows;
  };

  /**
   * 获取单元格值（兼容 Dense 和 Sparse 两种模式）
   * @param {Object|Array} worksheet - 工作表对象（Dense模式为二维数组，Sparse模式为键值对对象）
   * @param {number} row - 行索引（0-based）
   * @param {number} col - 列索引（0-based）
   * @returns {Object|undefined} 单元格对象或 undefined
   */
  const getCell = (worksheet, row, col) => {
    if (!worksheet) return undefined;

    // 检测是否为 Dense 模式（二维数组）
    if (Array.isArray(worksheet)) {
      const rowData = worksheet[row];
      if (!rowData || !Array.isArray(rowData)) return undefined;
      return rowData[col];
    }

    // Sparse 模式：使用单元格地址作为键
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    return worksheet[cellAddress];
  };

  /**
   * 重置进度
   */
  const resetProgress = () => {
    processingProgress.value = 0;
    currentWorksheet.value = "";
    totalRows.value = 0;
    processedRows.value = 0;
  };

  /**
   * 获取解析进度
   */
  const getProgress = () => {
    return {
      progress: processingProgress.value,
      currentWorksheet: currentWorksheet.value,
      totalRows: totalRows.value,
      processedRows: processedRows.value,
    };
  };

  /**
   * 快速获取表头（只读取第一行，不要求有数据行）
   * @param {File} file - Excel文件
   * @param {Object} options - 解析选项
   * @param {number} options.sheetIndex - 工作表索引，默认0
   * @returns {Promise} 表头数组
   */
  const getHeaders = async (file, options = {}) => {
    resetProgress();

    const defaultOptions = {
      sheetIndex: 0,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("获取表头超时")), 10000);
      });

      const workbook = await Promise.race([readWorkbook(file), timeoutPromise]);

      const worksheetInfo = getWorksheetInfo(workbook);

      if (worksheetInfo.length === 0) {
        throw new Error("Excel文件中没有找到有效的工作表");
      }

      const selectedSheet = selectWorksheet(
        workbook,
        worksheetInfo,
        finalOptions.sheetIndex,
      );
      const worksheet = selectedSheet.worksheet;

      if (!worksheet) {
        throw new Error(`工作表 "${selectedSheet.name}" 为空`);
      }

      // 直接提取第一行作为表头，不使用完整的解析流程
      const headers = [];
      const range = worksheet["!ref"]
        ? XLSX.utils.decode_range(worksheet["!ref"])
        : null;
      const maxCol = range ? range.e.c + 1 : 100;
      const totalRows = range ? range.e.r + 1 : 0;
      const maxRow = Math.min(totalRows, 20); // 检查所有行，最多20行

      console.log(
        "[getHeaders] 工作表范围:",
        range,
        "最大列数:",
        maxCol,
        "总行数:",
        totalRows,
        "最大检查行数:",
        maxRow,
      );

      // 尝试从前10行中找到包含数据的行作为表头
      for (let row = 0; row < maxRow; row++) {
        console.log(`[getHeaders] 尝试第 ${row + 1} 行作为表头`);

        const rowHeaders = [];
        let col = 0;

        while (col < maxCol) {
          const cell = getCell(worksheet, row, col);

          console.log(
            `[getHeaders] 第${row + 1}行列 ${col}:`,
            cell ? { v: cell.v, t: cell.t } : "undefined/null",
          );

          // 参考extractHeaders的逻辑：遇到空单元格就停止
          if (!cell) break;

          // 使用cell.v（原始值），与extractHeaders保持一致
          const value =
            cell.v !== undefined ? String(cell.v) : `Column_${col + 1}`;

          console.log(
            `[getHeaders] 第${row + 1}行列 ${col} 值:`,
            value,
            "(v:",
            cell.v,
            ")",
          );

          rowHeaders.push(value);
          col++;
        }

        console.log(
          `[getHeaders] 第${row + 1}行获取到 ${rowHeaders.length} 个表头:`,
          rowHeaders,
        );

        // 如果这一行有表头数据，使用它
        if (rowHeaders.length > 0) {
          headers.push(...rowHeaders);
          console.log(`[getHeaders] 使用第 ${row + 1} 行作为表头`);
          break;
        }
      }

      console.log("[getHeaders] 最终表头:", headers);

      if (headers.length === 0) {
        // 提供详细的错误信息
        const errorMsg = `无法识别表头信息。工作表有 ${totalRows} 行，但所有行都为空或无效。请检查Excel文件内容。`;
        console.error("[getHeaders]", errorMsg);
        throw new Error(errorMsg);
      }

      processingProgress.value = 100;
      return headers;
    } catch (error) {
      console.error("获取表头失败:", error);
      throw new Error(`获取表头失败: ${error.message}`);
    }
  };

  return {
    parseExcel,
    getHeaders,
    getProgress,
    resetProgress,
  };
}
