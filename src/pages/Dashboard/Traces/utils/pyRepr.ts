// Parse a Python ``repr()`` string into a JS value.
//
// The SDK's @trace decorator records a general function's IO as raw Python
// repr (see fluiq.decorator): the input is ``str(args) + str(kwargs)`` and the
// output is ``str(result)``. So a dict result arrives as
//   {'hs_description': 'Lasers…', 'us_classification': {'product_id': ObjectId('6a2c…'), 'origin': None, …}}
// and the input of a function taking one object arg arrives as
//   (<features.classificationv2.index.ClassificationV2Job object at 0x7fede85ce010>,){}
//
// None of that is valid JSON (single quotes, None/True/False, ObjectId(…)
// wrappers, opaque <… object at 0x…> reprs), so JSON.parse fails and the
// payload would otherwise be dumped as a single unwrapped line. This parser
// turns it into a structured value the existing JsonBlock can pretty-print.

class PyReprParser {
  private readonly s: string
  private i = 0

  constructor(s: string) {
    this.s = s
  }

  private ws(): void {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++
  }

  atEnd(): boolean {
    this.ws()
    return this.i >= this.s.length
  }

  parseValue(): unknown {
    this.ws()
    if (this.i >= this.s.length) throw new Error("unexpected end of input")
    const c = this.s[this.i]
    if (c === "{") return this.parseBrace()
    if (c === "[") return this.parseSeq("]")
    if (c === "(") return this.parseSeq(")")
    if (c === "'" || c === '"') return this.parseString()
    if (c === "<") return this.parseObjectRepr()
    if (c === "-" || c === "+" || (c >= "0" && c <= "9")) return this.parseNumber()
    return this.parseWord()
  }

  // Python string literal. repr() escapes \\, \n, \r, \t and the quote char,
  // and emits non-printables as \xHH / \uHHHH / \UHHHHHHHH. A leading b/r/f
  // prefix (e.g. bytes: b'…') is accepted and the value decoded as text.
  private parseString(): string {
    const quote = this.s[this.i]
    this.i++ // opening quote
    let out = ""
    while (this.i < this.s.length) {
      const c = this.s[this.i]
      if (c === "\\") {
        this.i++
        const e = this.s[this.i]
        switch (e) {
          case "n":
            out += "\n"
            break
          case "r":
            out += "\r"
            break
          case "t":
            out += "\t"
            break
          case "b":
            out += "\b"
            break
          case "f":
            out += "\f"
            break
          case "0":
            out += "\0"
            break
          case "x":
          case "u":
          case "U": {
            const len = e === "x" ? 2 : e === "u" ? 4 : 8
            const hex = this.s.slice(this.i + 1, this.i + 1 + len)
            const code = parseInt(hex, 16)
            if (hex.length === len && !Number.isNaN(code)) {
              out += String.fromCodePoint(code)
              this.i += len
            } else {
              out += e
            }
            break
          }
          default:
            // \\, \', \" and any unknown escape pass the char through verbatim.
            out += e
        }
        this.i++
        continue
      }
      if (c === quote) {
        this.i++ // closing quote
        return out
      }
      out += c
      this.i++
    }
    throw new Error("unterminated string")
  }

  private parseNumber(): number {
    const start = this.i
    const m = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(this.s.slice(this.i))
    if (!m) throw new Error("invalid number")
    this.i += m[0].length
    const n = Number(this.s.slice(start, this.i))
    if (Number.isNaN(n)) throw new Error("invalid number")
    return n
  }

  // None/True/False, a bytes/raw string prefix, or a constructor-style repr
  // such as ObjectId('…'), UUID('…'), Decimal('1.5'), datetime.datetime(2024, …).
  private parseWord(): unknown {
    const start = this.i
    while (this.i < this.s.length && /[A-Za-z0-9_.]/.test(this.s[this.i])) this.i++
    const word = this.s.slice(start, this.i)
    if (word.length === 0) throw new Error(`unexpected char ${this.s[this.i]}`)

    // String prefixes: b'…', r'…', f'…', rb'…', etc.
    if (/^[bBrRfFuU]{1,2}$/.test(word)) {
      this.ws()
      if (this.s[this.i] === "'" || this.s[this.i] === '"') return this.parseString()
    }

    if (word === "None") return null
    if (word === "True") return true
    if (word === "False") return false

    this.ws()
    if (this.s[this.i] === "(") {
      const args = this.parseSeq(")")
      const raw = this.s.slice(start, this.i)
      const cls = word.split(".").pop() ?? word
      // Identifier-like wrappers around a single scalar are unwrapped to that
      // scalar so the surrounding structure reads cleanly.
      if ((cls === "ObjectId" || cls === "UUID") && args.length === 1) {
        return args[0]
      }
      if (cls === "Decimal" && args.length === 1) {
        const v = args[0]
        if (typeof v === "string") {
          const n = Number(v)
          return Number.isNaN(n) ? v : n
        }
        return v
      }
      // Anything else (datetime, custom dataclasses, …) keeps its source repr.
      return raw
    }

    throw new Error(`unexpected token ${word}`)
  }

