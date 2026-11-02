import { Offset } from '../../utils/span.js'
import { IsTuple, TupleToIntersection } from '../../utils/type.js'
import { ChoiceError, ParseError, SequenceError, UnexpectedError } from './error.js'

export interface ParseResultMeta<I> {
  readonly cursor: Cursor<I>
}

export interface ParseSuccess<I, O> extends ParseResultMeta<I> {
  readonly hasOutcome: true
  readonly hasError: false

  readonly outcome: O
}

export interface ParseFailure<I> extends ParseResultMeta<I> {
  readonly hasOutcome: false
  readonly hasError: true

  readonly error: ParseError<I>
}

export interface ParseRecovered<I, O> extends ParseResultMeta<I> {
  readonly hasOutcome: true
  readonly hasError: true

  readonly outcome: O
  readonly error: ParseError<I>
}

export type ParseResult<I, O> = ParseSuccess<I, O> | ParseFailure<I> | ParseRecovered<I, O>

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

function parseSuccess<I, O>(c: Cursor<I>, o: O): ParseSuccess<I, O> {
  return { hasOutcome: true, hasError: false, cursor: c, outcome: o }
}
function parseFailure<I>(c: Cursor<I>, e: ParseError<I>): ParseFailure<I> {
  return { hasOutcome: false, hasError: true, cursor: c, error: e }
}
function parseRecovered<I, O>(c: Cursor<I>, o: O, e: ParseError<I>): ParseRecovered<I, O> {
  return { hasOutcome: true, hasError: true, cursor: c, outcome: o, error: e }
}

function seqResult<I, O>(c: Cursor<I>, o: O, errors: readonly ParseError<I>[]): ParseResult<I, O> {
  if (errors.length === 0) return parseSuccess(c, o)
  return parseRecovered(c, o, errors.length === 1 ? errors[0] : new SequenceError(errors))
}

export interface Cursor<I> {
  current: I | undefined
  advance(): Cursor<I>
  readonly position: Offset
}

export function cursorOf<I>(
  inputs: readonly I[],
  offsetOf: (input: I, i: number) => Offset
): Cursor<I> {
  const mk = (p: number): Cursor<I> => ({
    current: p < inputs.length ? inputs[p] : undefined,
    advance() {
      return mk(p + 1)
    },
    position: p < inputs.length ? offsetOf(inputs[p], p) : inputs.length,
  })
  return mk(0)
}

export interface Parser<I, O> {
  (cursor: Cursor<I>): ParseResult<I, O>
}

type AnyParser = Parser<any, any>

export function succeed<I, O>(o: O): Parser<I, O> {
  return (c) => parseSuccess(c, o)
}

export function fail<I, O>(e: ParseError<I>): Parser<I, O> {
  return (c) => parseFailure(c, e)
}

export function attempt<I, O>(p: Parser<I, O>): Parser<I, O> {
  return (c) => {
    const r = p(c)
    if (r.hasOutcome) return r
    return parseFailure(c, r.error)
  }
}

export function skipUntil<I>(sync: (i: I) => boolean): Parser<I, void> {
  return (c) => {
    let cur = c
    while (true) {
      const i = cur.current
      if (i === undefined || sync(i)) break
      cur = cur.advance()
    }
    return parseSuccess(cur, undefined)
  }
}

export function recover<I, O>(
  p: Parser<I, O>,
  sync: (i: I) => boolean,
  mk: (start: Offset, end: Offset) => O
): Parser<I, O> {
  return (c) => {
    const r = p(c)
    if (r.hasOutcome) return r
    const cur = skipUntil(sync)(r.cursor).cursor
    return parseRecovered(cur, mk(c.position, cur.position), r.error)
  }
}

// Primitive
function satisfy<I, O extends I>(pred: (input: I) => input is O, expected?: string): Parser<I, O>
function satisfy<I>(pred: (input: I) => boolean, expected?: string): Parser<I, I>

