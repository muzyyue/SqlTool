/**
 * 文件上传工具
 * 提供文件验证、类型检测和大小检查功能
 */

/**
 * 支持的Excel文件类型
 */
export const SUPPORTED_EXCEL_TYPES = ["xlsx", "xls", "csv"] as const;

/**
 * 文件验证结果接口
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

/**
 * 文件上传选项接口
 */
export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: readonly string[];
  maxFileNameLength?: number;
}

/**
 * 获取文件扩展名
 * @param {string} fileName - 文件名
 * @returns {string} 扩展名（小写，不含点）
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
};

/**
 * 检测文件类型是否支持
 * @param {string} fileName - 文件名
 * @returns {boolean} 是否支持
 */
export const isFileTypeSupported = (fileName: string): boolean => {
  const extension = getFileExtension(fileName);
  return SUPPORTED_EXCEL_TYPES.includes(extension as any);
};

/**
 * 验证文件
 * @param {File} file - 文件对象
 * @param {UploadOptions} options - 上传选项
 * @returns {FileValidationResult} 验证结果
 */
export const validateFile = (
  file: File,
  options: UploadOptions = {},
): FileValidationResult => {
  const maxSize = options.maxSize ?? 50 * 1024 * 1024;
  const allowedTypes = options.allowedTypes ?? SUPPORTED_EXCEL_TYPES;
  const maxFileNameLength = options.maxFileNameLength ?? 255;

  const fileInfo = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension: getFileExtension(file.name),
  };

  if (!file.name || file.name.trim() === "") {
    return {
      valid: false,
      error: "文件名不能为空",
      fileInfo,
    };
  }

  if (file.name.length > maxFileNameLength) {
    return {
      valid: false,
      error: `文件名长度不能超过 ${maxFileNameLength} 个字符`,
      fileInfo,
    };
  }

  const extension = getFileExtension(file.name);
  if (!allowedTypes.includes(extension as any)) {
    return {
      valid: false,
      error: `不支持的文件类型。当前支持: ${allowedTypes.join(", ")}`,
      fileInfo,
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `文件大小不能超过 ${maxSizeMB} MB`,
      fileInfo,
    };
  }

  return {
    valid: true,
    fileInfo,
  };
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 获取文件MIME类型
 * @param {string} fileName - 文件名
 * @returns {string} MIME类型
 */
export const getFileMimeType = (fileName: string): string => {
  const extension = getFileExtension(fileName);

  const mimeTypes: Record<string, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
  };

  return mimeTypes[extension] || "application/octet-stream";
};
