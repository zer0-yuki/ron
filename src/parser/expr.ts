import { Span, WithSpan } from '../utils/span.js'

export interface IntExpr extends WithSpan {
  kind: 'int'
  value: number
}

export interface VarExpr extends WithSpan {
  kind: 'var'
  name: string
}

export interface AppExpr extends WithSpan {
  kind: 'app'
  fn: Expr
  args: [Expr, ...Expr[]]
}

export interface UnaryOpExprOf<O> extends WithSpan {
  kind: 'unary'
  op: O
  e: Expr
}

export interface BinaryOpExprOf<O> extends WithSpan {
  kind: 'binary'
  op: O
  l: Expr
  r: Expr
}

export interface LambdaExpr extends WithSpan {
  kind: 'lambda'
  args: readonly [VarExpr, ...VarExpr[]]
  body: Expr
}

export interface LetInExpr extends WithSpan {
  kind: 'letin'
  bindings: readonly [readonly [VarExpr, Expr], ...(readonly [VarExpr, Expr])[]]
  body: Expr
}

export interface ErrorExpr extends WithSpan {
  kind: 'error'
}

export const unaryOps = ['+', '-'] as const
export type UnaryOp = (typeof unaryOps)[number]
export type UnaryOpExpr = UnaryOpExprOf<UnaryOp>

export const additiveOps = ['+', '-'] as const
export const multiplicativeOps = ['*', '/'] as const
export const binaryOps = [...additiveOps, ...multiplicativeOps] as const
export type BinaryOp = (typeof binaryOps)[number]
export type BinaryOpExpr = BinaryOpExprOf<BinaryOp>

export type Op = UnaryOp | BinaryOp
export type OpExpr = UnaryOpExpr | BinaryOpExpr

export type Expr = IntExpr | VarExpr | AppExpr | OpExpr | LambdaExpr | LetInExpr | ErrorExpr

export const Expr = {
  int(v: number, span: Span): IntExpr {
    return { kind: 'int', value: v, span }
  },
  var(name: string, span: Span): VarExpr {
    return { kind: 'var', name, span }
  },
  app(fn: Expr, args: [Expr, ...Expr[]], span: Span): AppExpr {
    return { kind: 'app', fn, args, span }
  },
  unary<O extends UnaryOp>(o: O, e: Expr, span: Span): UnaryOpExprOf<O> {
    return { kind: 'unary', op: o, e, span }
  },
  binary<O extends BinaryOp>(o: O, l: Expr, r: Expr, span: Span): BinaryOpExprOf<O> {
    return { kind: 'binary', op: o, l, r, span }
  },
  lambda(args: readonly [VarExpr, ...VarExpr[]], body: Expr, span: Span): LambdaExpr {
    return { kind: 'lambda', args, body, span }
  },
  letIn(
    bindings: readonly [readonly [VarExpr, Expr], ...(readonly [VarExpr, Expr])[]],
    body: Expr,
    span: Span
  ): LetInExpr {
    return { kind: 'letin', bindings, body, span }
  },
  error(span: Span): ErrorExpr {
    return { kind: 'error', span }
  },
}
