export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never
export type TupleToIntersection<T extends any[]> = T extends [infer F, ...infer R]
  ? F & TupleToIntersection<R>
  : unknown
export type IsTuple<T extends readonly any[]> = number extends T['length'] ? false : true
