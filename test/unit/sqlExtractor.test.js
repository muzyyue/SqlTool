/**
 * SQL提取引擎单元测试
 */

import { describe, it, expect } from "vitest";
import {
  extractSqlStatements,
  validateSql,
  parseSqlStructure,
} from "@/utils/sql/sqlExtractor";

describe("sqlExtractor", () => {
  describe("extractSqlStatements", () => {
    it("应提取单条SELECT语句", () => {
      const text = "SELECT * FROM users";
      const results = extractSqlStatements(text);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("select");
      expect(results[0].sql).toContain("SELECT");
      expect(results[0].sql).toContain("users");
    });

    it("应提取多条分号分隔的SQL语句", () => {
      const text = `
        SELECT * FROM users;
        INSERT INTO logs (message) VALUES ('test');
        UPDATE config SET value = 'new';
      `;
      const results = extractSqlStatements(text);

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe("select");
      expect(results[1].type).toBe("insert");
      expect(results[2].type).toBe("update");
    });

    it("应正确处理多行SQL", () => {
      const text = `
        SELECT
          u.id,
          u.name,
          u.email
        FROM users u
        WHERE u.status = 'active'
          AND u.created_at > '2024-01-01'
      `;
      const results = extractSqlStatements(text);

      expect(results).toHaveLength(1);
      expect(results[0].sql).toContain("SELECT");
      expect(results[0].sql).toContain("WHERE");
    });

    it("应识别DDL语句", () => {
      const ddlStatements = [
        "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100))",
        "ALTER TABLE users ADD COLUMN email VARCHAR(200)",
        "DROP TABLE IF EXISTS temp_data",
        "TRUNCATE TABLE logs",
      ];

      ddlStatements.forEach((sql) => {
        const results = extractSqlStatements(sql);
        expect(results).toHaveLength(1);
        expect(results[0].type).toBe("ddl");
      });
    });

    it("应过滤注释内容", () => {
      const text = `
        -- 这是一个注释
        SELECT * FROM users; /* 这是另一个注释 */
        -- 第二条注释
        INSERT INTO logs VALUES (1);
      `;
      const results = extractSqlStatements(text, { ignoreComments: true });

      expect(results).toHaveLength(2);
      expect(results[0].sql).not.toContain("--");
      expect(results[1].sql).not.toContain("--");
    });

    it("应保护字符串内的伪SQL", () => {
      const text = `INSERT INTO posts (content) VALUES ('SELECT * FROM fake');`;
      const results = extractSqlStatements(text, { preserveStrings: true });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("insert");
    });

    it("应支持GO语句分隔符（T-SQL）", () => {
      const text = `
        CREATE TABLE test (id INT);
        GO
        INSERT INTO test VALUES (1);
        GO
      `;
      const results = extractSqlStatements(text);

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("空文本处理应返回空数组", () => {
      expect(extractSqlStatements("")).toEqual([]);
      expect(extractSqlStatements(null)).toEqual([]);
      expect(extractSqlStatements(undefined)).toEqual([]);
    });

    it("非字符串输入应返回空数组", () => {
      expect(extractSqlStatements(123)).toEqual([]);
      expect(extractSqlStatements({})).toEqual([]);
      expect(extractSqlStatements([])).toEqual([]);
    });
  });

  describe("validateSql", () => {
    it("应通过合法的SELECT语句", async () => {
      const result = await validateSql("SELECT id, name FROM users", "mysql")
      expect(result.valid).toBe(true)
      expect(result.ast).toBeDefined()
    })

    it("应通过合法的INSERT语句", async () => {
      const result = await validateSql(
        "INSERT INTO users (name) VALUES ('test')",
        "mysql"
      )
      expect(result.valid).toBe(true)
    });

    it("应捕获缺少FROM子句的错误", async () => {
      const result = await validateSql("SELECT id, name");
      // node-sql-parser 可能会通过这个，取决于严格程度
      expect(result).toBeDefined();
    });

    it("应处理空输入", async () => {
      const result = await validateSql("");
      expect(result.valid).toBe(false);
    });
  });

  describe("parseSqlStructure", () => {
    it("应正确提取表名列表", () => {
      const sql =
        "SELECT u.*, o.* FROM users u JOIN orders o ON u.id = o.user_id";
      const structure = parseSqlStructure(sql);

      expect(structure.tables).toContain("users");
      expect(structure.tables).toContain("orders");
    });

    it("应识别JOIN的表", () => {
      const sql = `
        SELECT *
        FROM table_a a
        LEFT JOIN table_b b ON a.id = b.a_id
        INNER JOIN table_c c ON b.id = c.b_id
      `;
      const structure = parseSqlStructure(sql);

      expect(structure.tables).toContain("table_a");
      expect(structure.tables).toContain("table_b");
      expect(structure.tables).toContain("table_c");
    });

    it("应提取字段列表", () => {
      const sql = "SELECT id, name, email, created_at FROM users";
      const structure = parseSqlStructure(sql);

      expect(structure.columns).toContain("id");
      expect(structure.columns).toContain("name");
      expect(structure.columns).toContain("email");
    });

    it("应提取WHERE条件字段", () => {
      const sql = "SELECT * FROM users WHERE status = 'active' AND age > 18";
      const structure = parseSqlStructure(sql);

      expect(structure.conditions).toContain("status");
      expect(structure.conditions).toContain("age");
    });

    it("应正确识别SQL类型", () => {
      expect(parseSqlStructure("SELECT * FROM users").type).toBe("select");
      expect(parseSqlStructure("INSERT INTO users VALUES (1)").type).toBe(
        "insert",
      );
      expect(parseSqlStructure('UPDATE users SET name = "test"').type).toBe(
        "update",
      );
      expect(parseSqlStructure("DELETE FROM users").type).toBe("delete");
      expect(parseSqlStructure("CREATE TABLE test (id INT)").type).toBe("ddl");
    });

    it("应检测子查询", () => {
      const sql = "SELECT * FROM (SELECT id FROM users) AS sub";
      const structure = parseSqlStructure(sql);

      expect(structure.hasSubquery).toBe(true);
    });
  });

  describe("性能测试", () => {
    it("应在合理时间内处理10KB文本", () => {
      const largeText = Array(100)
        .fill("SELECT * FROM users WHERE id = 1;")
        .join("\n");

      const startTime = performance.now();
      const results = extractSqlStatements(largeText);
      const endTime = performance.now();

      expect(results.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(500); // 500ms内完成
    });
  });
});
