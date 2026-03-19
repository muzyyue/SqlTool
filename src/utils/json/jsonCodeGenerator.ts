/**
 * JSON 代码生成工具模块
 * 提供 JSON 转各编程语言代码的功能
 * @module utils/json/jsonCodeGenerator
 */

import type { CodeGeneratorOptions } from '@/types/json'

/**
 * 语言类型
 */
type Language = CodeGeneratorOptions['language']

/**
 * 生成代码
 * @param data - JSON 数据
 * @param options - 生成选项
 * @returns 生成的代码字符串
 */
export function generateCode(data: unknown, options: CodeGeneratorOptions): string {
  const { language, rootTypeName, useCamelCase, addComments } = options

  const jsonObj = typeof data === 'string' ? JSON.parse(data) : data

  switch (language) {
    case 'typescript':
      return generateTypeScript(jsonObj, rootTypeName, useCamelCase, addComments)
    case 'java':
      return generateJava(jsonObj, rootTypeName, useCamelCase, addComments)
    case 'python':
      return generatePython(jsonObj, rootTypeName, useCamelCase, addComments)
    case 'go':
      return generateGo(jsonObj, rootTypeName, useCamelCase, addComments)
    case 'csharp':
      return generateCSharp(jsonObj, rootTypeName, useCamelCase, addComments)
    case 'kotlin':
      return generateKotlin(jsonObj, rootTypeName, useCamelCase, addComments)
    case 'swift':
      return generateSwift(jsonObj, rootTypeName, useCamelCase, addComments)
    case 'dart':
      return generateDart(jsonObj, rootTypeName, useCamelCase, addComments)
    default:
      throw new Error(`不支持的语言类型: ${language}`)
  }
}

/**
 * 生成 TypeScript 接口定义
 * @param data - JSON 数据
 * @param rootTypeName - 根类型名称
 * @param useCamelCase - 是否使用驼峰命名
 * @param addComments - 是否添加注释
 * @returns TypeScript 代码
 */
function generateTypeScript(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const interfaces: string[] = []
  const processedTypes = new Set<string>()

  generateTypeScriptInterface(data, rootTypeName, interfaces, processedTypes, useCamelCase, addComments)

  return interfaces.join('\n\n')
}

/**
 * 生成 TypeScript 接口
 */
function generateTypeScriptInterface(
  data: unknown,
  typeName: string,
  interfaces: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(typeName)) {
    return
  }
  processedTypes.add(typeName)

  if (data === null || data === undefined) {
    interfaces.push(`export interface ${typeName} {\n  [key: string]: unknown\n}`)
    return
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      interfaces.push(`export type ${typeName} = unknown[]`)
      return
    }
    const firstItem = data[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      const itemTypeName = `${typeName}Item`
      generateTypeScriptInterface(firstItem, itemTypeName, interfaces, processedTypes, useCamelCase, addComments)
      interfaces.push(`export type ${typeName} = ${itemTypeName}[]`)
    } else {
      const itemType = getTypeScriptType(firstItem)
      interfaces.push(`export type ${typeName} = ${itemType}[]`)
    }
    return
  }

  if (typeof data !== 'object') {
    interfaces.push(`export type ${typeName} = ${getTypeScriptType(data)}`)
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const fieldType = getTypeScriptFieldType(value, typeName, key, useCamelCase)
    const comment = addComments ? `  // ${getTypeDescription(value)}\n` : ''

    fields.push(`${comment}  ${fieldName}: ${fieldType}`)
  }

  interfaces.push(`export interface ${typeName} {\n${fields.join('\n')}\n}`)
}

/**
 * 获取 TypeScript 字段类型
 */
function getTypeScriptFieldType(
  value: unknown,
  parentTypeName: string,
  fieldName: string,
  useCamelCase: boolean,
): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      const itemTypeName = `${parentTypeName}${capitalize(fieldName)}Item`
      return `${itemTypeName}[]`
    }
    return `${getTypeScriptType(firstItem)}[]`
  }

  if (typeof value === 'object') {
    const nestedTypeName = `${parentTypeName}${capitalize(fieldName)}`
    return nestedTypeName
  }

  return getTypeScriptType(value)
}

