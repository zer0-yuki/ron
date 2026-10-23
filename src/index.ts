import { lex } from './lexer/index.js'
import { parse } from './parser/index.js'
import { Cursor } from './utils/parser/index.js'

function makeCursor<T>(s: T[]): Cursor<T> {
  const mk = (p: number): Cursor<T> => ({
    position: p,
    peek() {
      return this.position < s.length ? s[this.position] : undefined
    },
    advance() {
      return mk(p + 1)
    },
  })
  return mk(0)
}

function main() {
  const src = '1 + (2 - 3) * 4'
  const lexResult = lex(makeCursor(Array.from(src)))

  if (!lexResult.result.ok) {
    console.log('[Lex Error]', lexResult.result.err)
    return
  }

  console.log(lexResult.cursor.position, '/', src.length)
  console.log(lexResult.result.value)

  const parseResult = parse(makeCursor(lexResult.result.value))

  if (!parseResult.result.ok) {
    console.log('[Parse Error]', parseResult.result.err)
    return
  }

  console.log(parseResult.result.value)
}

main()
