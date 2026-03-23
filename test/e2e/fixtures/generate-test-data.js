/**
 * 生成测试用 Excel 文件
 * 用于 Playwright E2E 测试
 */

import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========================================
// 测试数据 1: UPDATE 页面测试数据
// ========================================
const updateTestData = [
  { id: 1, name: "张三", email: "zhangsan@example.com", age: 25, city: "北京" },
  { id: 2, name: "李四", email: "lisi@example.com", age: 30, city: "上海" },
  { id: 3, name: "王五", email: "wangwu@example.com", age: 28, city: "广州" },
  { id: 4, name: "赵六", email: "zhaoliu@example.com", age: 35, city: "深圳" },
  { id: 5, name: "钱七", email: "qianqi@example.com", age: 22, city: "杭州" },
];

// 创建工作簿
const updateWb = XLSX.utils.book_new();
const updateWs = XLSX.utils.json_to_sheet(updateTestData);
XLSX.utils.book_append_sheet(updateWb, updateWs, "Sheet1");
const updateOutputPath = join(__dirname, "test_update.xlsx");
XLSX.writeFile(updateWb, updateOutputPath);
console.log(`✓ UPDATE 测试 Excel 文件已生成：${updateOutputPath}`);
console.log(`  包含 ${updateTestData.length} 条测试数据`);

// ========================================
// 测试数据 2: Excel 填充页面测试数据（单工作表）
// ========================================
const excelFillData = [
  {
    name: "张三",
    department: "技术部",
    position: "工程师",
    salary: 10000,
    remark: "优秀员工",
  },
  {
    name: "李四",
    department: "销售部",
    position: "销售经理",
    salary: 12000,
    remark: "业绩突出",
  },
  {
    name: "王五",
    department: "技术部",
    position: "高级工程师",
    salary: 15000,
    remark: "项目负责人",
  },
  {
    name: "赵六",
    department: "人事部",
    position: "人事专员",
    salary: 8000,
    remark: "",
  },
  {
    name: "钱七",
    department: "财务部",
    position: "会计",
    salary: 9000,
    remark: "细心负责",
  },
];

const excelFillWb = XLSX.utils.book_new();
const excelFillWs = XLSX.utils.json_to_sheet(excelFillData);
XLSX.utils.book_append_sheet(excelFillWb, excelFillWs, "员工信息");
const excelFillOutputPath = join(__dirname, "test_excel_fill.xlsx");
XLSX.writeFile(excelFillWb, excelFillOutputPath);
console.log(`✓ Excel 填充测试 Excel 文件已生成：${excelFillOutputPath}`);
console.log(`  包含 ${excelFillData.length} 条测试数据`);

// ========================================
// 测试数据 3: Excel 填充页面测试数据（多工作表）
// ========================================
const sourceData = [
  { code: "A001", items: "苹果，香蕉，橙子", category: "水果", price: 10 },
  { code: "A002", items: "白菜，萝卜，土豆", category: "蔬菜", price: 5 },
  { code: "A003", items: "牛肉，羊肉，猪肉", category: "肉类", price: 50 },
];

const targetData = [
  { code: "A001", item: "", category: "", price: "" },
  { code: "A001", item: "", category: "", price: "" },
  { code: "A001", item: "", category: "", price: "" },
  { code: "A002", item: "", category: "", price: "" },
  { code: "A002", item: "", category: "", price: "" },
  { code: "A002", item: "", category: "", price: "" },
  { code: "A003", item: "", category: "", price: "" },
  { code: "A003", item: "", category: "", price: "" },
  { code: "A003", item: "", category: "", price: "" },
];

const multiSheetsWb = XLSX.utils.book_new();
const sourceWs = XLSX.utils.json_to_sheet(sourceData);
const targetWs = XLSX.utils.json_to_sheet(targetData);
XLSX.utils.book_append_sheet(multiSheetsWb, sourceWs, "源数据");
XLSX.utils.book_append_sheet(multiSheetsWb, targetWs, "目标数据");
const multiSheetsOutputPath = join(__dirname, "test_excel_multi_sheets.xlsx");
XLSX.writeFile(multiSheetsWb, multiSheetsOutputPath);
console.log(`✓ 多工作表测试 Excel 文件已生成：${multiSheetsOutputPath}`);
console.log(`  包含 2 个工作表：源数据、目标数据`);

// ========================================
// 测试数据 4: 引号转换测试数据
// ========================================
const quoteConvertData = [
  {
    product: "苹果，香蕉，橙子",
    description: "新鲜水果，进口，优质",
    price: 10.5,
  },
  {
    product: "白菜，萝卜，土豆",
    description: "本地蔬菜，绿色，有机",
    price: 5.8,
  },
  {
    product: "牛肉，羊肉，猪肉",
    description: "冷链配送，新鲜，安全",
    price: 50.0,
  },
];

const quoteConvertWb = XLSX.utils.book_new();
const quoteConvertWs = XLSX.utils.json_to_sheet(quoteConvertData);
XLSX.utils.book_append_sheet(quoteConvertWb, quoteConvertWs, "商品列表");
const quoteConvertOutputPath = join(__dirname, "test_quote_convert.xlsx");
XLSX.writeFile(quoteConvertWb, quoteConvertOutputPath);
console.log(`✓ 引号转换测试 Excel 文件已生成：${quoteConvertOutputPath}`);
console.log(`  包含 ${quoteConvertData.length} 条测试数据`);

console.log("\n✅ 所有测试 Excel 文件生成完成！");
console.log("\n文件列表:");
console.log("  1. test_update.xlsx - UPDATE 页面测试");
console.log("  2. test_excel_fill.xlsx - Excel 填充页面测试（单工作表）");
console.log(
  "  3. test_excel_multi_sheets.xlsx - Excel 填充页面测试（多工作表）",
);
console.log("  4. test_quote_convert.xlsx - 引号转换测试");
