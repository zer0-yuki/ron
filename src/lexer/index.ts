import {
  attempt,
  flatMap,
  many,
  map,
  Parser,
  satisfy,
  pairL,
  succeed,
  choice,
  pairR,
  many1,
  seq,
  skipUntil,
} from '../core/parser/index.js'
import { spanned } from '../utils/span.js'
import {
  IdentToken,
  IntToken,
  Keyword,
  keywords,
  KeywordToken,
  Punct,
  punctsDouble,
  punctsSingle,
  PunctToken,
  Token,
} from './token.js'

// whitespace
const ws = skipUntil((c: string) => !(c === ' ' || c === '\t' || c === '\n' || c === '\r'))

// int
const digit = satisfy((c: string) => c >= '0' && c <= '9', 'digits')
const intToken: Parser<string, IntToken> = flatMap(spanned(many1(digit)), ({ value: ds, span }) =>
  succeed(Token.int(Number(ds.join('')), span))
)

// ident or keyword
const alpha = satisfy((c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))
const isKeyword = (s: string): s is Keyword => keywords.includes(s as Keyword)
const identOrKeywordToken: Parser<string, IdentToken | KeywordToken> = flatMap(
  spanned(many1(alpha)),
  ({ value: strs, span }) => {
    const s = strs.join('')
    return succeed(isKeyword(s) ? Token.keyword(s, span) : Token.ident(s, span))
  }
)

// punct
function punct<P extends Punct>(p: P) {
  return map(spanned(seq(...[...p].map((s) => satisfy((c: string) => c === s, s)))), ({ span }) =>
    Token.punct(p, span)
  )
}
const punctToken: Parser<string, PunctToken> = choice([
  ...punctsDouble.map((p) => attempt(punct(p))),
  ...punctsSingle.map((p) => punct(p)),
])

// lexer
export const lex: Parser<string, Token[]> = pairR(
  ws,
  many(pairL(choice([intToken, identOrKeywordToken, punctToken]), ws))
)