  // Opaque instance repr: <pkg.mod.Class object at 0x7f…>. The hex address is
  // dropped (it's noise that changes every run); the class path is kept so the
  // value still reads as "an instance of X".
  private parseObjectRepr(): string {
    const start = this.i
    this.i++ // <
    while (this.i < this.s.length && this.s[this.i] !== ">") this.i++
    if (this.s[this.i] !== ">") throw new Error("unterminated object repr")
    this.i++ // >
    const raw = this.s.slice(start, this.i)
    return raw.replace(/\s+at\s+0x[0-9a-fA-F]+/, "")
  }

  // Lists [], tuples () and sets ({} without colons) all collapse to an array.
  private parseSeq(close: string): unknown[] {
    this.i++ // opening bracket
    const out: unknown[] = []
    this.ws()
    if (this.s[this.i] === close) {
      this.i++
      return out
    }
    for (;;) {
      out.push(this.parseValue())
      this.ws()
      const c = this.s[this.i]
      if (c === ",") {
        this.i++
        this.ws()
        if (this.s[this.i] === close) {
          this.i++ // trailing comma (e.g. single-element tuple)
          return out
        }
        continue
      }
      if (c === close) {
        this.i++
        return out
      }
      throw new Error(`expected ',' or '${close}'`)
    }
  }

  // {} is a dict if its first separator is ':', otherwise a set (-> array).
  private parseBrace(): unknown {
    this.i++ // {
    this.ws()
    if (this.s[this.i] === "}") {
      this.i++
      return {}
    }
    const firstKey = this.parseValue()
    this.ws()
    if (this.s[this.i] === ":") {
      return this.parseDict(firstKey)
    }
    return this.parseSet(firstKey)
  }

  private parseDict(firstKey: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    let key = firstKey
    for (;;) {
      this.ws()
      if (this.s[this.i] !== ":") throw new Error("expected ':' in dict")
      this.i++ // :
      out[String(key)] = this.parseValue()
      this.ws()
      const c = this.s[this.i]
      if (c === ",") {
        this.i++
        this.ws()
        if (this.s[this.i] === "}") {
          this.i++
          return out
        }
        key = this.parseValue()
        continue
      }
      if (c === "}") {
        this.i++
        return out
      }
      throw new Error("expected ',' or '}' in dict")
    }
  }

  private parseSet(first: unknown): unknown[] {
    const out: unknown[] = [first]
    for (;;) {
      this.ws()
      const c = this.s[this.i]
      if (c === ",") {
        this.i++
        this.ws()
        if (this.s[this.i] === "}") {
          this.i++
          return out
        }
        out.push(this.parseValue())
        continue
      }
      if (c === "}") {
        this.i++
        return out
      }
      throw new Error("expected ',' or '}' in set")
    }
  }
}

// Best-effort parse of a Python repr string. Returns the parsed value, or null
// when the string doesn't look like (or doesn't fully parse as) Python repr —
// in which case callers should fall back to rendering it as plain text.
//
// The decorator concatenates ``str(args) + str(kwargs)``, so a function's input
// is a tuple immediately followed by a dict. When we see exactly that shape we
// return { args, kwargs } so the two halves stay labelled and distinct.
export function tryParsePyLiteral(value: string): unknown | null {
  const trimmed = value.trim()
  if (trimmed.length < 2) return null
  const first = trimmed[0]
  if (first !== "{" && first !== "[" && first !== "(" && first !== "<") return null
  try {
    const p = new PyReprParser(trimmed)
    const values: unknown[] = [p.parseValue()]
    while (!p.atEnd()) values.push(p.parseValue())
    if (values.length === 1) return values[0]
    if (
      values.length === 2 &&
      Array.isArray(values[0]) &&
      values[1] !== null &&
      typeof values[1] === "object" &&
      !Array.isArray(values[1])
    ) {
      return { args: values[0], kwargs: values[1] }
    }
    return values
  } catch {
    return null
  }
}
