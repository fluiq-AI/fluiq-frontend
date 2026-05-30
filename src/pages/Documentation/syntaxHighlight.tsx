const KEYWORDS = new Set([
  "import", "from", "def", "class", "return", "if", "else", "elif",
  "try", "except", "finally", "with", "as", "for", "in", "not", "and",
  "or", "is", "None", "True", "False", "async", "await", "raise",
  "while", "pass", "break", "continue", "yield", "lambda", "global",
  "nonlocal", "del", "assert", "match", "case", "print",
])

type Tok = { c: string; v: string }

function tokenize(code: string): Tok[] {
  const out: Tok[] = []
  let i = 0

  const push = (c: string, v: string) => { if (v) out.push({ c, v }) }

  while (i < code.length) {
    const ch = code[i]

    // Newline
    if (ch === "\n") {
      push("#D4D4D4", "\n")
      i++
      continue
    }

    // Comment
    if (ch === "#") {
      const j = code.indexOf("\n", i)
      push("#6A9955", j === -1 ? code.slice(i) : code.slice(i, j))
      i = j === -1 ? code.length : j
      continue
    }

    // String prefix (f"", b"", r"", rf"", etc.) — must be at a word boundary
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
      // fall through to string parsing below — `i` now points to the quote
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

    // String literal
    if (ch === '"' || ch === "'") {
      const start = i
      const q = ch
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

    // Number (only at word boundary)
    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
      let j = i
      while (j < code.length && /[0-9._xXbBoOeE+\-]/.test(code[j])) j++
      push("#B5CEA8", code.slice(i, j))
      i = j
      continue
    }

    // Identifier
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i
      while (j < code.length && /[a-zA-Z_0-9]/.test(code[j])) j++
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
      !/[a-zA-Z_0-9"']/.test(code[j])
    ) j++
    push("#D4D4D4", code.slice(i, j))
    i = j
  }

  return out
}

export function syntaxHighlight(code: string) {
  return tokenize(code).map((t, i) => (
    <span key={i} style={{ color: t.c }}>{t.v}</span>
  ))
}
