export interface IntToken {
  kind: 'int'
  value: number
}

export interface IdentToken {
  kind: 'ident'
  name: string
}

export interface SymbolTokenOf<O> {
  kind: 'symbol'
  symbol: O
}

export interface KeywordTokenOf<K> {
  kind: 'keyword'
  keyword: K
}

export const symbols = ['+', '-', '*', '/', '(', ')'] as const
export type Symbol = (typeof symbols)[number]
export type SymbolToken = SymbolTokenOf<Symbol>

export const keywords = ['let', 'in'] as const
export type Keyword = (typeof keywords)[number]
export type KeywordToken = KeywordTokenOf<Keyword>

export type Token = IntToken | IdentToken | SymbolToken | KeywordToken
export type TokenKind = Token['kind']
export type TokenOf<K extends TokenKind> = Extract<Token, { kind: K }>

export const Token = {
  int(v: number): IntToken {
    return { kind: 'int', value: v }
  },
  ident(name: string): IdentToken {
    return { kind: 'ident', name }
  },
  symbol<S extends Symbol>(s: S): SymbolTokenOf<S> {
    return { kind: 'symbol', symbol: s }
  },
  keyword<K extends Keyword>(k: K): KeywordTokenOf<K> {
    return { kind: 'keyword', keyword: k }
  },
}
