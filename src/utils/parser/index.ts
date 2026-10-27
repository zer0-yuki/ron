import { err, ok, Result } from '../result.js'
import { IsTuple, TupleToIntersection } from '../type.js'
import { ParseError, UnexpectedError, UnknownError } from './error.js'

export type ParseResult<I, O> = {
  readonly cursor: Cursor<I>
  readonly result: Result<O, ParseError<I>>
}
type InputOf<P> = P extends Parser<infer I, any> ? I : never
type OutputOf<P> = P extends Parser<any, infer O> ? O : never
type OutputsOf<Ps extends readonly Parser<any, any>[]> = {
  [K in keyof Ps]: OutputOf<Ps[K]>
}
type InputTupleOf<Ps extends readonly Parser<any, any>[]> = Ps extends [infer First, ...infer Rest]
  ? Rest extends Parser<any, any>[]
    ? [InputOf<First>, ...InputTupleOf<Rest>]
    : never
  : []
type InputsOf<Ps extends readonly Parser<any, any>[]> =
  IsTuple<Ps> extends true ? TupleToIntersection<InputTupleOf<Ps>> : InputOf<Ps[number]>

function parseResult<I, O>(c: Cursor<I>, r: Result<O, ParseError<I>>): ParseResult<I, O> {
  return { cursor: c, result: r }
}

export interface Cursor<I> {
  peek(): I | undefined
  advance(): Cursor<I>
  readonly position: number
}

export interface Parser<I, O> {
  (cursor: Cursor<I>): ParseResult<I, O>
}

export function succeed<I, O>(o: O): Parser<I, O> {
  return (c) => parseResult(c, ok(o))
}

export function failed<I, O>(e: ParseError<I>): Parser<I, O> {
  return (c) => parseResult(c, err(e))
}

function satisfy<I, O extends I>(pred: (input: I) => input is O, expected?: string): Parser<I, O>
function satisfy<I>(pred: (input: I) => boolean, expected?: string): Parser<I, I>

function satisfy<I>(pred: (input: I) => boolean, expected: string = 'unknown'): Parser<I, I> {
  return (c) => {
    const input = c.peek()
    if (input === undefined || !pred(input)) {
      return parseResult(c, err(new UnexpectedError(expected, input)))
    }
    return parseResult(c.advance(), ok(input))
  }
}
export { satisfy }

export function lazy<I, O>(f: () => Parser<I, O>): Parser<I, O> {
  let p: Parser<I, O> | undefined
  return (c) => {
    if (p === undefined) p = f()
    return p(c)
  }
}

export function choice<Ps extends Parser<any, any>[]>(
  ps: Ps,
  expected: string = 'unknown'
): Parser<InputOf<Ps[number]>, OutputOf<Ps[number]>> {
  return (c) => {
    for (const p of ps) {
      const r = p(c)
      if (r.result.ok) {
        return r
      }
    }
    return parseResult(c, err(new UnexpectedError(expected, c.peek())))
  }
}

export function or<I, O1, O2>(
  p1: Parser<I, O1>,
  p2: Parser<I, O2>,
  expected: string = 'unknown'
): Parser<I, O1 | O2> {
  return choice([p1, p2], expected)
}

export function seq<Ps extends Parser<any, any>[]>(...ps: Ps): Parser<InputsOf<Ps>, OutputsOf<Ps>> {
  return (c) => {
    const os: OutputsOf<Ps> = [] as OutputsOf<Ps>
    let cur = c
    for (const p of ps) {
      const r = p(cur)
      if (!r.result.ok) return parseResult(cur, r.result)
      os.push(r.result.value)
      cur = r.cursor
    }
    return parseResult(cur, ok(os))
  }
}

export function pair<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, [O1, O2]> {
  return seq(p1, p2)
}

export function between<I, O, L, R>(
  pL: Parser<I, L>,
  p: Parser<I, O>,
  pR: Parser<I, R>
): Parser<I, O> {
  return (c) => {
    const r = seq(pL, p, pR)(c)
    return parseResult(r.cursor, r.result.ok ? ok(r.result.value[1]) : err(r.result.err))
  }
}

export function pairL<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, O1> {
  return between(succeed(undefined), p1, p2)
}

export function pairR<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, O2> {
  return between(p1, p2, succeed(undefined))
}

export function many<I, O>(p: Parser<I, O>): Parser<I, O[]> {
  return (c) => {
    const os: O[] = []
    let cur = c
    while (true) {
      const r = p(cur)
      if (!r.result.ok) break
      if (r.cursor.position === cur.position) {
        return parseResult(cur, err(new UnknownError()))
      }
      os.push(r.result.value)
      cur = r.cursor
    }
    return parseResult(cur, ok(os))
  }
}

export function many1<I, O>(p: Parser<I, O>): Parser<I, [O, ...O[]]> {
  return map(pair(p, many(p)), ([first, rest]) => [first, ...rest])
}

export function repeat<I, O>(p: Parser<I, O>, n: number): Parser<I, O[]> {
  return seq(...Array<Parser<I, O>>(n).fill(p))
}

export function flatMap<I, M, O>(p: Parser<I, M>, f: (m: M) => Parser<I, O>): Parser<I, O> {
  return (c) => {
    const r = p(c)
    return r.result.ok ? f(r.result.value)(r.cursor) : parseResult(c, r.result)
  }
}

export function map<I, M, O>(p: Parser<I, M>, f: (m: M) => O): Parser<I, O> {
  return flatMap(p, (m) => succeed(f(m)))
}
