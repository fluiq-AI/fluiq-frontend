const _h  = (c: string) => (t: string) => <span style={{ color: c }}>{t}</span>
const _kw = _h("#C586C0")
const _st = _h("#CE9178")
const _cm = _h("#6A9955")
const _fn = _h("#DCDCAA")
const _ty = _h("#4EC9B0")
const _va = _h("#9CDCFE")
const _fl = _h("#6FA8FF")
const _nu = _h("#B5CEA8")
const _pl = _h("#D4D4D4")

export function setupHL() {
  return (
    <>
      {_kw("import")} {_ty("fluiq")}{_pl(", ")}{_ty("openai")}{"\n"}
      {"\n"}
      {_cm("# 1. Wire instrumentation once at startup")}{"\n"}
      {_fl("fluiq")}{_pl(".")}{_fn("instrument")}{_pl("(")}{_va("api_key")}{_pl("=")}{_st('"fl_..."')}{_pl(")")}{"\n"}
      {"\n"}
      {_cm("# 2. Block attacks before they reach the model (Team+)")}{"\n"}
      {_fl("fluiq")}{_pl(".")}{_fn("secure")}{_pl("(")}{_va("mode")}{_pl("=")}{_st('"block"')}{_pl(")")}{"\n"}
      {"\n"}
      {_cm("# 3. Redis-cache repeated prompts (Team+)")}{"\n"}
      {_fl("fluiq")}{_pl(".")}{_fn("optimize")}{_pl("()")}{"\n"}
      {"\n"}
      {_cm("# 4. Score and gate every response (all tiers)")}{"\n"}
      {_fl("fluiq")}{_pl(".")}{_fn("eval")}{_pl("(")}{"\n"}
      {"    "}{_va("thresholds")}{_pl("={")}{_st('"hallucination"')}{_pl(": ")}{_nu("0.8")}{_pl(", ")}{_st('"relevance"')}{_pl(": ")}{_nu("0.75")}{_pl("},")}{"\n"}
      {"    "}{_va("mode")}{_pl("=")}{_st('"warn"')}{_pl(",          ")}{_cm('# "block" raises FluiqEvalError')}{"\n"}
      {_pl(")")}{"\n"}
      {"\n"}
      {_cm("# Your code is unchanged from here")}{"\n"}
      {_va("client")}{_pl(" = ")}{_ty("openai")}{_pl(".")}{_ty("OpenAI")}{_pl("()")}{"\n"}
      {_va("response")}{_pl(" = ")}{_va("client")}{_pl(".")}{_va("chat")}{_pl(".")}{_va("completions")}{_pl(".")}{_fn("create")}{_pl("(")}{"\n"}
      {"    "}{_va("model")}{_pl("=")}{_st('"gpt-4o"')}{_pl(",")}{"\n"}
      {"    "}{_va("messages")}{_pl("=[{")}{_st('"role"')}{_pl(": ")}{_st('"user"')}{_pl(", ")}{_st('"content"')}{_pl(": ")}{_st('"..."')}{_pl("}],")}{"\n"}
      {_pl(")")}{"\n"}
      {_cm("# ↑ Traced, scanned, cached, and evaluated automatically")}
    </>
  )
}

export function pipelineHL() {
  return (
    <>
      {_kw("from")} {_ty("fluiq")} {_kw("import")} {_ty("instrument")}{_pl(", ")}{_ty("trace")}{"\n"}
      {"\n"}
      {_fn("instrument")}{_pl("(")}{_va("api_key")}{_pl("=")}{_st('"fl_..."')}{_pl(")")}{"\n"}
      {"\n"}
      {_pl("@")}{_ty("trace")}{"\n"}
      {_kw("def")} {_fn("answer_question")}{_pl("(")}{_va("question")}{_pl(": ")}{_ty("str")}{_pl(") -> ")}{_ty("str")}{_pl(":")}{"\n"}
      {"    "}{_va("docs")}{_pl(" = ")}{_va("vector_store")}{_pl(".")}{_fn("search")}{_pl("(")}{_va("question")}{_pl(", ")}{_va("k")}{_pl("=")}{_nu("5")}{_pl(")")}{"\n"}
      {"    "}{_kw("return")} {_fn("llm")}{_pl(".")}{_fn("invoke")}{_pl("(")}{_fn("prompt")}{_pl("(")}{_va("question")}{_pl(", ")}{_va("docs")}{_pl("))")}{"\n"}
      {"\n"}
      {_cm("# Every call is now:")}{"\n"}
      {_cm("# → Traced with cost + latency")}{"\n"}
      {_cm("# → Security-scanned")}{"\n"}
      {_cm("# → Cached if repeated")}{"\n"}
      {_cm("# → Evaluated for quality")}
    </>
  )
}
