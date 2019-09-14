export type SettledPromise<T, E> = SettledResolvedPromise<T> | SettledRejectedPromise<E>

export interface SettledResolvedPromise<T> {
  promiseDid: "resolve",
  with: T
}

export interface SettledRejectedPromise<E> {
  promiseDid: "reject",
  with: E
}


// Settle all promises, regardless of whether they reject / resolve.
// @VD amilner42 block
export const settleAll = <T, E>(promiseArray: Promise<T>[]): Promise<SettledPromise<T, E>[]> => {

  const wrappedPromises = promiseArray.map(async (promise) => {

    try {

      const promiseResult = await promise;
      const wrappedPromise: SettledResolvedPromise<T> =  {
        promiseDid: "resolve",
        with: promiseResult
      }

      return wrappedPromise;

    } catch (err) {

      const wrappedPromise: SettledRejectedPromise<E> = {
        promiseDid: "reject",
        with: err
      }

      return wrappedPromise;
    }

  });

  return Promise.all(wrappedPromises);
}
// @VD end-block


export const getResolvedSettlements = <T, E>(settledPromises: SettledPromise<T, E>[]): T[] => {

  const settledResolvedPromises = settledPromises.filter(wasResolved) as SettledResolvedPromise<T>[];

  return settledResolvedPromises.map((settledPromise) => settledPromise.with);
}


export const getRejectedSettlements = <T, E>(settledPromises: SettledPromise<T, E>[]): E[] => {

  const settledRejectedPromises = settledPromises.filter(wasRejected) as SettledRejectedPromise<E>[];

  return settledRejectedPromises.map((settledPromise) => settledPromise.with);
}


export const wasResolved = <T, E>(settledPromise: SettledPromise<T, E>): boolean => {
  switch (settledPromise.promiseDid) {
    case "resolve":
      return true;

    case "reject":
      return false;
  }
}

export const wasRejected = <T, E>(settledPromise: SettledPromise<T, E>): boolean => {
  switch (settledPromise.promiseDid) {
    case "resolve":
      return false;

    case "reject":
      return true;
  }
}
