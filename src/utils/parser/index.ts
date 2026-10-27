import { err, ok, Result } from '../result.js'
import { IsTuple, TupleToIntersection } from '../type.js'
import { ParseError, UnexpectedError } from './error.js'

export interface ParseResult<I, O> {
  readonly cursor: Cursor<I>
  readonly result: Result<O, ParseError<I>>
}
type InputOf<P> = P extends Parser<infer I, any> ? I : never
type OutputOf<P> = P extends Parser<any, infer O> ? O : never
type OutputsOf<Ps extends readonly AnyParser[]> = {
  [K in keyof Ps]: OutputOf<Ps[K]>
}
type InputTupleOf<Ps extends readonly AnyParser[]> = Ps extends [infer First, ...infer Rest]
  ? Rest extends AnyParser[]
    ? [InputOf<First>, ...InputTupleOf<Rest>]
    : never
  : []
type InputsOf<Ps extends readonly AnyParser[]> =
  IsTuple<Ps> extends true ? TupleToIntersection<InputTupleOf<Ps>> : InputOf<Ps[number]>

function parseOk<I, O>(c: Cursor<I>, o: O): ParseResult<I, O> {
  return { cursor: c, result: ok(o) }
}
function parseErr<I, O>(c: Cursor<I>, e: ParseError<I>): ParseResult<I, O> {
  return { cursor: c, result: err(e) }
}

export interface Cursor<I> {
  peek(): I | undefined
  advance(): Cursor<I>
}

export interface Parser<I, O> {
  (cursor: Cursor<I>): ParseResult<I, O>
}

type AnyParser = Parser<any, any>

export function succeed<I, O>(o: O): Parser<I, O> {
  return (c) => parseOk(c, o)
}

export function failed<I, O>(e: ParseError<I>): Parser<I, O> {
  return (c) => parseErr(c, e)
}

// Primitive
function satisfy<I, O extends I>(pred: (input: I) => input is O, expected?: string): Parser<I, O>
function satisfy<I>(pred: (input: I) => boolean, expected?: string): Parser<I, I>

function satisfy<I>(pred: (input: I) => boolean, expected: string = 'unknown'): Parser<I, I> {
  return (c) => {
    const input = c.peek()
    if (input === undefined || !pred(input)) {
      return parseErr(c, new UnexpectedError(expected, input))
    }
    return parseOk(c.advance(), input)
  }
}
export { satisfy }

// lazy f = flatMap (succeed ()) f
export function lazy<I, O>(f: () => Parser<I, O>): Parser<I, O> {
  let p: Parser<I, O> | undefined
  return (c) => {
    if (p === undefined) p = f()
    return p(c)
  }
}

// Primitive
export function choice<Ps extends AnyParser[]>(
  ps: Ps,
  expected: string = 'unknown'
): Parser<InputOf<Ps[number]>, OutputOf<Ps[number]>> {
  return (c) => {
    for (const p of ps) {
      const r = p(c)
      if (r.result.ok) return r
    }
    return parseErr(c, new UnexpectedError(expected, c.peek()))
  }
}

// or p1 p2 = choice (p1, p2)
export function or<I, O1, O2>(
  p1: Parser<I, O1>,
  p2: Parser<I, O2>,
  expected: string = 'unknown'
): Parser<I, O1 | O2> {
  return (c) => {
    const r1 = p1(c)
    if (r1.result.ok) return r1
    const r2 = p2(c)
    if (r2.result.ok) return r2
    return parseErr(c, new UnexpectedError(expected, c.peek()))
  }
}

// seq () = succeed ()
// seq (p : ps) = flatMap p (fun x -> map (seq ps) (fun xs -> (x : xs)))
export function seq<Ps extends AnyParser[]>(...ps: Ps): Parser<InputsOf<Ps>, OutputsOf<Ps>> {
  return (c) => {
    const os: OutputsOf<Ps> = [] as OutputsOf<Ps>
    let cur = c
    for (const p of ps) {
      const r = p(cur)
      if (!r.result.ok) return r

      os.push(r.result.value)
      cur = r.cursor
    }
    return parseOk(cur, os)
  }
}