function satisfy<I>(pred: (input: I) => boolean, expected?: string): Parser<I, I> {
  return (c) => {
    const input = c.current
    if (input === undefined || !pred(input)) {
      return parseFailure(c, new UnexpectedError(expected, input))
    }
    return parseSuccess(c.advance(), input)
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
  expected?: string
): Parser<InputOf<Ps[number]>, OutputOf<Ps[number]>> {
  return (c) => {
    const errs: ParseError<InputOf<Ps[number]>>[] = []
    for (const p of ps) {
      const r = p(c)
      if (r.hasOutcome || r.cursor.position !== c.position) return r
      errs.push(r.error)
    }
    return parseFailure(c, new ChoiceError(expected, c.current, errs))
  }
}

// or p1 p2 = choice (p1, p2)
export function or<I, O1, O2>(
  p1: Parser<I, O1>,
  p2: Parser<I, O2>,
  expected?: string
): Parser<I, O1 | O2> {
  return (c) => {
    const r1 = p1(c)
    if (r1.hasOutcome) return r1

    const r2 = p2(c)
    if (r2.hasOutcome) return r2

    return parseFailure(c, new ChoiceError(expected, c.current, [r1.error, r2.error]))
  }
}

// seq () = succeed ()
// seq (p : ps) = flatMap p (fun x -> map (seq ps) (fun xs -> (x : xs)))
export function seq<Ps extends AnyParser[]>(...ps: Ps): Parser<InputsOf<Ps>, OutputsOf<Ps>> {
  return (c) => {
    const os: OutputsOf<Ps> = [] as OutputsOf<Ps>
    let cur = c
    const errors: ParseError<InputsOf<Ps>>[] = []
    for (const p of ps) {
      const r = p(cur)
      if (!r.hasOutcome) return r

      os.push(r.outcome)
      cur = r.cursor
      if (r.hasError) errors.push(r.error)
    }
    return seqResult(cur, os, errors)
  }
}

// pair p1 p2 = seq (p1, p2)
export function pair<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, [O1, O2]> {
  return (c) => {
    const r1 = p1(c)
    if (!r1.hasOutcome) return r1

    const r2 = p2(r1.cursor)
    if (!r2.hasOutcome) return r2

    const errors: ParseError<I>[] = []
    if (r1.hasError) errors.push(r1.error)
    if (r2.hasError) errors.push(r2.error)

    return seqResult(r2.cursor, [r1.outcome, r2.outcome], errors)
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
    if (!rL.hasOutcome) return rL

    const r = p(rL.cursor)
    if (!r.hasOutcome) return r

    const rR = pR(r.cursor)
    if (!rR.hasOutcome) return rR

    const errors: ParseError<I>[] = []
    if (rL.hasError) errors.push(rL.error)
    if (r.hasError) errors.push(r.error)
    if (rR.hasError) errors.push(rR.error)

    return seqResult(rR.cursor, r.outcome, errors)
  }
}

// pairL p1 p2 = map (seq (p1, p2)) (fun (x, _) -> x)
export function pairL<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, O1> {
  return (c) => {
    const r1 = p1(c)
    if (!r1.hasOutcome) return r1

    const r2 = p2(r1.cursor)
    if (!r2.hasOutcome) return r2

    const errors: ParseError<I>[] = []
    if (r1.hasError) errors.push(r1.error)
    if (r2.hasError) errors.push(r2.error)

    return seqResult(r2.cursor, r1.outcome, errors)
  }
}

// pairR p1 p2 = map (seq (p1, p2)) (fun (_, x) -> x)
export function pairR<I, O1, O2>(p1: Parser<I, O1>, p2: Parser<I, O2>): Parser<I, O2> {
  return (c) => {
    const r1 = p1(c)
    if (!r1.hasOutcome) return r1

    const r2 = p2(r1.cursor)
    if (!r2.hasOutcome) return { ...r2 }

    const errors: ParseError<I>[] = []
    if (r1.hasError) errors.push(r1.error)
    if (r2.hasError) errors.push(r2.error)

    return seqResult(r2.cursor, r2.outcome, errors)
  }
}

// Primitive
export function many<I, O>(p: Parser<I, O>): Parser<I, O[]> {
  return (c) => {
    const os: O[] = []
    let cur = c
    const errors: ParseError<I>[] = []
    while (true) {
      const r = p(cur)
      if (!r.hasOutcome) {
        if (r.cursor.position !== cur.position) return r
        break
      }

      os.push(r.outcome)
      cur = r.cursor
      if (r.hasError) errors.push(r.error)
    }

    return seqResult(cur, os, errors)
  }
}

// many1 p = map (pair p (many p)) (fun (x, xs) -> x : xs)
export function many1<I, O>(p: Parser<I, O>): Parser<I, [O, ...O[]]> {
  return (c) => {
    const r0 = p(c)
    if (!r0.hasOutcome) return r0

    const os: [O, ...O[]] = [r0.outcome]
    let cur = r0.cursor
    const errors: ParseError<I>[] = []
    if (r0.hasError) errors.push(r0.error)
    while (true) {
      const r = p(cur)
      if (!r.hasOutcome) {
        if (r.cursor.position !== cur.position) return r
        break
      }

      os.push(r.outcome)
      cur = r.cursor
      if (r.hasError) errors.push(r.error)
    }

    return seqResult(cur, os, errors)
  }
}

// repeat p n = seq (replicate n p)
export function repeat<I, O>(p: Parser<I, O>, n: number): Parser<I, O[]> {
  return (c) => {
    const os: O[] = []
    let cur = c
    const errors: ParseError<I>[] = []
    for (let i = 0; i < n; i++) {
      const r = p(cur)
      if (!r.hasOutcome) return r

      os.push(r.outcome)
      cur = r.cursor
      if (r.hasError) errors.push(r.error)
    }

    return seqResult(cur, os, errors)
  }
}

// Primitive
export function flatMap<I, M, O>(p: Parser<I, M>, f: (m: M) => Parser<I, O>): Parser<I, O> {
  return (c) => {
    const r1 = p(c)
    if (!r1.hasOutcome) return r1

    const r2 = f(r1.outcome)(r1.cursor)
    if (!r2.hasOutcome) return r2

    const errors: ParseError<I>[] = []
    if (r1.hasError) errors.push(r1.error)
    if (r2.hasError) errors.push(r2.error)

    return seqResult(r2.cursor, r2.outcome, errors)
  }
}

// map p f = flatMap p (fun m -> succeed (f m))
export function map<I, M, O>(p: Parser<I, M>, f: (m: M) => O): Parser<I, O> {
  return (c) => {
    const r = p(c)
    return r.hasOutcome ? { ...r, outcome: f(r.outcome) } : r
  }
}
