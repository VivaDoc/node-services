// Module for functions for working with strings

import R from "ramda"


/** Regex match for newlines (across platforms).

It seems that while usually files use '\n', rarely you get '\r' (old mac systems) as the newline and on windows you get
'\r\n'. So here we just match against any of the 3.

@REFER https://stackoverflow.com/questions/1155678/javascript-string-newline-character

@VD amilner42 line
*/
export const REGEX_MATCH_NEWLINE = /\r\n|\r|\n/g


/** Get the number of lines for some string.

- Ending in a newline-terminator is not a new line, this is 1 line: "1\n".
- A single blank string "" is 0 lines.

@VD amilner42 block
*/
export const getNumberOfLines = (str: string): number => {
  if (str === "") { return 0 }

  const lines = str.split(REGEX_MATCH_NEWLINE)

  if (R.last(lines) === "") { return lines.length - 1 }

  return lines.length
}
// @VD end-block

/** Count the number of newline terminators in a string. */
export const getNumberOfNewLineTerminators = (str: string) => {
  return str.split(REGEX_MATCH_NEWLINE).length - 1
}