// pair p1 p2 = seq (p1, p2)
export function pair<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, [O1, O2]> {
  return (c) => {
    const r1 = p1(c)
    if (!r1.result.ok) return parseErr(c, r1.result.err)
    const r2 = p2(r1.cursor)
    if (!r2.result.ok) return parseErr(r1.cursor, r2.result.err)
    return parseOk(r2.cursor, [r1.result.value, r2.result.value])
  }
}

// between pL p pR = map (seq (pL, p, pR)) (fun (_, x, _) -> x)
export function between<I, O, L, R>(
  pL: Parser<I, L>,
  p: Parser<I, O>,
  pR: Parser<I, R>
): Parser<I, O> {
  return (c) => {
    const rL = pL(c)
    if (!rL.result.ok) return parseErr(c, rL.result.err)
    const r = p(rL.cursor)
    if (!r.result.ok) return r
    const rR = pR(r.cursor)
    if (!rR.result.ok) return parseErr(r.cursor, rR.result.err)
    return parseOk(rR.cursor, r.result.value)
  }
}

// pairL p1 p2 = map (seq (p1, p2)) (fun (x, _) -> x)
export function pairL<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, O1> {
  return (c) => {
    const r1 = p1(c)
    if (!r1.result.ok) return parseErr(c, r1.result.err)
    const r2 = p2(r1.cursor)
    if (!r2.result.ok) return parseErr(r1.cursor, r2.result.err)
    return parseOk(r2.cursor, r1.result.value)
  }
}

// pairR p1 p2 = map (seq (p1, p2)) (fun (_, x) -> x)
export function pairR<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, O2> {
  return (c) => {
    const r1 = p1(c)
    if (!r1.result.ok) return parseErr(c, r1.result.err)
    const r2 = p2(r1.cursor)
    if (!r2.result.ok) return parseErr(r1.cursor, r2.result.err)
    return parseOk(r2.cursor, r2.result.value)
  }
}

// Primitive
export function many<I, O>(p: Parser<I, O>): Parser<I, O[]> {
  return (c) => {
    const os: O[] = []
    let cur = c
    while (true) {
      const r = p(cur)
      if (!r.result.ok) break

      os.push(r.result.value)
      cur = r.cursor
    }
    return parseOk(cur, os)
  }
}

// many1 p = map (pair p (many p)) (fun (x, xs) -> x : xs)
export function many1<I, O>(p: Parser<I, O>): Parser<I, [O, ...O[]]> {
  return (c) => {
    const r0 = p(c)
    if (!r0.result.ok) return parseErr(c, r0.result.err)

    const os: [O, ...O[]] = [r0.result.value]
    let cur = r0.cursor
    while (true) {
      const r = p(cur)
      if (!r.result.ok) break

      os.push(r.result.value)
      cur = r.cursor
    }
    return parseOk(cur, os)
  }
}

// repeat p n = seq (replicate n p)
export function repeat<I, O>(p: Parser<I, O>, n: number): Parser<I, O[]> {
  return (c) => {
    const os: O[] = []
    let cur = c
    for (let i = 0; i < n; i++) {
      const r = p(cur)
      if (!r.result.ok) return parseErr(cur, r.result.err)

      os.push(r.result.value)
      cur = r.cursor
    }
    return parseOk(cur, os)
  }
}

// Primitive
export function flatMap<I, M, O>(p: Parser<I, M>, f: (m: M) => Parser<I, O>): Parser<I, O> {
  return (c) => {
    const r = p(c)
    return r.result.ok ? f(r.result.value)(r.cursor) : parseErr(c, r.result.err)
  }
}

// map p f = flatMap p (fun m -> succeed (f m))
export function map<I, M, O>(p: Parser<I, M>, f: (m: M) => O): Parser<I, O> {
  return (c) => {
    const r = p(c)
    return r.result.ok ? parseOk(r.cursor, f(r.result.value)) : parseErr(c, r.result.err)
  }
}