/**
 * 获取 TypeScript 基础类型
 */
function getTypeScriptType(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'unknown'
}

/**
 * 生成 Java 实体类
 * @param data - JSON 数据
 * @param rootTypeName - 根类型名称
 * @param useCamelCase - 是否使用驼峰命名
 * @param addComments - 是否添加注释
 * @returns Java 代码
 */
function generateJava(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const classes: string[] = []
  const processedTypes = new Set<string>()

  generateJavaClass(data, rootTypeName, classes, processedTypes, useCamelCase, addComments)

  return classes.join('\n\n')
}

/**
 * 生成 Java 类
 */
function generateJavaClass(
  data: unknown,
  className: string,
  classes: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(className)) {
    return
  }
  processedTypes.add(className)

  if (data === null || data === undefined || typeof data !== 'object') {
    return
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const itemClassName = `${className}Item`
      generateJavaClass(data[0], itemClassName, classes, processedTypes, useCamelCase, addComments)
    }
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []
  const gettersSetters: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const capitalizedFieldName = capitalize(fieldName)
    const javaType = getJavaType(value, className, fieldName, useCamelCase)
    const comment = addComments ? `    /** ${getTypeDescription(value)} */\n` : ''

    fields.push(`${comment}    private ${javaType} ${fieldName};`)

    gettersSetters.push(`    public ${javaType} get${capitalizedFieldName}() {\n        return ${fieldName};\n    }\n`)
    gettersSetters.push(`    public void set${capitalizedFieldName}(${javaType} ${fieldName}) {\n        this.${fieldName} = ${fieldName};\n    }`)
  }

  const classContent = `import java.io.Serializable;

public class ${className} implements Serializable {
    private static final long serialVersionUID = 1L;

${fields.join('\n')}

${gettersSetters.join('\n')}
}`

  classes.push(classContent)

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedClassName = `${className}${capitalize(Object.keys(obj).find((k) => obj[k] === value) || '')}`
      generateJavaClass(value, nestedClassName, classes, processedTypes, useCamelCase, addComments)
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const itemClassName = `${className}Item`
      generateJavaClass(value[0], itemClassName, classes, processedTypes, useCamelCase, addComments)
    }
  }
}

/**
 * 获取 Java 类型
 */
function getJavaType(value: unknown, className: string, fieldName: string, useCamelCase: boolean): string {
  if (value === null || value === undefined) return 'Object'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value > 2147483647 || value < -2147483648 ? 'Long' : 'Integer'
    }
    return 'Double'
  }
  if (typeof value === 'boolean') return 'Boolean'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<Object>'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return `List<${className}${capitalize(fieldName)}Item>`
    }
    const itemType = getJavaType(firstItem, className, fieldName, useCamelCase)
    return `List<${itemType}>`
  }
  if (typeof value === 'object') {
    return `${className}${capitalize(fieldName)}`
  }
  return 'Object'
}

/**
 * 生成 Python 数据类
 * @param data - JSON 数据
 * @param rootTypeName - 根类型名称
 * @param useCamelCase - 是否使用驼峰命名
 * @param addComments - 是否添加注释
 * @returns Python 代码
 */
function generatePython(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const classes: string[] = []
  const processedTypes = new Set<string>()

  generatePythonClass(data, rootTypeName, classes, processedTypes, useCamelCase, addComments)

  return `from dataclasses import dataclass
from typing import List, Optional, Any

${classes.join('\n\n')}`
}

/**
 * 生成 Python 类
 */
function generatePythonClass(
  data: unknown,
  className: string,
  classes: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(className)) {
    return
  }
  processedTypes.add(className)

  if (data === null || data === undefined || typeof data !== 'object') {
    return
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const itemClassName = `${className}Item`
      generatePythonClass(data[0], itemClassName, classes, processedTypes, useCamelCase, addComments)
    }
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const pythonType = getPythonType(value, className, fieldName, useCamelCase)
    const comment = addComments ? `    # ${getTypeDescription(value)}\n` : ''

    fields.push(`${comment}    ${fieldName}: ${pythonType}`)
  }

  classes.push(`@dataclass
class ${className}:
${fields.join('\n')}`)

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedClassName = `${className}${capitalize(Object.keys(obj).find((k) => obj[k] === value) || '')}`
      generatePythonClass(value, nestedClassName, classes, processedTypes, useCamelCase, addComments)
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const itemClassName = `${className}Item`
      generatePythonClass(value[0], itemClassName, classes, processedTypes, useCamelCase, addComments)
    }
  }
}

