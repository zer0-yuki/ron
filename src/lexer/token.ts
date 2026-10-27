export interface IntToken {
  kind: 'int'
  value: number
}

export interface IdentToken {
  kind: 'ident'
  name: string
}

export interface PunctTokenOf<P> {
  kind: 'punct'
  punct: P
}

export interface KeywordTokenOf<K> {
  kind: 'keyword'
  keyword: K
}

export const puncts = ['->', '+', '-', '*', '/', '(', ')', ','] as const
export type Punct = (typeof puncts)[number]
export type PunctToken = PunctTokenOf<Punct>

export const keywords = ['let', 'in', 'fun'] as const
export type Keyword = (typeof keywords)[number]
export type KeywordToken = KeywordTokenOf<Keyword>

export type Token = IntToken | IdentToken | PunctToken | KeywordToken
export type TokenKind = Token['kind']
export type TokenOf<K extends TokenKind> = Extract<Token, { kind: K }>

export const Token = {
  int(v: number): IntToken {
    return { kind: 'int', value: v }
  },
  ident(name: string): IdentToken {
    return { kind: 'ident', name }
  },
  punct<P extends Punct>(p: P): PunctTokenOf<P> {
    return { kind: 'punct', punct: p }
  },
  keyword<K extends Keyword>(k: K): KeywordTokenOf<K> {
    return { kind: 'keyword', keyword: k }
  },
}
