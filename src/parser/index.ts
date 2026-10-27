import { Symbol, SymbolTokenOf, Token, TokenKind, TokenOf } from '../lexer/token.js'
import {
  between,
  choice,
  lazy,
  many,
  many1,
  map,
  pair,
  Parser,
  satisfy,
} from '../utils/parser/index.js'
import { additiveOps, Expr, multiplicativeOps } from './expr.js'

function symbol<S extends Symbol>(s: S): Parser<Token, SymbolTokenOf<S>> {
  return satisfy(
    (t: Token): t is SymbolTokenOf<S> => t.kind === 'symbol' && t.symbol === s,
    `symbol '${s}'`
  )
}
function token<K extends TokenKind>(k: K, expected: string) {
  return satisfy((t: Token): t is TokenOf<K> => t.kind === k, expected)
}

// expr ::= addExpr
const expr: Parser<Token, Expr> = lazy(() => addExpr)

const int = map(token('int', 'int'), (t) => Expr.int(t.value))

const ident = map(token('ident', 'identifier'), (t) => Expr.var(t.name))

// atomExpr ::= int | ident | '(' expr ')'
const atomExpr = choice([int, ident, between(symbol('('), expr, symbol(')'))], 'primary expression')

// appExpr ::= atomExpr+
const appExpr = map(many1(atomExpr), ([fn, ...args]) => {
  return args.length === 0 ? fn : Expr.app(fn, args as [Expr, ...Expr[]])
})

// unaryExpr ::= (('+' | '-') unaryExpr) | appExpr
const unaryExpr: Parser<Token, Expr> = lazy(() =>
  choice(
    [
      map(pair(choice([symbol('+'), symbol('-')], 'unary operator'), unaryExpr), ([o, e]) =>
        Expr.unary(o.symbol, e)
      ),
      appExpr,
    ],
    'unary expressions'
  )
)

// mulExpr ::= unaryExpr (('*' | '/') unaryExpr)*
const mulExpr = map(
  pair(
    unaryExpr,
    many(pair(choice(multiplicativeOps.map(symbol), 'multiplicative operator'), unaryExpr))
  ),
  ([first, rest]) => rest.reduce((l, [o, r]) => Expr.binary(o.symbol, l, r), first)
)

// addExpr ::= mulExpr (('+' | '-') mulExpr)*
const addExpr = map(
  pair(mulExpr, many(pair(choice(additiveOps.map(symbol), 'additive operator'), mulExpr))),
  ([first, rest]) => rest.reduce((l, [o, r]) => Expr.binary(o.symbol, l, r), first)
)

export { expr as parse }
