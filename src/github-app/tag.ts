// Module for handling tag related tasks

import R from "ramda"

import * as TOG from "../tag-owner-group"
import * as File from "../file"
import * as Diff from "./diff"
import * as F from "../functional"
import * as Lang from "./languages/index"

/** EXTERNAL TYPES */

/** COMPOSITION */

export interface HasCurrentTags {
  currentFileTags: VdTag[];
}

export interface HasPreviousTags {
  previousFileTags: VdTag[];
}

export interface HasAttachedCode {
  previousFileContent: string,
  currentFileContent: string
}

/** A diff with the code for the relevant file attached. */
export type FileDiffWithCode =
  ModifiedFileDiffWithCode |
  RenamedFileDiffWithCode |
  NewFileDiffWithCode |
  DeletedFileDiffWithCode

export type ModifiedFileDiffWithCode = Diff.ModifiedFileDiffWithLanguage & HasAttachedCode

export type RenamedFileDiffWithCode = Diff.RenamedFileDiffWithLanguage & HasAttachedCode

// The full file is present already in the diff itself
export type NewFileDiffWithCode = Diff.NewFileDiffWithLanguage

// The full file is present already in the diff itself
export type DeletedFileDiffWithCode = Diff.DeletedFileDiffWithLanguage

/** A diff with the code for the relevant file and parsed tags attached. */
export type FileDiffWithCodeAndTags =
  ModifiedFileDiffWithCodeAndTags |
  RenamedFileDiffWithCodeAndTags |
  NewFileDiffWithCodeAndTags |
  DeletedFileDiffWithCodeAndTags

export type ModifiedFileDiffWithCodeAndTags = ModifiedFileDiffWithCode & HasCurrentTags & HasPreviousTags

export type RenamedFileDiffWithCodeAndTags = RenamedFileDiffWithCode & HasCurrentTags & HasPreviousTags

export type NewFileDiffWithCodeAndTags = NewFileDiffWithCode & HasCurrentTags

export type DeletedFileDiffWithCodeAndTags= DeletedFileDiffWithCode & HasCurrentTags

/** Tags are the core of VivaDoc, allowing the user to tag some documentation that they'd like to be responsible for.
 *
 * @VD amilner42 line
 */
export type VdTag = {
  ownerGroups: TOG.Group[];
  tagAnnotationLine: number;
  content: string[];
  startLine: number;
  endLine: number;
}


/** EXTERNAL FUNCTIONS */

/** Attach tags to a `FileDiffWithCode` object.

Note: This does not mutate the object you pass in, it creates a new object.

@VD amilner42 start
*/
export const parseTags = (diffWF: FileDiffWithCode): FileDiffWithCodeAndTags => {

  const currentLanguage = diffWF.currentLanguage;

  switch (diffWF.diffType) {

    case "new": {

      const file = File.mergeLinesIntoFileContent(diffWF.lines);

      return R.merge(diffWF, { currentFileTags: getFileTags(currentLanguage, file, diffWF.currentFilePath) })
    }

    case "deleted": {

      const file = File.mergeLinesIntoFileContent(diffWF.lines);

      return R.merge(diffWF, { currentFileTags: getFileTags(currentLanguage, file, diffWF.currentFilePath) })
    }

    case "renamed":
      const previousLanguage = diffWF.previousLanguage;

      return R.merge(
        diffWF,
        {
          currentFileTags: getFileTags(currentLanguage, diffWF.currentFileContent, diffWF.currentFilePath),
          previousFileTags: getFileTags(previousLanguage, diffWF.previousFileContent, diffWF.previousFilePath),
        }
      )

    case "modified":
      return R.merge(
        diffWF,
        {
          currentFileTags: getFileTags(currentLanguage, diffWF.currentFileContent, diffWF.currentFilePath),
          previousFileTags: getFileTags(currentLanguage, diffWF.previousFileContent, diffWF.currentFilePath)
        }
      )

  } // end switch
}
// @VD end

/** Get all the tags for a given file of a specific programming language.

  @THROWS [not only] `GithubAppParseTagError`.
*/
export const getFileTags = (language: Lang.Language, fileContent: string, filePath: string): VdTag[] => {
  const fileAst = Lang.parse(language, fileContent, filePath);
  return Lang.astToTags(language, fileAst, fileContent, filePath);
}

/** Retrieve the index tag from a list of tags based on the tag annotation line number.

  @throws A TODO error when there is more than one tag annotation on that line.

  @VD amilner42 start
*/
export const getTagIndexFromAnnotationLine = (tags: VdTag[], tagAnnotationLine: number): F.Maybe<number> => {

  let index: F.Maybe<number> = null;

  for (let currentIndex = 0; currentIndex < tags.length; currentIndex++) {
    if (tags[currentIndex].tagAnnotationLine === tagAnnotationLine) {

      // First match
      if (index === null) {
        index = currentIndex;
        continue;
      }

      // Second match
      throw new Error("TODO: More than one match")
    }
  }

  return index;
}
// @VD end
