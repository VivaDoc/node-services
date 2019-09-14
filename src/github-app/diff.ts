// Module for working with git diffs.

import R from "ramda"

import * as Lang from "./languages/"
import * as File from "../file"
import * as F from "../functional"


/** EXTERNAL TYPES */

/** COMPOSITION */

export interface HasCurrentFilePath {
  currentFilePath: string;
}

export interface HasPreviousFilePath {
  previousFilePath: string;
}

export interface HasAlteredLines {
  alteredLines: AlteredLine[];
}

export interface HasLines {
  lines: string[];
}

/** A single [green/red] line from a git diff.

  Includes both the line number in the current version of the file and the line number from the previous version
  of the file - should only be used for modified files where the line numbers across files are relevant, for new/delted
  files you should `&` the more accurate type `HasLines`.

  @VD amilner42 block
 */
export interface AlteredLine {
  type: "added" | "deleted";
  currentLineNumber: number;
  previousLineNumber: number;
  content: string;
}
// @VD end-block

export type DiffType = "new" | "modified" | "renamed" | "deleted"

export type FileDiff = NewFileDiff | ModifiedFileDiff | RenamedFileDiff | DeletedFileDiff

export type NewFileDiff = HasCurrentFilePath & HasLines & {
  diffType: "new";
}

export type DeletedFileDiff = HasCurrentFilePath & HasLines & {
  diffType: "deleted";
}

export type ModifiedFileDiff = HasCurrentFilePath & HasAlteredLines & {
  diffType: "modified";
}

export type RenamedFileDiff = HasCurrentFilePath & HasPreviousFilePath & HasAlteredLines & {
  diffType: "renamed";
}

export type FileDiffWithLanguage =
  NewFileDiffWithLanguage | ModifiedFileDiffWithLanguage | RenamedFileDiffWithLanguage | DeletedFileDiffWithLanguage

export type NewFileDiffWithLanguage = NewFileDiff & Lang.HasCurrentLanguage

export type ModifiedFileDiffWithLanguage = ModifiedFileDiff & Lang.HasCurrentLanguage

export type RenamedFileDiffWithLanguage = RenamedFileDiff & Lang.HasCurrentLanguage & Lang.HasPreviousLanguage

export type DeletedFileDiffWithLanguage = DeletedFileDiff & Lang.HasCurrentLanguage

/** ERRORS */

export interface DiffParserError {
  name: "diff-parser";
  message: string;
}

const createDiffParserError = (errMssg: string): DiffParserError => {
  return {
    name: "diff-parser",
    message: errMssg
  }
}


/** CONSTANTS */

const FILE_DIFF_FIRST_LINE = "diff --git"
const DELETED_FILE_PREFIX = "deleted file"
const NEW_FILE_PREFIX = "new file"
const MODIFIED_NO_CHANGE_LINE_PREFIX = " "
const MODIFIED_ADDED_LINE_PREFIX = "+"
const MODIFIED_DELETED_LINE_PREFIX = "-"
const HUNK_PREFIX = "@@ "
const HUNK_SUFFIX = " @@" // there can be an optional header after this
const HUNK_CURRENT_RANGE_PREFIX = "+"
const HUNK_PREVIOUS_RANGE_PREFIX = "-"

/** External Functions */

// Main function of the module, will parse the git diff into a series of file diffs.
// @VD amilner42 block
export const parseDiff = (diffAsStr: string): FileDiff[] => {
  let remainingLines = File.splitFileContentIntoLines(diffAsStr)
  const fileDiffs: FileDiff[] = []

  while(remainingLines.length !== 0) {
    let [ postDiffRemainingLines, fileDiff ] = getSingleFileDiff(remainingLines)
    fileDiffs.push(fileDiff)
    remainingLines = postDiffRemainingLines
  }

  return fileDiffs;
}
// @VD end-block


