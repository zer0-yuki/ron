abstract class ParseErrorBase {
  abstract readonly kind: string
}

export class UnexpectedError<I> extends ParseErrorBase {
  readonly kind = 'unexpected' as const
  constructor(
    private readonly expected: string | undefined,
    private readonly found: I | undefined
  ) {
    super()
  }
}

export class ChoiceError<I> extends ParseErrorBase {
  readonly kind = 'choice' as const
  constructor(
    private readonly expected: string | undefined,
    private readonly found: I | undefined,
    private readonly related: readonly ParseError<I>[]
  ) {
    super()
  }
}

export class SequenceError<I> extends ParseErrorBase {
  readonly kind = 'sequence' as const
  constructor(private readonly related: readonly ParseError<I>[]) {
    super()
  }
}

export class UnknownError extends ParseErrorBase {
  readonly kind = 'unknown' as const
}

export type ParseError<I> = UnexpectedError<I> | ChoiceError<I> | SequenceError<I> | UnknownError
