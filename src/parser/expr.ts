export interface IntExpr {
  kind: 'int'
  value: number
}

export interface VarExpr {
  kind: 'var'
  name: string
}

export interface AppExpr {
  kind: 'app'
  fn: Expr
  args: [Expr, ...Expr[]]
}

export interface UnaryOpExprOf<O> {
  kind: 'unary'
  op: O
  e: Expr
}

export interface BinaryOpExprOf<O> {
  kind: 'binary'
  op: O
  l: Expr
  r: Expr
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

export type Expr = IntExpr | VarExpr | AppExpr | OpExpr

export const Expr = {
  int(v: number): IntExpr {
    return { kind: 'int', value: v }
  },
  var(name: string): VarExpr {
    return { kind: 'var', name }
  },
  app(fn: Expr, args: [Expr, ...Expr[]]): AppExpr {
    return { kind: 'app', fn, args }
  },
  unary<O extends UnaryOp>(o: O, e: Expr): UnaryOpExprOf<O> {
    return { kind: 'unary', op: o, e }
  },
  binary<O extends BinaryOp>(o: O, l: Expr, r: Expr): BinaryOpExprOf<O> {
    return { kind: 'binary', op: o, l, r }
  },
}
