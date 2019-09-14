// Module for useful common types in functional languages.

/** COMMON BASIC FUNCTIONAL-STYLE TYPES. */

// A basic maybe type
export type Maybe<T> = T | null


export const isJust = <T>(val: Maybe<T>) => {
  if (val === null) { return false }

  return true;
}

export const isNull = <T>(val: Maybe<T>) => {
  return !isJust(val);
}

export const withDefault = <T>(val: Maybe<T>, defaultValue: T): T => {

  if (val !== null) { return val; }

  return defaultValue;
}

/** UNIONS */

// A type with 2 options
export type Bi<A, B> = Branch<"case-1", A> | Branch<"case-2", B>

// A type with 3 options
export type Tri<A,B,C> = Branch<"case-1", A> | Branch<"case-2", B> | Branch<"case-3", C>

export interface Branch<Branch, ValueType> {
  branchTag: Branch;
  value: ValueType;
}

export const branch1 = <A>(value: A): Branch<"case-1", A> => {
  return { branchTag: "case-1", value }
}

export const branch2 = <A>(value: A): Branch<"case-2", A> => {
  return { branchTag: "case-2", value }
}

export const branch3 = <A>(value: A): Branch<"case-3", A> => {
  return { branchTag: "case-3", value }
}