/**
 * 获取 Python 类型
 */
function getPythonType(value: unknown, className: string, fieldName: string, useCamelCase: boolean): string {
  if (value === null || value === undefined) return 'Optional[Any]'
  if (typeof value === 'string') return 'str'
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float'
  if (typeof value === 'boolean') return 'bool'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List[Any]'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return `List['${className}${capitalize(fieldName)}Item']`
    }
    const itemType = getPythonType(firstItem, className, fieldName, useCamelCase)
    return `List[${itemType}]`
  }
  if (typeof value === 'object') {
    return `'${className}${capitalize(fieldName)}'`
  }
  return 'Any'
}

/**
 * 生成 Go 结构体
 * @param data - JSON 数据
 * @param rootTypeName - 根类型名称
 * @param useCamelCase - 是否使用驼峰命名
 * @param addComments - 是否添加注释
 * @returns Go 代码
 */
function generateGo(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const structs: string[] = []
  const processedTypes = new Set<string>()

  generateGoStruct(data, rootTypeName, structs, processedTypes, useCamelCase, addComments)

  return structs.join('\n\n')
}

/**
 * 生成 Go 结构体
 */
function generateGoStruct(
  data: unknown,
  typeName: string,
  structs: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(typeName)) {
    return
  }
  processedTypes.add(typeName)

  if (data === null || data === undefined || typeof data !== 'object') {
    return
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const itemTypeName = `${typeName}Item`
      generateGoStruct(data[0], itemTypeName, structs, processedTypes, useCamelCase, addComments)
    }
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const goType = getGoType(value, typeName, fieldName, useCamelCase)
    const jsonTag = key
    const comment = addComments ? `    // ${getTypeDescription(value)}\n` : ''

    fields.push(`${comment}    ${capitalize(fieldName)} ${goType} \`json:"${jsonTag}"\``)
  }

  structs.push(`type ${typeName} struct {
${fields.join('\n')}
}`)

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedTypeName = `${typeName}${capitalize(Object.keys(obj).find((k) => obj[k] === value) || '')}`
      generateGoStruct(value, nestedTypeName, structs, processedTypes, useCamelCase, addComments)
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const itemTypeName = `${typeName}Item`
      generateGoStruct(value[0], itemTypeName, structs, processedTypes, useCamelCase, addComments)
    }
  }
}

/**
 * 获取 Go 类型
 */
function getGoType(value: unknown, typeName: string, fieldName: string, useCamelCase: boolean): string {
  if (value === null || value === undefined) return 'interface{}'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value > 2147483647 || value < -2147483648 ? 'int64' : 'int'
    }
    return 'float64'
  }
  if (typeof value === 'boolean') return 'bool'
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]interface{}'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return `[]${typeName}${capitalize(fieldName)}Item`
    }
    const itemType = getGoType(firstItem, typeName, fieldName, useCamelCase)
    return `[]${itemType}`
  }
  if (typeof value === 'object') {
    return `${typeName}${capitalize(fieldName)}`
  }
  return 'interface{}'
}

/**
 * 生成 C# 类
 * @param data - JSON 数据
 * @param rootTypeName - 根类型名称
 * @param useCamelCase - 是否使用驼峰命名
 * @param addComments - 是否添加注释
 * @returns C# 代码
 */
function generateCSharp(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const classes: string[] = []
  const processedTypes = new Set<string>()

  generateCSharpClass(data, rootTypeName, classes, processedTypes, useCamelCase, addComments)

  return `using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

${classes.join('\n\n')}`
}

/**
 * 生成 C# 类
 */