// Keeps only languages we support.
// @VD amilner42 block
export const toFileDiffsWithLanguage = (fileDiffs: FileDiff[]): FileDiffWithLanguage[] => {

  return R.reduce<FileDiff, FileDiffWithLanguage[]>(
    (acc, fileDiff) => {
      switch (fileDiff.diffType) {

        case "renamed": {
          const previousLanguage = Lang.getLanguageFromFilePath(fileDiff.previousFilePath);
          const currentLanguage = Lang.getLanguageFromFilePath(fileDiff.currentFilePath);

          if (currentLanguage === null || previousLanguage === null) {
            return acc;
          }

          return acc.concat({ ...fileDiff, currentLanguage, previousLanguage })
        }

        case "deleted":
        case "new":
        case "modified":
          const currentLanguage = Lang.getLanguageFromFilePath(fileDiff.currentFilePath);

          if (currentLanguage === null) {
            return acc;
          }

          return acc.concat({ ...fileDiff, currentLanguage });
      }
    },
    [],
    fileDiffs
  );

}
// @VD end-block


/** INTERNAL */

type ParseStage = "line-1" | "line-2" | "diff"

const getSingleFileDiff = (diffByLines: string[]): [string[], FileDiff] => {

  // The index into the string[], this is useful for knowing how far into the string[] we've parsed so when we
  // hit the next git diff we know how many lines we've consumed.
  let lineIndex = 0;
  let parseStage: ParseStage = "line-1"
  let previousFilePath: F.Maybe<string> = null;
  let currentFilePath: F.Maybe<string> = null;
  let diffType: F.Maybe<DiffType> = null;
  let skip = 0;
  let deletedFile: F.Maybe<DeletedFileDiff> = null;
  let deletedFilePassedHunk = false;
  let newFile: F.Maybe<NewFileDiff> = null;
  let newFilePassedHunk = false;
  let modifiedFile: F.Maybe<ModifiedFileDiff | RenamedFileDiff> = null;
   // Keeps track of the diff line number for added/removed lines in modified files.
  let lineNumbers: F.Maybe<{ currentLineNumber: number, previousLineNumber: number }> = null;

  for (let line of diffByLines) {
    lineIndex++;

    if (skip > 0) {
      skip--;
      continue;
    }

    // We've got a deleted file and are simply adding all the deletions and then returning the next git diff
    if (deletedFile !== null) {
      if (!line.startsWith(FILE_DIFF_FIRST_LINE)) {

        if (line.startsWith(HUNK_PREFIX)) {
          deletedFilePassedHunk = true
          continue;
        }

        // If we've passed the hunk then we record lines as deleted
        if (line.startsWith(MODIFIED_DELETED_LINE_PREFIX) && deletedFilePassedHunk) {
          deletedFile.lines.push(line.substr(MODIFIED_DELETED_LINE_PREFIX.length))
        }
        continue;
      }

      return [ R.drop(lineIndex - 1, diffByLines), deletedFile ];
    }

    // We've got a new file and are simply adding all the insertions and then returning the next git diff
    if (newFile !== null) {
      if (!line.startsWith(FILE_DIFF_FIRST_LINE)) {

        if (line.startsWith(HUNK_PREFIX)) {
          newFilePassedHunk = true
          continue;
        }

        // If we've passed the hunk then we record lines as added
        if (line.startsWith(MODIFIED_ADDED_LINE_PREFIX) && newFilePassedHunk) {
          newFile.lines.push(line.substr(MODIFIED_ADDED_LINE_PREFIX.length))
        }
        continue;
      }

      return [ R.drop(lineIndex - 1, diffByLines), newFile ]
    }

    switch(parseStage) {

      // The very start of the git diff
      case "line-1":
        const fileAPrefix = " a/"
        const fileBPrefix = " b/"
        let remainingLine = line

        if(!remainingLine.startsWith(FILE_DIFF_FIRST_LINE)) {
          throw createDiffParserError(`Expected diff to start with "${FILE_DIFF_FIRST_LINE}": ${line}`)
        }

        remainingLine = line.substr(FILE_DIFF_FIRST_LINE.length)

        if(!remainingLine.startsWith(fileAPrefix)) {
          throw createDiffParserError(
            `Malformed first line of git diff, must have "${fileAPrefix}" after "${FILE_DIFF_FIRST_LINE}": ${line}`
          )
        }

        remainingLine = remainingLine.substr(fileAPrefix.length)

        const bothFiles = remainingLine.split(fileBPrefix)

        if(bothFiles.length !== 2) {
          throw createDiffParserError(`Expected exactly 2 files on the first line: ${line}`)
        }

        const filePathA = bothFiles[0]
        const filePathB = bothFiles[1]

        if(filePathA === "" || filePathB === "") {
          throw createDiffParserError(`You can't have empty file names: ${line}`)
        }

        // We have a rename situation
        if(filePathA !== filePathB) {
          diffType = "renamed"
        }

        // For renamed files we need both
        previousFilePath = filePathA;
        currentFilePath = filePathB;

        parseStage = "line-2"
        break;

      // The second line of a renamed file has a specific format
      case "line-2":

        // Should always be set on the first line
        if(previousFilePath === null || currentFilePath === null) {
          throw createDiffParserError("Internal Error: 1");
        }

        if (diffType === "renamed") {
          if (line === "similarity index 100%") {
            // Identical files means it's just a rename
            // We can proceed to the next git diff
            return [
              R.drop(4, diffByLines),
              { diffType, currentFilePath, previousFilePath, alteredLines: [] }
            ]
          } else {
            // It's a rename and a modifcation, we still have to parse modifications
            skip = 5;
            parseStage = "diff"
            break;
          }
        }

        // Otherwise we don't know if it's: deleted file / new file / modification

        // Deleted file
        if (line.startsWith(DELETED_FILE_PREFIX)) {
          deletedFile = { diffType: "deleted", currentFilePath, lines: [] }
          break;
        }

        // New file
        if (line.startsWith(NEW_FILE_PREFIX)) {
          newFile = { diffType: "new", currentFilePath, lines: [] }
          break;
        }

        // Modification
        diffType = "modified"
        skip = 2
        parseStage = "diff"
        break;


      case "diff":

        // At this stage we should have the file name and the diff type
        if (  diffType === null
           || !(diffType === "modified" || diffType === "renamed")
           || currentFilePath === null
           || previousFilePath === null
           ) {
          throw createDiffParserError("Internal Error: 3")
        }

        // We should be on a diff hunk if we have no saved start line
        if (lineNumbers === null) {
          lineNumbers = extractStartLineNumbersFromHunk(line)

          // Meaningless if/else to make ts happy.
          if(diffType === "modified") {
            modifiedFile = {
              currentFilePath,
              diffType,
              alteredLines: []
            }
          } else {
            modifiedFile = {
              currentFilePath,
              previousFilePath,
              diffType,
              alteredLines: []
            }
          }

          break
        }

        // Otherwise we could be in the last diff or hit a new diff hunk

        if (modifiedFile === null) {
          throw createDiffParserError("Internal Error: 5")
        }

        // An unaltered line
        if (line.startsWith(MODIFIED_NO_CHANGE_LINE_PREFIX)) {
          lineNumbers.currentLineNumber++
          lineNumbers.previousLineNumber++
          break
        }

        // A deleted line
        if (line.startsWith(MODIFIED_DELETED_LINE_PREFIX)) {

          modifiedFile.alteredLines.push({
            type: "deleted",
            previousLineNumber: lineNumbers.previousLineNumber,
            currentLineNumber: lineNumbers.currentLineNumber,
            content: line.substr(MODIFIED_DELETED_LINE_PREFIX.length)
          })

          lineNumbers.previousLineNumber++
          break
        }

        // An added line
        if (line.startsWith(MODIFIED_ADDED_LINE_PREFIX)) {
          modifiedFile.alteredLines.push({
            type: "added",
            previousLineNumber: lineNumbers.previousLineNumber,
            currentLineNumber: lineNumbers.currentLineNumber,
            content: line.substr(MODIFIED_ADDED_LINE_PREFIX.length)
          })
          lineNumbers.currentLineNumber++
          break
        }

        // Check if we've hit another diff hunk
        if (line.startsWith(HUNK_PREFIX)) {
          lineNumbers = extractStartLineNumbersFromHunk(line)
          break
        }

        // Otherwise we're on to another git diff
        if (modifiedFile === null) {
          throw createDiffParserError("Internal Error: 4")
        }
        return [ R.drop(lineIndex - 1, diffByLines), modifiedFile ]

    } // end of switch
  } // end of for loop

  // If we've ran out of lines in our git diff, either we have something ready and it was the last git diff in the
  // file and we can submit it or there was some kind of internal error.

  if (deletedFile !== null) {
    return [ [], deletedFile ]
  }

  if (newFile !== null) {
    return [ [], newFile ]
  }

  if (modifiedFile !== null) {
    return [ [], modifiedFile ]
  }

  throw createDiffParserError("Internal Error: 2")
}

