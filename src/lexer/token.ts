import { Span, WithSpan } from '../utils/span.js'

export interface IntToken extends WithSpan {
  kind: 'int'
  value: number
}

export interface IdentToken extends WithSpan {
  kind: 'ident'
  name: string
}

export interface PunctTokenOf<P> extends WithSpan {
  kind: 'punct'
  punct: P
}

export interface KeywordTokenOf<K> extends WithSpan {
  kind: 'keyword'
  keyword: K
}

export const punctsSingle = ['+', '-', '*', '/', '(', ')', ','] as const
export const punctsDouble = ['->'] as const
export const puncts = [...punctsDouble, ...punctsSingle] as const
export type Punct = (typeof puncts)[number]
export type PunctToken = PunctTokenOf<Punct>

export const keywords = ['let', 'in', 'fun'] as const
export type Keyword = (typeof keywords)[number]
export type KeywordToken = KeywordTokenOf<Keyword>

export type Token = IntToken | IdentToken | PunctToken | KeywordToken
export type TokenKind = Token['kind']
export type TokenOf<K extends TokenKind> = Extract<Token, { kind: K }>

export const Token = {
  int(v: number, span: Span): IntToken {
    return { kind: 'int', value: v, span }
  },
  ident(name: string, span: Span): IdentToken {
    return { kind: 'ident', name, span }
  },
  punct<P extends Punct>(p: P, span: Span): PunctTokenOf<P> {
    return { kind: 'punct', punct: p, span }
  },
  keyword<K extends Keyword>(k: K, span: Span): KeywordTokenOf<K> {
    return { kind: 'keyword', keyword: k, span }
  },
}
