import * as F from "./functional";
import * as Log from "./log";

import mongoose from "mongoose"
import * as LogError from "./models/LogError";
const LogErrorModel = mongoose.model("LogError");


/**
 * A high-quality github-app error meant to be logged.
 *
 * All errors meant to be logged in the github-app should try to be of this format to make it easier to debug.
 */
export interface LogFriendlyGithubAppError {
  name: string;
  installationId: number;
  isSevere: boolean;
  data?: any;
  stack: string;
}


// Errors related to parsing tags.
//
// NOTE: These are not meant to be logged but instead displayed to the user.
export interface ParseTagError {
  parseTagError: true;
  errorName: string;
  clientExplanation: string;
}


// @THROWS never.
export const logErrors = async (err: any, errorSource: "github-app" | "api" , webhookName: F.Maybe<string>): Promise<void> => {

  if (Array.isArray(err)) {

    await Promise.all(
      err.map(async (errItem) => {
        return await logErrors(errItem, errorSource, webhookName);
      })
    );

    return;
  }

  return await logError(err, errorSource, webhookName);
}


// @THROWS never.
const logError = async (err: any, errorSource: "github-app" | "api", webhookName: F.Maybe<string>): Promise<void> => {

  const errorMessageToLog: string[] = [ `An error occured within the ${errorSource}` ];

  if (F.isJust(webhookName)) {
    errorMessageToLog.push(`This boiled up to the webhook: ${webhookName}`);
  }

  const asLogFriendlyGithubAppError = isLogFriendlyGithubAppError(err);

  if (asLogFriendlyGithubAppError !== null) {
    errorMessageToLog.push(...logMessageForLogFriendlyGithubAppError(asLogFriendlyGithubAppError));
  }

  try {
    const logError: LogError.LogError = {
      errorSource,
      error: err
    };
    await (new LogErrorModel(logError)).save();
    errorMessageToLog.push(`Saved loggable error to database`);
  } catch (err) {
    errorMessageToLog.push(`Could not save loggable error to database`);
  }

  Log.error(errorMessageToLog.join("\n"));
}


// A wrapper for all webhooks.
//
// Will catch and log errors. It will handle both single errors and nested arrays of errors properly.
//
// @VD amilner42 block
export const webhookErrorWrapper =
  async ( webhookName: string
        , webhookCode: () => Promise<void>
        ): Promise<void> => {

  try {
    await webhookCode();
  } catch (err) {
    await logErrors(err, "github-app", webhookName);
  }
}
// @VD end-block


export const getStack = (): string => {

  const stack = new Error().stack;

  if (stack === undefined) {
    return "No stack available";
  }

  return stack;
}


export const isGithubAppParseTagError = (err: any): F.Maybe<ParseTagError> => {

  if (typeof err !== "object") {
    return null;
  }

  if ( (err as ParseTagError).parseTagError
        && typeof (err as ParseTagError).clientExplanation === "string"
        && typeof (err as ParseTagError).errorName === "string"
  ) {
    return err;
  }

  return null;
}


export const isLogFriendlyGithubAppError = (err: any): LogFriendlyGithubAppError | null => {
  if (typeof err !== "object") { return null; }

  if ( typeof (err as LogFriendlyGithubAppError).name === "string"
        && typeof (err as LogFriendlyGithubAppError).installationId === "number"
        && typeof (err as LogFriendlyGithubAppError).isSevere === "boolean"
        && typeof (err as LogFriendlyGithubAppError).stack === "string"
  ) {
    return err;
  }

  return null;
}


const logMessageForLogFriendlyGithubAppError = (err: LogFriendlyGithubAppError): string[] => {

  const baseMessage = [
    `Error is of the type: LogFriendlyGithubAppError`,
    `  It is for installation ${err.installationId} and has name: ${err.name}`,
    err.isSevere ? `  The error is severe` : `  The error is NOT severe`,
    `  The error has stack: ${err.stack}`
  ];

  try {
    const dataStringified = JSON.stringify(err.data);
    baseMessage.push(`The data stringified is: ${dataStringified}`);
  } catch {
    baseMessage.push(`The data is unable to be stringified for logging.`);
  }

  return baseMessage;
}
