/**
 * JSON 代码生成工具模块单元测试
 * @module test/unit/json/jsonCodeGenerator.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateCode } from '@/utils/json/jsonCodeGenerator'
import type { CodeGeneratorOptions } from '@/types/json'
import {
  createSimpleJson,
  createNestedJson,
  createArrayJson,
  createTimer,
  TEST_CONSTANTS,
} from '../../utils/json-test-helpers'

describe('JSON 代码生成工具模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultOptions: CodeGeneratorOptions = {
    language: 'typescript',
    rootTypeName: 'RootType',
    useCamelCase: false,
    addComments: false,
  }

  describe('TypeScript 代码生成', () => {
    it('TS-001: 应该正确生成简单对象的interface', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('export interface RootType')
      expect(result).toContain('name: string')
      expect(result).toContain('age: number')
    })

    it('TS-002: 应该正确生成嵌套对象的interface', () => {
      const input = { user: { profile: { name: '张三' } } }
      const result = generateCode(input, { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('export interface RootType')
      expect(result).toContain('user: RootTypeUser')
    })

    it('TS-003: 应该正确生成数组类型', () => {
      const input = { users: [{ name: '张三' }] }
      const result = generateCode(input, { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('RootTypeUsersItem[]')
    })

    it('TS-004: 应该正确处理空数组', () => {
      const input = { items: [] }
      const result = generateCode(input, { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('unknown[]')
    })

    it('TS-005: 应该支持驼峰命名转换', () => {
      const input = { user_name: '张三' }
      const result = generateCode(input, {
        ...defaultOptions,
        language: 'typescript',
        useCamelCase: true,
      })

      expect(result).toContain('userName: string')
    })

    it('TS-006: 应该支持添加注释', () => {
      const input = { name: '张三' }
      const result = generateCode(input, {
        ...defaultOptions,
        language: 'typescript',
        addComments: true,
      })

      expect(result).toContain('// 字符串类型')
    })

    it('TS-007: 应该正确处理null值', () => {
      const input = { value: null }
      const result = generateCode(input, { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('value: null')
    })

    it('TS-008: 应该正确处理多种类型字段', () => {
      const input = {
        str: 'a',
        num: 1,
        bool: true,
        nil: null,
      }
      const result = generateCode(input, { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('str: string')
      expect(result).toContain('num: number')
      expect(result).toContain('bool: boolean')
      expect(result).toContain('nil: null')
    })
  })

  describe('Java 代码生成', () => {
    it('JAVA-001: 应该正确生成简单类', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'java' })

      expect(result).toContain('public class RootType')
      expect(result).toContain('private String name')
      expect(result).toContain('private Integer age')
    })

    it('JAVA-002: 应该正确生成嵌套类', () => {
      const input = { user: { name: '张三' } }
      const result = generateCode(input, { ...defaultOptions, language: 'java' })

      expect(result).toContain('public class RootType')
      expect(result).toContain('public class RootTypeUser')
    })

    it('JAVA-003: 应该正确生成List类型', () => {
      const input = { users: [{ name: '张三' }] }
      const result = generateCode(input, { ...defaultOptions, language: 'java' })

      expect(result).toContain('List<RootTypeUsersItem>')
    })

    it('JAVA-004: 应该正确判断整数类型', () => {
      const input = { small: 100, big: 3000000000 }
      const result = generateCode(input, { ...defaultOptions, language: 'java' })

      expect(result).toContain('private Integer small')
      expect(result).toContain('private Long big')
    })

    it('JAVA-005: 应该正确判断浮点类型', () => {
      const input = { price: 3.14 }
      const result = generateCode(input, { ...defaultOptions, language: 'java' })

      expect(result).toContain('private Double price')
    })

    it('JAVA-006: 应该生成getter和setter方法', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'java' })

      expect(result).toContain('public String getName()')
      expect(result).toContain('public void setName(String name)')
    })

    it('应该实现Serializable接口', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'java' })

      expect(result).toContain('implements Serializable')
    })
  })

  describe('Python 代码生成', () => {
    it('PY-001: 应该正确生成简单数据类', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'python' })

      expect(result).toContain('@dataclass')
      expect(result).toContain('class RootType:')
      expect(result).toContain('name: str')
      expect(result).toContain('age: int')
    })

    it('PY-002: 应该正确生成类型注解', () => {
      const input = { name: '张三', age: 25, active: true }
      const result = generateCode(input, { ...defaultOptions, language: 'python' })

      expect(result).toContain('name: str')
      expect(result).toContain('age: int')
      expect(result).toContain('active: bool')
    })

    it('PY-003: 应该正确生成List类型', () => {
      const input = { items: [1, 2, 3] }
      const result = generateCode(input, { ...defaultOptions, language: 'python' })

      expect(result).toContain('items: List[int]')
    })

    it('PY-004: 应该正确处理null值', () => {
      const input = { value: null }
      const result = generateCode(input, { ...defaultOptions, language: 'python' })

      expect(result).toContain('Optional[Any]')
    })

    it('应该导入必要的模块', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'python' })

      expect(result).toContain('from dataclasses import dataclass')
      expect(result).toContain('from typing import List, Optional, Any')
    })
  })

  describe('Go 代码生成', () => {
    it('GO-001: 应该正确生成简单结构体', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'go' })

      expect(result).toContain('type RootType struct {')
      expect(result).toContain('Name string')
      expect(result).toContain('Age int')
    })

    it('GO-002: 应该生成正确的JSON标签', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'go' })

      expect(result).toContain('`json:"name"`')
    })

    it('GO-003: 应该正确生成切片类型', () => {
      const input = { items: [1, 2, 3] }
      const result = generateCode(input, { ...defaultOptions, language: 'go' })

      expect(result).toContain('[]int')
    })

    it('GO-004: 应该正确处理null值', () => {
      const input = { value: null }
      const result = generateCode(input, { ...defaultOptions, language: 'go' })

      expect(result).toContain('interface{}')
    })

    it('应该正确处理大整数', () => {
      const input = { big: 3000000000 }
      const result = generateCode(input, { ...defaultOptions, language: 'go' })

      expect(result).toContain('int64')
    })
  })

  describe('C# 代码生成', () => {
    it('CS-001: 应该正确生成简单类', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'csharp' })

      expect(result).toContain('public class RootType')
      expect(result).toContain('public string Name')
      expect(result).toContain('public int Age')
    })

    it('CS-002: 应该生成JsonPropertyName特性', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'csharp' })

      expect(result).toContain('[JsonPropertyName("name")]')
    })

    it('CS-003: 应该正确生成List类型', () => {
      const input = { items: [1, 2, 3] }
      const result = generateCode(input, { ...defaultOptions, language: 'csharp' })

      expect(result).toContain('List<int>')
    })

    it('CS-004: 应该使用自动属性语法', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'csharp' })

      expect(result).toContain('{ get; set; }')
    })

    it('应该导入必要的命名空间', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'csharp' })

      expect(result).toContain('using System;')
      expect(result).toContain('using System.Collections.Generic;')
      expect(result).toContain('using System.Text.Json.Serialization;')
    })
  })

  describe('Kotlin 代码生成', () => {
    it('KOT-001: 应该正确生成数据类', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'kotlin' })

      expect(result).toContain('@Serializable')
      expect(result).toContain('data class RootType(')
      expect(result).toContain('val name: String')
      expect(result).toContain('val age: Int')
    })

    it('应该生成SerialName注解', () => {
      const input = { user_name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'kotlin' })

      expect(result).toContain('@SerialName("user_name")')
    })

    it('应该导入必要的包', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'kotlin' })

      expect(result).toContain('import kotlinx.serialization.Serializable')
      expect(result).toContain('import kotlinx.serialization.SerialName')
    })
  })

  describe('Swift 代码生成', () => {
    it('SWI-001: 应该正确生成结构体', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'swift' })

      expect(result).toContain('struct RootType: Codable {')
      expect(result).toContain('let name: String')
      expect(result).toContain('let age: Int')
    })

    it('应该正确处理可选类型', () => {
      const input = { value: null }
      const result = generateCode(input, { ...defaultOptions, language: 'swift' })

      expect(result).toContain('Any?')
    })
  })

  describe('Dart 代码生成', () => {
    it('DAR-001: 应该正确生成类', () => {
      const input = { name: '张三', age: 25 }
      const result = generateCode(input, { ...defaultOptions, language: 'dart' })

      expect(result).toContain('class RootType {')
      expect(result).toContain('final String name')
      expect(result).toContain('final int age')
    })

    it('应该生成fromJson工厂方法', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'dart' })

      expect(result).toContain('factory RootType.fromJson(Map<String, dynamic> json)')
    })

    it('应该生成toJson方法', () => {
      const input = { name: '张三' }
      const result = generateCode(input, { ...defaultOptions, language: 'dart' })

      expect(result).toContain('Map<String, dynamic> toJson()')
    })
  })

  describe('错误处理', () => {
    it('应该在传入不支持的语言时抛出错误', () => {
      const input = { name: '张三' }

      expect(() =>
        generateCode(input, { ...defaultOptions, language: 'unsupported' as any }),
      ).toThrow('不支持的语言类型')
    })

    it('应该在传入无效JSON字符串时抛出错误', () => {
      expect(() =>
        generateCode('{invalid}', { ...defaultOptions, language: 'typescript' }),
      ).toThrow()
    })
  })

  describe('性能测试', () => {
    it('应该在500ms内生成TypeScript代码', () => {
      const timer = createTimer()
      const input = createNestedJson(5)

      timer.start()
      generateCode(input, { ...defaultOptions, language: 'typescript' })
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })

    it('应该在500ms内生成Java代码', () => {
      const timer = createTimer()
      const input = createArrayJson(100)

      timer.start()
      generateCode(input, { ...defaultOptions, language: 'java' })
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })
  })

  describe('边界条件', () => {
    it('应该正确处理空对象', () => {
      const result = generateCode({}, { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('export interface RootType')
    })

    it('应该正确处理空数组', () => {
      const result = generateCode([], { ...defaultOptions, language: 'typescript' })

      expect(result).toContain('unknown[]')
    })

    it('应该正确处理null输入', () => {
      const result = generateCode(null, { ...defaultOptions, language: 'typescript' })

      expect(result).toBeDefined()
    })

    it('应该正确处理深层嵌套', () => {
      const input = createNestedJson(10)
      const result = generateCode(input, { ...defaultOptions, language: 'typescript' })

      expect(result).toBeDefined()
      expect(result).toContain('export interface')
    })
  })
})
