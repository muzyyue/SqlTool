/**
 * 生成跨工作表测试用 Excel 文件
 * 用于测试 Excel 填充工具的跨工作表功能
 */

import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 源数据工作表 - 需要填充数据的表
 * 场景: 订单表需要填充商品分类和价格信息
 */
const sourceSheetData = [
  { 订单号: "ORD001", 商品编码: "A001", 商品名称: "", 商品分类: "", 价格: "", 数量: 10 },
  { 订单号: "ORD002", 商品编码: "A002", 商品名称: "", 商品分类: "", 价格: "", 数量: 5 },
  { 订单号: "ORD003", 商品编码: "A003", 商品名称: "", 商品分类: "", 价格: "", 数量: 8 },
  { 订单号: "ORD004", 商品编码: "B001", 商品名称: "", 商品分类: "", 价格: "", 数量: 15 },
  { 订单号: "ORD005", 商品编码: "B002", 商品名称: "", 商品分类: "", 价格: "", 数量: 20 },
];

/**
 * 查询匹配工作表 - 包含商品信息
 * 用于跨工作表查询匹配
 */
const matchSheetData = [
  { 商品编码: "A001", 商品名称: "苹果", 商品分类: "水果", 价格: 10.5, 库存: 100 },
  { 商品编码: "A002", 商品名称: "香蕉", 商品分类: "水果", 价格: 5.8, 库存: 200 },
  { 商品编码: "A003", 商品名称: "橙子", 商品分类: "水果", 价格: 8.0, 库存: 150 },
  { 商品编码: "B001", 商品名称: "白菜", 商品分类: "蔬菜", 价格: 3.5, 库存: 300 },
  { 商品编码: "B002", 商品名称: "萝卜", 商品分类: "蔬菜", 价格: 2.8, 库存: 250 },
  { 商品编码: "C001", 商品名称: "牛肉", 商品分类: "肉类", 价格: 50.0, 库存: 80 },
  { 商品编码: "C002", 商品名称: "猪肉", 商品分类: "肉类", 价格: 35.0, 库存: 120 },
];

/**
 * 目标工作表 - 用于接收填充结果
 * 初始为空,用于验证跨工作表结果填充功能
 */
const targetSheetData = [
  { 订单号: "", 商品编码: "", 商品名称: "", 商品分类: "", 价格: "", 数量: "" },
];

// 创建工作簿
const wb = XLSX.utils.book_new();

// 添加源数据工作表
const sourceWs = XLSX.utils.json_to_sheet(sourceSheetData);
XLSX.utils.book_append_sheet(wb, sourceWs, "订单表");

// 添加查询匹配工作表
const matchWs = XLSX.utils.json_to_sheet(matchSheetData);
XLSX.utils.book_append_sheet(wb, matchWs, "商品信息表");

// 添加目标工作表
const targetWs = XLSX.utils.json_to_sheet(targetSheetData);
XLSX.utils.book_append_sheet(wb, targetWs, "填充结果表");

// 保存文件
const outputPath = join(__dirname, "test_cross_sheet.xlsx");
XLSX.writeFile(wb, outputPath);

console.log(`✓ 跨工作表测试 Excel 文件已生成：${outputPath}`);
console.log(`\n工作表信息:`);
console.log(`  1. 订单表 - 包含 ${sourceSheetData.length} 条数据`);
console.log(`     字段: ${Object.keys(sourceSheetData[0]).join(", ")}`);
console.log(`  2. 商品信息表 - 包含 ${matchSheetData.length} 条数据`);
console.log(`     字段: ${Object.keys(matchSheetData[0]).join(", ")}`);
console.log(`  3. 填充结果表 - 用于接收填充结果`);
console.log(`\n测试场景说明:`);
console.log(`  1. 跨工作表查询:`);
console.log(`     - 源数据工作表: 订单表`);
console.log(`     - 查询匹配工作表: 商品信息表`);
console.log(`     - 匹配列: 商品编码`);
console.log(`     - 提取列: 商品名称, 商品分类, 价格`);
console.log(`     - 结果填充列: 商品名称, 商品分类, 价格`);
console.log(`  2. 跨工作表结果填充:`);
console.log(`     - 目标工作表: 填充结果表`);
console.log(`     - 填充列: 所有列`);
console.log(`\n预期结果:`);
console.log(`  - 订单表的商品名称、商品分类、价格列被填充`);
console.log(`  - 填充结果表包含完整的订单和商品信息`);
