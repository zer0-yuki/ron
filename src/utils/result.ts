export interface Ok<T> {
  ok: true
  value: T
}

export interface Err<E> {
  ok: false
  err: E
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(err: E): Err<E> {
  return { ok: false, err }
}

export type Result<T, E> = Ok<T> | Err<E>
