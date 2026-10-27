import {
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
} from '../utils/parser/index.js'
import {
  IdentToken,
  IntToken,
  Keyword,
  keywords,
  KeywordToken,
  Punct,
  puncts,
  PunctToken,
  Token,
} from './token.js'

// whitespace
const ws = map(
  many(satisfy((c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r', 'whitespace')),
  () => {}
)

// int
const digit = satisfy((c: string) => c >= '0' && c <= '9', 'digits')
const int: Parser<string, IntToken> = flatMap(many1(digit), (ds) =>
  succeed(Token.int(Number(ds.join(''))))
)

// ident or keyword
const alpha = satisfy((c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))
const isKeyword = (s: string): s is Keyword => keywords.includes(s as Keyword)
const identOrKeyword: Parser<string, IdentToken | KeywordToken> = flatMap(many1(alpha), (strs) => {
  const s = strs.join('')
  return succeed(isKeyword(s) ? Token.keyword(s) : Token.ident(s))
})

// punct
function punct<P extends Punct>(p: P) {
  return map(seq(...[...p].map((s) => satisfy((c: string) => c === s, s))), () =>
    Token.punct(p)
  )
}

const symbol: Parser<string, PunctToken> = choice(puncts.map(punct))

// lexer
export const lex: Parser<string, Token[]> = pairR(
  ws,
  many(pairL(choice([int, identOrKeyword, symbol]), ws))
)
