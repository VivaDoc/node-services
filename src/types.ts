/**
 * Reusable non-project-specific types located here.
 */

/**
 * Make all properties and nested properties in T requied.
 */
export type DeepRequired<T> = {
    [P in keyof T]-?: DeepRequired<T[P]>;
};

/**
 * Make specific properties required at all depths.
 */
export type DeepRequiredFields< T, K extends keyof any > =
    T extends object ?
        ({ [P1 in (Extract<keyof T, K>)]-?: DeepRequiredFields<T[P1], K> } &
        { [P2 in keyof Pick<T, Exclude<keyof T, K>>]: DeepRequiredFields<T[P2], K> })
    :
        T

/**
 * Omit specific properties.
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

/**
 * Replace some fields with some new ones with a given type.
 */
export type Replace<T, K extends keyof T, X extends keyof any, NewType> =
    Pick<T, Exclude<keyof T, K>> & { [P1 in X]: NewType }

/**
 * Replace the type of field(s) on the type.
 */
export type ReplaceType<T, K extends keyof T, NewType> =
    ReplaceTypeIfExsits<T, K, NewType>


/**
 * Similar to `ReplaceType` but does not enforce types being replaced exist on object.
 *
 * Useful when replacing fields on a union where each branch of the union does not have that field.
 */
export type ReplaceTypeIfExsits<T, K extends keyof any, NewType> =
    { [ P1 in keyof T]: P1 extends K ? NewType : T[P1] }


/**
 * For unpacking the generic type.
 *
 * @REFER https://stackoverflow.com/questions/56844747/extract-type-t-from-sometypet/56844816#56844816
 * @REFER https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types
 */
export type Unpacked<T> =
    T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
    T extends Promise<infer U> ? U :
    T;