function generateCSharpClass(
  data: unknown,
  className: string,
  classes: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(className)) {
    return
  }
  processedTypes.add(className)

  if (data === null || data === undefined || typeof data !== 'object') {
    return
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const itemClassName = `${className}Item`
      generateCSharpClass(data[0], itemClassName, classes, processedTypes, useCamelCase, addComments)
    }
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const csharpType = getCSharpType(value, className, fieldName, useCamelCase)
    const comment = addComments ? `        /// <summary>\n        /// ${getTypeDescription(value)}\n        /// </summary>\n` : ''

    fields.push(`${comment}        [JsonPropertyName("${key}")]\n        public ${csharpType} ${capitalize(fieldName)} { get; set; }`)
  }

  classes.push(`public class ${className}
{
${fields.join('\n\n')}
}`)
}

/**
 * 获取 C# 类型
 */
function getCSharpType(value: unknown, className: string, fieldName: string, useCamelCase: boolean): string {
  if (value === null || value === undefined) return 'object'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value > 2147483647 || value < -2147483648 ? 'long' : 'int'
    }
    return 'double'
  }
  if (typeof value === 'boolean') return 'bool'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<object>'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return `List<${className}${capitalize(fieldName)}Item>`
    }
    const itemType = getCSharpType(firstItem, className, fieldName, useCamelCase)
    return `List<${itemType}>`
  }
  if (typeof value === 'object') {
    return `${className}${capitalize(fieldName)}`
  }
  return 'object'
}

/**
 * 生成 Kotlin 数据类
 */
function generateKotlin(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const classes: string[] = []
  const processedTypes = new Set<string>()

  generateKotlinClass(data, rootTypeName, classes, processedTypes, useCamelCase, addComments)

  return `import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

${classes.join('\n\n')}`
}

/**
 * 生成 Kotlin 类
 */
function generateKotlinClass(
  data: unknown,
  className: string,
  classes: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(className)) {
    return
  }
  processedTypes.add(className)

  if (data === null || data === undefined || typeof data !== 'object') {
    return
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const itemClassName = `${className}Item`
      generateKotlinClass(data[0], itemClassName, classes, processedTypes, useCamelCase, addComments)
    }
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const kotlinType = getKotlinType(value, className, fieldName, useCamelCase)
    const comment = addComments ? `    /** ${getTypeDescription(value)} */\n` : ''

    fields.push(`${comment}    @SerialName("${key}")\n    val ${fieldName}: ${kotlinType},`)
  }

  classes.push(`@Serializable
data class ${className}(
${fields.join('\n')}
)`)
}

/**
 * 获取 Kotlin 类型
 */
function getKotlinType(value: unknown, className: string, fieldName: string, useCamelCase: boolean): string {
  if (value === null || value === undefined) return 'Any?'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value > 2147483647 || value < -2147483648 ? 'Long' : 'Int'
    }
    return 'Double'
  }
  if (typeof value === 'boolean') return 'Boolean'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<Any>'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return `List<${className}${capitalize(fieldName)}Item>`
    }
    const itemType = getKotlinType(firstItem, className, fieldName, useCamelCase)
    return `List<${itemType}>`
  }
  if (typeof value === 'object') {
    return `${className}${capitalize(fieldName)}`
  }
  return 'Any'
}

/**
 * 生成 Swift 结构体
 */
function generateSwift(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const structs: string[] = []
  const processedTypes = new Set<string>()

  generateSwiftStruct(data, rootTypeName, structs, processedTypes, useCamelCase, addComments)

  return structs.join('\n\n')
}

/**
 * 生成 Swift 结构体
 */
function generateSwiftStruct(
  data: unknown,
  typeName: string,
  structs: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(typeName)) {
    return
  }
  processedTypes.add(typeName)

  if (data === null || data === undefined || typeof data !== 'object') {
    return
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const itemTypeName = `${typeName}Item`
      generateSwiftStruct(data[0], itemTypeName, structs, processedTypes, useCamelCase, addComments)
    }
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const swiftType = getSwiftType(value, typeName, fieldName, useCamelCase)
    const comment = addComments ? `    /// ${getTypeDescription(value)}\n` : ''

    fields.push(`${comment}    let ${fieldName}: ${swiftType}`)
  }

  structs.push(`struct ${typeName}: Codable {
${fields.join('\n')}
}`)

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedTypeName = `${typeName}${capitalize(Object.keys(obj).find((k) => obj[k] === value) || '')}`
      generateSwiftStruct(value, nestedTypeName, structs, processedTypes, useCamelCase, addComments)
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const itemTypeName = `${typeName}Item`
      generateSwiftStruct(value[0], itemTypeName, structs, processedTypes, useCamelCase, addComments)
    }
  }
}

