import { lex } from './lexer/index.js'
import { parse } from './parser/index.js'
import { cursorOf } from './core/parser/index.js'

function main() {
  // const src = 'f x 1 + (2 - 3) * 4'
  const src = '12345 + ) - 5 + 123 * 2 ('
  const lexResult = lex(cursorOf(Array.from(src), (_, i) => i, src.length))

  if (lexResult.hasError) {
    console.log('[Lex Error]')
    console.dir(lexResult.error, { depth: null })
  }

  if (!lexResult.hasOutcome) return

  console.log('Cursor at end:', lexResult.cursor.current === undefined)
  console.log('Tokens:')
  console.dir(lexResult.outcome, { depth: null })

  const parseResult = parse(cursorOf(lexResult.outcome, (t) => t.span.start, src.length))

  if (parseResult.hasError) {
    console.log('[Parse Error]')
    console.dir(parseResult.error, { depth: null })
  }

  if (!parseResult.hasOutcome) return

  console.log('AST:')
  console.dir(parseResult.outcome, { depth: null })
}

main()
