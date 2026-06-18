type Lang = "python" | "typescript"

const PY_KEYWORDS = new Set([
  "import", "from", "def", "class", "return", "if", "else", "elif",
  "try", "except", "finally", "with", "as", "for", "in", "not", "and",
  "or", "is", "None", "True", "False", "async", "await", "raise",
  "while", "pass", "break", "continue", "yield", "lambda", "global",
  "nonlocal", "del", "assert", "match", "case", "print",
])

const TS_KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "var",
  "function", "class", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "new", "typeof", "instanceof",
  "in", "of", "try", "catch", "finally", "throw", "async", "await",
  "yield", "interface", "type", "enum", "extends", "implements",
  "public", "private", "protected", "readonly", "static", "abstract",
  "void", "null", "undefined", "true", "false", "this", "super",
  "as", "is", "keyof", "namespace", "declare", "get", "set",
])

type Tok = { c: string; v: string }

function tokenize(code: string, lang: Lang): Tok[] {
  const out: Tok[] = []
  let i = 0
  const KEYWORDS = lang === "typescript" ? TS_KEYWORDS : PY_KEYWORDS
  const lineComment = lang === "typescript" ? "//" : "#"

  const push = (c: string, v: string) => { if (v) out.push({ c, v }) }

  while (i < code.length) {
    const ch = code[i]

    // Newline
    if (ch === "\n") {
      push("#D4D4D4", "\n")
      i++
      continue
    }

    // Line comment
    if (
      (lineComment === "#" && ch === "#") ||
      (lineComment === "//" && ch === "/" && code[i + 1] === "/")
    ) {
      const j = code.indexOf("\n", i)
      push("#6A9955", j === -1 ? code.slice(i) : code.slice(i, j))
      i = j === -1 ? code.length : j
      continue
    }

    // Block comment (TS only)
    if (lang === "typescript" && ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2)
      const stop = end === -1 ? code.length : end + 2
      push("#6A9955", code.slice(i, stop))
      i = stop
      continue
    }

    // Template literal (TS only)
    if (lang === "typescript" && ch === "`") {
      const start = i
      i++
      while (i < code.length) {
        if (code[i] === "\\") { i += 2; continue }
        if (code[i] === "`") { i++; break }
        i++
      }
      push("#CE9178", code.slice(start, i))
      continue
    }

    // Python string prefix (f"", b"", r"", rf"", etc.) — at a word boundary
    if (lang === "python") {
      const prevNonWord = i === 0 || !/[a-zA-Z_0-9]/.test(code[i - 1])
      const isSinglePrefix =
        prevNonWord &&
        (ch === "f" || ch === "b" || ch === "r" || ch === "F" || ch === "B" || ch === "R") &&
        (code[i + 1] === '"' || code[i + 1] === "'")
      const isDoublePrefix =
        prevNonWord &&
        ((ch === "r" && code[i + 1] === "f") || (ch === "f" && code[i + 1] === "r") ||
         (ch === "b" && code[i + 1] === "r") || (ch === "r" && code[i + 1] === "b")) &&
        (code[i + 2] === '"' || code[i + 2] === "'")

      if (isSinglePrefix || isDoublePrefix) {
        const start = i
        i += isDoublePrefix ? 2 : 1
        const q = code[i]
        i++
        if (code[i] === q && code[i + 1] === q) {
          i += 2
          while (i < code.length) {
            if (code[i] === q && code[i + 1] === q && code[i + 2] === q) { i += 3; break }
            if (code[i] === "\\") i++
            i++
          }
        } else {
          while (i < code.length && code[i] !== q && code[i] !== "\n") {
            if (code[i] === "\\") i++
            i++
          }
          if (i < code.length && code[i] === q) i++
        }
        push("#CE9178", code.slice(start, i))
        continue
      }
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const start = i
      const q = ch
      i++
      if (lang === "python" && code[i] === q && code[i + 1] === q) {
        i += 2
        while (i < code.length) {
          if (code[i] === q && code[i + 1] === q && code[i + 2] === q) { i += 3; break }
          if (code[i] === "\\") i++
          i++
        }
      } else {
        while (i < code.length && code[i] !== q && code[i] !== "\n") {
          if (code[i] === "\\") i++
          i++
        }
        if (i < code.length && code[i] === q) i++
      }
      push("#CE9178", code.slice(start, i))
      continue
    }

    // Number (only at word boundary)
    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
      let j = i
      while (j < code.length && /[0-9._xXbBoOeE+-]/.test(code[j])) j++
      push("#B5CEA8", code.slice(i, j))
      i = j
      continue
    }

    // Identifier
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i
      while (j < code.length && /[a-zA-Z_0-9$]/.test(code[j])) j++
      const word = code.slice(i, j)
      i = j

      // Peek ahead past whitespace to see if followed by (
      let k = j
      while (k < code.length && code[k] === " ") k++
      const afterParen = code[k] === "("

      if (word === "fluiq") push("#6FA8FF", word)
      else if (KEYWORDS.has(word)) push("#C586C0", word)
      else if (afterParen) push("#DCDCAA", word)
      else if (/^[A-Z]/.test(word)) push("#4EC9B0", word)
      else push("#9CDCFE", word)
      continue
    }

    // Everything else — group consecutive plain chars
    let j = i + 1
    while (
      j < code.length &&
      code[j] !== "\n" &&
      code[j] !== "#" &&
      code[j] !== "`" &&
      !/[a-zA-Z_0-9"'$]/.test(code[j])
    ) j++
    push("#D4D4D4", code.slice(i, j))
    i = j
  }

  return out
}

export function syntaxHighlight(code: string, lang: Lang = "python") {
  return tokenize(code, lang).map((t, i) => (
    <span key={i} style={{ color: t.c }}>{t.v}</span>
  ))
}
