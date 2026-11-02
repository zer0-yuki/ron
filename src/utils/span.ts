import { Parser } from './parser/index.js'

export interface LineColumn {
  readonly line: number
  readonly col: number
}

export type Offset = number

export interface Span<P = Offset> {
  readonly start: P
  readonly end: P
}

export const Span = {
  span<P>(start: P, end: P): Span<P> {
    return { start, end }
  },

  combine(s1: Span, s2: Span): Span {
    const start = s1.start < s2.start ? s1.start : s2.start
    const end = s1.end > s2.end ? s1.end : s2.end
    return { start, end }
  },

  eof(): Span {
    return { start: Infinity, end: Infinity }
  },
}

export interface WithSpan {
  span: Span
}

export function spanned<O>(p: Parser<string, O>): Parser<string, { value: O; span: Span }> {
  return (c) => {
    const r = p(c)
    if (!r.hasOutcome) return r
    return {
      ...r,
      outcome: { value: r.outcome, span: { start: c.position, end: r.cursor.position } },
    }
  }
}
