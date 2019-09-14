// Module for defining api errors facing the client.


export interface ClientError<T> {
  errorCode: number; // for simple parsing on the client
  httpCode: number;  // eg. 404
  message: string;
  data?: T;          // any extra data that may help the client
}


export const extractClientError = (err: any): null | ClientError<any> => {
  if ( (typeof (err as ClientError<any>).httpCode === "number")
          && (typeof (err as ClientError<any>).message === "string")
          && (typeof (err as ClientError<any>).errorCode === "number")
  ) {
    return err;
  }

  return null;
}


const createClientError =
  <T> ( errorCode: number
      , httpCode: number
      , message: string
      , data?: T
      ) : ClientError<T> => {

  const clientError = { message, errorCode, httpCode };

  if (data !== undefined) { return { ...clientError, data } }

  return clientError;
}


export const notLoggedInError =
  createClientError(1, 401, "You must be logged in to access this endpoint...");

export const noAccessToRepoError =
  createClientError(2, 401, "You do not have access to this repo...");

export const noModifyingTagsYouDontOwn =
  createClientError(3, 403, "You can not perform this operation on tags that you don't own...");

export const noPullRequestReview =
  createClientError(4, 404, "Unable to find a review for that pull request...");

export const noCommitReview =
  createClientError(5, 404, "Unable to find a review for that commit...");

export const noRepo =
  createClientError(6, 404, "Unable to find that repo...");

export const noUpdatingNonHeadCommit = (newHeadCommitId: string) => {
  return createClientError(7, 423, "You can only update the head commit...", newHeadCommitId);
}

export const internalServerError =
  createClientError(8, 500, "There was an unknown internal server error...");

export const commitStillLoading =
  createClientError(9, 423, "The analysis for the commit is still being calculated");

export const invalidRequestBodyType = (errMssg: string) => {
  return createClientError(10, 400, errMssg)
}

export const invalidUrlParams = (errMssg: string) => {
  return createClientError(11, 400, errMssg);
}

export const noModifyingTagsThatDontExist =
  createClientError(12, 403, "You cannot modify tags that don't exist");

export const userAssmentsMustBeToUniqueTags =
  createClientError(13, 400, "User assessments must all point to different tags");

export const invalidRoute = (routeData: any) => {
  return createClientError(14, 404, `That route does not exist.`, routeData);
}
