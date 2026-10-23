abstract class ParseErrorBase {
  abstract readonly kind: string
}

export class UnexpectedError<I> extends ParseErrorBase {
  readonly kind = 'unexpected' as const
  constructor(
    private readonly expected: string,
    private readonly found: I | undefined
  ) {
    super()
  }
}

export class UnknownError extends ParseErrorBase {
  readonly kind = 'unknown' as const
}

export type ParseError<I> = UnexpectedError<I> | UnknownError
