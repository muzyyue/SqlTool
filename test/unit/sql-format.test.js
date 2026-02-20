import { describe, it, expect } from 'vitest'

describe('SQL格式化测试', () => {
  const SQL_KEYWORDS = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'VALUES', 'INTO', 'AND', 'OR', 'NOT', 'NULL', 'SET'
  ]

  const TOKEN_TYPES = {
    KEYWORD: 'keyword',
    STRING: 'string',
    NUMBER: 'number',
    COMMENT: 'comment',
    TABLE: 'table',
    COLUMN: 'column',
    OPERATOR: 'operator',
    PUNCTUATION: 'punctuation',
    IDENTIFIER: 'identifier',
  }

  function parse(sql) {
    if (!sql) return []

    const tokens = []
    let i = 0
    const length = sql.length
    const keywords = new Set(SQL_KEYWORDS.map((k) => k.toUpperCase()))

    while (i < length) {
      const char = sql[i]

      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        let whitespaceEnd = i
        while (whitespaceEnd < length && (sql[whitespaceEnd] === ' ' || sql[whitespaceEnd] === '\t' || sql[whitespaceEnd] === '\n' || sql[whitespaceEnd] === '\r')) {
          whitespaceEnd++
        }
        tokens.push({
          type: 'whitespace',
          value: sql.slice(i, whitespaceEnd),
          start: i,
          end: whitespaceEnd,
        })
        i = whitespaceEnd
        continue
      }

      if (char === "'") {
        let end = i + 1
        let escaped = false
        while (end < length) {
          if (escaped) {
            escaped = false
          } else if (sql[end] === '\\') {
            escaped = true
          } else if (sql[end] === "'") {
            end++
            break
          }
          end++
        }
        tokens.push({
          type: TOKEN_TYPES.STRING,
          value: sql.slice(i, end),
          start: i,
          end: end,
        })
        i = end
        continue
      }

      if (char >= '0' && char <= '9') {
        let end = i
        while (end < length && (sql[end] >= '0' && sql[end] <= '9' || sql[end] === '.')) {
          end++
        }
        tokens.push({
          type: TOKEN_TYPES.NUMBER,
          value: sql.slice(i, end),
          start: i,
          end: end,
        })
        i = end
        continue
      }

      if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$') {
        let end = i
        while (end < length && ((sql[end] >= 'a' && sql[end] <= 'z') || (sql[end] >= 'A' && sql[end] <= 'Z') || sql[end] === '_' || sql[end] === '$' || (sql[end] >= '0' && sql[end] <= '9'))) {
          end++
        }
        const value = sql.slice(i, end)
        const upperValue = value.toUpperCase()
        if (keywords.has(upperValue)) {
          tokens.push({
            type: TOKEN_TYPES.KEYWORD,
            value: upperValue,
            start: i,
            end: end,
          })
        } else {
          tokens.push({
            type: TOKEN_TYPES.IDENTIFIER,
            value: value,
            start: i,
            end: end,
          })
        }
        i = end
        continue
      }

      if ('()[]{};,.*+-/<>='.includes(char)) {
        tokens.push({
          type: TOKEN_TYPES.PUNCTUATION,
          value: char,
          start: i,
          end: i + 1,
        })
        i++
        continue
      }

      tokens.push({
        type: 'text',
        value: char,
        start: i,
        end: i + 1,
      })
      i++
    }

    return tokens
  }

  function highlight(sql) {
    if (!sql) return ''

    const tokens = parse(sql)
    let html = ''

    for (const token of tokens) {
      const escapedValue = token.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')

      switch (token.type) {
        case TOKEN_TYPES.KEYWORD:
          html += `<span class="sql-keyword">${escapedValue}</span>`
          break
        case TOKEN_TYPES.STRING:
          html += `<span class="sql-string">${escapedValue}</span>`
          break
        case TOKEN_TYPES.NUMBER:
          html += `<span class="sql-number">${escapedValue}</span>`
          break
        case 'whitespace':
          html += escapedValue
          break
        default:
          html += escapedValue
      }
    }

    return html
  }

  function formatSqlMinified(sql) {
    let minified = sql
      .replace(/\s+/g, ' ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*;\s*/g, ';')
      .trim()

    minified = minified.replace(/\),\(/g, '), (')

    minified = minified.replace(/' ([A-Z_]+\(\))/gi, "', $1")
    minified = minified.replace(/([A-Z_]+\(\)) '/gi, "$1, '")
    minified = minified.replace(/(\d) ([A-Z_]+\(\))/gi, "$1, $2")
    minified = minified.replace(/([A-Z_]+\(\)) (\d)/gi, "$1, $2")
    minified = minified.replace(/NULL ([A-Z_]+\(\))/gi, "NULL, $1")
    minified = minified.replace(/([A-Z_]+\(\)) NULL/gi, "$1, NULL")

    return minified
  }

  function splitLongLine(line, maxLineLength, indent) {
    const parts = []
    let currentPart = ''
    let inQuotes = false
    let parenDepth = 0
    let currentToken = ''

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === "'" && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes
        currentToken += char
      } else if (!inQuotes && char === '(') {
        parenDepth++
        currentToken += char
      } else if (!inQuotes && char === ')') {
        parenDepth = Math.max(0, parenDepth - 1)
        currentToken += char
      } else if (!inQuotes && char === ',') {
        if (parenDepth === 0) {
          const trimmedToken = currentToken.trim()
          if (currentPart) {
            if (currentPart.length + trimmedToken.length + 2 > maxLineLength) {
              parts.push(indent + currentPart + ',')
              currentPart = trimmedToken
            } else {
              currentPart += ',' + trimmedToken
            }
          } else {
            currentPart = trimmedToken
          }
          currentToken = ''
        } else {
          currentToken += char
        }
      } else {
        currentToken += char
      }
    }

    if (currentToken.trim()) {
      const trimmedToken = currentToken.trim()
      if (currentPart) {
        if (currentPart.length + trimmedToken.length + 2 > maxLineLength) {
          parts.push(indent + currentPart + ',')
          parts.push(indent + trimmedToken)
        } else {
          parts.push(indent + currentPart + ',' + trimmedToken)
        }
      } else {
        parts.push(indent + trimmedToken)
      }
    } else if (currentPart) {
      parts.push(indent + currentPart)
    }

    return parts.length > 0 ? parts : [indent + line]
  }

  function applySmartFormatting(sql, indentSpaces, formatStyle, maxLineLength) {
    const indent = ' '.repeat(indentSpaces)
    let lines = sql.split('\n')
    let result = []
    let currentIndent = 0

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      if (trimmedLine.endsWith('(')) {
        result.push(' '.repeat(currentIndent) + trimmedLine)
        currentIndent += indentSpaces
      } else if (trimmedLine.startsWith(')')) {
        currentIndent = Math.max(0, currentIndent - indentSpaces)
        result.push(' '.repeat(currentIndent) + trimmedLine)
      } else {
        const startsWithComma = trimmedLine.startsWith(',')
        const contentToProcess = startsWithComma ? trimmedLine.substring(1).trim() : trimmedLine

        if (contentToProcess.length > maxLineLength && formatStyle === 'expanded') {
          const splitLine = splitLongLine(contentToProcess, maxLineLength, indent + ' '.repeat(currentIndent))
          if (startsWithComma) {
            splitLine[0] = ' '.repeat(currentIndent) + ',' + splitLine[0].trim()
          }
          result.push(...splitLine)
        } else {
          if (startsWithComma) {
            result.push(' '.repeat(currentIndent) + ', ' + contentToProcess)
          } else {
            result.push(' '.repeat(currentIndent) + trimmedLine)
          }
        }
      }
    }

    return result.join('\n')
  }

  it('应该正确保留VALUES子句中数据行之间的逗号（minified模式）', () => {
    const rawSql = `INSERT INTO files (fid, realname, path)
VALUES
  (1, 'a', 'E:\\aaa\\ddd', 'da'),
  (3, '23.png', 'E:\\path\\img_2.png', 'zx'),
  (5, 'img_1.png', 'E:\\path\\img_5.png', 'df');`

    const minified = formatSqlMinified(rawSql)

    expect(minified).toContain('), (')
    expect(minified).toMatch(/VALUES\s*\(.*\),\s*\(.*\),\s*\(.*\)/)
  })

  it('应该正确保留VALUES子句中数据行之间的逗号（formatted模式）', () => {
    const rawSql = `INSERT INTO files (fid, realname, path)
VALUES
  (1, 'a', 'E:\\aaa\\ddd', 'da'),
  (3, '23.png', 'E:\\path\\img_2.png', 'zx'),
  (5, 'img_1.png', 'E:\\path\\img_5.png', 'df');`

    const formatted = applySmartFormatting(rawSql, 4, 'expanded', 80)

    expect(formatted).toContain(',\n')
    expect(formatted).toContain('(1,')
    expect(formatted).toContain('(3,')
    expect(formatted).toContain('(5,')
  })

  it('语法高亮应该保留所有字符', () => {
    const sql = `INSERT INTO files (fid, realname) VALUES (1, 'a'), (2, 'b');`

    const highlighted = highlight(sql)
    const textOnly = highlighted.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'")

    expect(textOnly).toBe(sql)
    expect(highlighted).toContain('),')
  })

  it('splitLongLine应该正确处理VALUES子句', () => {
    const line = "(1,'a','E:\\aaa\\ddd'),(3,'23.png','E:\\path\\img_2.png'),(5,'img_1.png','E:\\path\\img_5.png')"

    const parts = splitLongLine(line, 40, '  ')

    expect(parts.length).toBeGreaterThan(1)
    parts.forEach((part, i) => {
      if (i < parts.length - 1) {
        expect(part.trim()).toMatch(/,$/)
      }
    })
  })
})
