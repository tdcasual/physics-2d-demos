/**
 * 安全表达式解析器 — 将字符串表达式转换为 t 的函数
 *
 * 支持的语法：数字、变量 t、+ - * /、括号
 */

export type VelocityFn = (t: number) => number;

function tokenize(expr: string): (number | string)[] {
  const tokens: (number | string)[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let num = '';
      while (i < expr.length && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i++];
      }
      const parsed = parseFloat(num);
      if (Number.isFinite(parsed)) {
        tokens.push(parsed);
      }
    } else if (ch === 't') {
      tokens.push('t');
      i++;
    } else if ('+-*/()'.includes(ch)) {
      tokens.push(ch);
      i++;
    } else {
      // Invalid character — abort tokenization
      return [];
    }
  }
  return tokens;
}

function evaluateExpression(tokens: (number | string)[], t: number): number {
  let pos = 0;

  function peek(): number | string | undefined {
    return tokens[pos];
  }

  function consume(): number | string | undefined {
    return tokens[pos++];
  }

  function parseExpression(): number {
    let value = parseTerm();
    while (pos < tokens.length) {
      const op = peek();
      if (op === '+' || op === '-') {
        consume();
        const rhs = parseTerm();
        value = op === '+' ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (pos < tokens.length) {
      const op = peek();
      if (op === '*' || op === '/') {
        consume();
        const rhs = parseFactor();
        value = op === '*' ? value * rhs : rhs === 0 ? 0 : value / rhs;
      } else {
        break;
      }
    }
    return value;
  }

  function parseFactor(): number {
    const token = peek();
    if (token === undefined) return 0;

    if (token === '(') {
      consume();
      const value = parseExpression();
      if (peek() === ')') consume();
      return value;
    }

    if (token === 't') {
      consume();
      return t;
    }

    if (typeof token === 'number') {
      consume();
      return token;
    }

    if (token === '-') {
      consume();
      return -parseFactor();
    }

    if (token === '+') {
      consume();
      return parseFactor();
    }

    return 0;
  }

  return parseExpression();
}

export function createVelocityFunction(expression: string): VelocityFn {
  const expr = expression.trim();
  if (expr.length === 0) {
    return () => 0;
  }

  const tokens = tokenize(expr);
  if (tokens.length === 0) {
    return () => 0;
  }

  // Pre-compute at t=0 to validate expression
  const testValue = evaluateExpression(tokens, 0);
  if (!Number.isFinite(testValue)) {
    return () => 0;
  }

  return (t: number) => {
    const value = evaluateExpression(tokens, t);
    return Number.isFinite(value) ? value : 0;
  };
}
