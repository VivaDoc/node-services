// Module for functions relating to working with a file

import R from "ramda"

import * as SH from "./string-helpers"


/** Split the content of a file by line seperators.

  For the reverse function, check out `mergeLinesIntoFileContent`.
*/
export const splitFileContentIntoLines = (fileContent: string): string[] => {
  if (fileContent === "") { return [] }

  const fileContentLines = fileContent.split(SH.REGEX_MATCH_NEWLINE)

  // The last line ended in a line seperator as it SHOULD (unfortunately it might not always...)
  if (R.last(fileContentLines) === "") { return R.dropLast(1, fileContentLines) }

  return fileContentLines
}

/** Merge lines into a single string using the standard `\n` seperator.

  This will add a `\n` line terminator to the end.

  For the reverse function, check out `splitFileContentIntoLines`.
*/
export const mergeLinesIntoFileContent = (fileContentLines: string[]): string => {
  if (fileContentLines.length === 0) { return "" }
  
  return fileContentLines.join("\n").concat("\n")
}

/** Get the number of lines of a file represented as a `string` or `string[]`.

  This should only be used on files because it assumes there is a final EOF token.
*/
export const getNumberOfLinesForFile = (fileContent: string | string[]) => {
  if (Array.isArray(fileContent)) {
    return fileContent.length
  }

  return splitFileContentIntoLines(fileContent).length
}