// Extracts the start line on the from range of a git diff hunk:
// Eg.
//  `@@ -1,4 +1,4 @@` should return "1" because of the "+1"
const extractStartLineNumbersFromHunk = (line: string): { previousLineNumber: number, currentLineNumber: number } => {

  // For extracting 11 from text formatted like: `-11,4`
  const getNumberFromText = (textWithPrefix: string, prefix: string): number => {
    const textAfterPrefixAsArray: string[] = textWithPrefix.substr(prefix.length).split("")
    const numericalChars: string[] = R.takeWhile(R.pipe(R.equals(","), R.not), textAfterPrefixAsArray) // parse until ","
    return parseInt(numericalChars.join(""))
  }

  if(!line.startsWith(HUNK_PREFIX)) {
    throw createDiffParserError(`Malformed git hunk, supposed to start with "${HUNK_PREFIX}": ${line}`)
  }

  if(!line.includes(HUNK_SUFFIX)) {
    throw createDiffParserError(`Malformed diff hunk, supposed to include "${HUNK_SUFFIX}": ${line}`)
  }

  const indexOfSuffix = line.indexOf(HUNK_SUFFIX);
  const hunkValue = line.substr(3, indexOfSuffix - 3)
  const previousAndCurrentLineNumberText = hunkValue.split(" ")

  if (previousAndCurrentLineNumberText.length !== 2) {
    throw createDiffParserError(`Malformed diff hunk, supposed to have to and from range sep by a space: ${line}`)
  }

  const previousLineNumberText = previousAndCurrentLineNumberText[0];
  const currentLineNumberText = previousAndCurrentLineNumberText[1];

  if(!previousLineNumberText.startsWith(HUNK_PREVIOUS_RANGE_PREFIX)) {
    throw createDiffParserError(`Malformed diff hunk, previousLineNumberText doesn't start with a "${HUNK_PREVIOUS_RANGE_PREFIX}": ${line}`)
  }
  if (!currentLineNumberText.startsWith(HUNK_CURRENT_RANGE_PREFIX)) {
    throw createDiffParserError(`Malformed diff hunk, currentLineNumberText doesn't start with a "${HUNK_CURRENT_RANGE_PREFIX}": ${line}`)
  }

  const previousLineNumber = getNumberFromText(previousLineNumberText, HUNK_PREVIOUS_RANGE_PREFIX)
  const currentLineNumber = getNumberFromText(currentLineNumberText, HUNK_CURRENT_RANGE_PREFIX)

  if (isNaN(previousLineNumber) || isNaN(currentLineNumber)) {
    throw createDiffParserError(`Malformed diff hunk, expecting numbers for previousLineNumber and currentLineNumber: ${previousAndCurrentLineNumberText}`)
  }

  return { previousLineNumber, currentLineNumber }
}