/**
 * 获取 Swift 类型
 */
function getSwiftType(value: unknown, typeName: string, fieldName: string, useCamelCase: boolean): string {
  if (value === null || value === undefined) return 'Any?'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value > 2147483647 || value < -2147483648 ? 'Int64' : 'Int'
    }
    return 'Double'
  }
  if (typeof value === 'boolean') return 'Bool'
  if (Array.isArray(value)) {
    if (value.length === 0) return '[Any]'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return `[${typeName}${capitalize(fieldName)}Item]`
    }
    const itemType = getSwiftType(firstItem, typeName, fieldName, useCamelCase)
    return `[${itemType}]`
  }
  if (typeof value === 'object') {
    return `${typeName}${capitalize(fieldName)}`
  }
  return 'Any'
}

/**
 * 生成 Dart 模型类
 */
function generateDart(
  data: unknown,
  rootTypeName: string,
  useCamelCase: boolean,
  addComments: boolean,
): string {
  const classes: string[] = []
  const processedTypes = new Set<string>()

  generateDartClass(data, rootTypeName, classes, processedTypes, useCamelCase, addComments)

  return classes.join('\n\n')
}

/**
 * 生成 Dart 类
 */
function generateDartClass(
  data: unknown,
  className: string,
  classes: string[],
  processedTypes: Set<string>,
  useCamelCase: boolean,
  addComments: boolean,
): void {
  if (processedTypes.has(className)) {
    return
  }
  processedTypes.add(className)

  if (data === null || data === undefined || typeof data !== 'object') {
    return
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const itemClassName = `${className}Item`
      generateDartClass(data[0], itemClassName, classes, processedTypes, useCamelCase, addComments)
    }
    return
  }

  const obj = data as Record<string, unknown>
  const fields: string[] = []
  const fromJsonLines: string[] = []
  const toJsonLines: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = useCamelCase ? toCamelCase(key) : key
    const dartType = getDartType(value, className, fieldName, useCamelCase)
    const comment = addComments ? `  /// ${getTypeDescription(value)}\n` : ''

    fields.push(`${comment}  final ${dartType} ${fieldName};`)

    fromJsonLines.push(`      ${fieldName}: json['${key}'] as ${dartType},`)
    toJsonLines.push(`      '${key}': ${fieldName},`)
  }

  classes.push(`class ${className} {
${fields.join('\n')}

  ${className}({
${fields.map((f) => `    ${f.replace('final ', 'required this.')}`).join('\n')}
  });

  factory ${className}.fromJson(Map<String, dynamic> json) {
    return ${className}(
${fromJsonLines.join('\n')}
    );
  }

  Map<String, dynamic> toJson() {
    return {
${toJsonLines.join('\n')}
    };
  }
}`)
}

/**
 * 获取 Dart 类型
 */
function getDartType(value: unknown, className: string, fieldName: string, useCamelCase: boolean): string {
  if (value === null || value === undefined) return 'dynamic'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value > 2147483647 || value < -2147483648 ? 'int' : 'int'
    }
    return 'double'
  }
  if (typeof value === 'boolean') return 'bool'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<dynamic>'
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return `List<${className}${capitalize(fieldName)}Item>`
    }
    const itemType = getDartType(firstItem, className, fieldName, useCamelCase)
    return `List<${itemType}>`
  }
  if (typeof value === 'object') {
    return `${className}${capitalize(fieldName)}`
  }
  return 'dynamic'
}

/**
 * 获取类型描述
 */
function getTypeDescription(value: unknown): string {
  if (value === null) return 'null 值'
  if (value === undefined) return '未定义值'
  if (typeof value === 'string') return '字符串类型'
  if (typeof value === 'number') return '数字类型'
  if (typeof value === 'boolean') return '布尔类型'
  if (Array.isArray(value)) return '数组类型'
  if (typeof value === 'object') return '对象类型'
  return '未知类型'
}

/**
 * 转换为驼峰命名
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase())
}

/**
 * 首字母大写
 */
function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
