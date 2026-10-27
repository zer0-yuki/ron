import {
  Keyword,
  KeywordTokenOf,
  Punct,
  PunctTokenOf,
  Token,
  TokenKind,
  TokenOf,
} from '../lexer/token.js'
import {
  between,
  choice,
  lazy,
  many,
  many1,
  map,
  or,
  pair,
  pairR,
  Parser,
  satisfy,
  seq,
} from '../utils/parser/index.js'
import { additiveOps, Expr, multiplicativeOps, VarExpr } from './expr.js'

function symbol<S extends Punct>(s: S): Parser<Token, PunctTokenOf<S>> {
  return satisfy(
    (t: Token): t is PunctTokenOf<S> => t.kind === 'symbol' && t.punct === s,
    `symbol '${s}'`
  )
}

function keyword<K extends Keyword>(k: K): Parser<Token, KeywordTokenOf<K>> {
  return satisfy((t: Token): t is KeywordTokenOf<K> => t.kind === 'keyword' && t.keyword === k)
}

function token<K extends TokenKind>(k: K, expected: string) {
  return satisfy((t: Token): t is TokenOf<K> => t.kind === k, expected)
}

// expr ::= addExpr
const expr: Parser<Token, Expr> = lazy(() => or(lambdaExpr, addExpr))

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
        Expr.unary(o.punct, e)
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
  ([first, rest]) => rest.reduce((l, [o, r]) => Expr.binary(o.punct, l, r), first)
)

// addExpr ::= mulExpr (('+' | '-') mulExpr)*
const addExpr = map(
  pair(mulExpr, many(pair(choice(additiveOps.map(symbol), 'additive operator'), mulExpr))),
  ([first, rest]) => rest.reduce((l, [o, r]) => Expr.binary(o.punct, l, r), first)
)

// paramList ::= ident (',' ident)*
const paramList = map(
  pair(ident, many(pairR(symbol(','), ident))),
  ([first, rest]) => [first, ...rest] satisfies [VarExpr, ...VarExpr[]]
)

// lambdaExpr ::= 'fun' paramList '->' expr
const lambdaExpr = map(seq(keyword('fun'), paramList, symbol('->'), expr), ([_, args, __, body]) =>
  Expr.lambda(args, body)
)

export { expr as parse }
