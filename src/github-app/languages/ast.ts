/// Module for helpers related to the different ASTs used to represent the parsed file.

import * as R from "ramda";

import * as TOG from "../../tag-owner-group"
import * as AppError from "../../app-error"
import * as File from "../../file"
import * as Tag from "../tag"
import * as LangUtil from "./util"


/** Language-agnostic AST containing seperate comments (single/multi).

  REFER: `FileAst`. This is used to create a `FileAst`. This is a useful step because of the feature of merging
          single line comments.
 */
export interface RawFileAst {

  singleLineComments: {
    [endLine: number]: RawCommentNode; // Can only have 1 on a single line
  };

  multiLineComments: {
    [endline: number]: CommentNode[];
  }
}


export type RawCommentNode = CommentNode & {
  indentIndex: number;
}


/** Language-agnostic AST containing comments.

  NOTE: You should create this from the `RawFileAst`.

  NOTE: This is used to create `ReducedFileAst`.
*/
export interface FileAst {
  // All comments
  comments: {
    [ endLine: number ]: CommentNode[]
  };
}


export interface CommentNode {
  startLine: number;
  endLine: number;
  content: string;
}


// Language-agnostic AST slightly more specific than the `FileAst` thereby making it easier to put algorithms on top
// of it related to VD.
export interface ReducedFileAst {

  // Only comments that are relevant to VD
  comments: {
    [ endLine: number ]: ReducedCommentNode
  };

}


/** A ReducedCommentNode must repreent a comment that has some VD information in it. */
export interface ReducedCommentNode {
  startLine: number;
  endLine: number;
  data:
    { dataType: "tag-declaration", ownerGroups: TOG.Group[], tagType: Tag.VdTagType, tagAnnotationLine: number } |
    { dataType: "tag-end-block", seen: boolean /** meta-data for whether it's been seen */ }
}


export const newEmptyRawFileAst = (): RawFileAst => {
  return {
    singleLineComments: { },
    multiLineComments: { }
  }
}


export const newEmptyFileAst = (): FileAst => {
  return {
    comments: { }
  }
}


export const newEmptyReducedFileAst = (): ReducedFileAst => {
  return {
    comments: { }
  }
}


export const addSingleLineCommentToRawAst = (rawFileAst: RawFileAst, rawCommentNode: RawCommentNode): void => {
  rawFileAst.singleLineComments[rawCommentNode.endLine] = rawCommentNode;
}


export const addMultilineCommentToRawAst = (rawFileAst: RawFileAst, commentNode: CommentNode): void => {
  if (rawFileAst.multiLineComments[commentNode.endLine] === undefined) {
    rawFileAst.multiLineComments[commentNode.endLine] = [ commentNode ];
    return;
  }

  rawFileAst.multiLineComments[commentNode.endLine].push(commentNode);
}


/** Will handle merging single line comments that are consecutive and start at the same index in the line. */
export const getFileAstFromRawFileAst = (rawFileAst: RawFileAst): FileAst => {

  const fileAst = newEmptyFileAst();

  for (let endLine in rawFileAst.multiLineComments) {
    fileAst.comments[endLine] = rawFileAst.multiLineComments[endLine];
  }

  const squishedSingleLineComments = squishSingleLineComments(rawFileAst.singleLineComments);

  for (let endLine in squishedSingleLineComments) {

    if (fileAst.comments[endLine] === undefined) {
      fileAst.comments[endLine] = [ squishedSingleLineComments[endLine] ];
      continue;
    }

    fileAst.comments[endLine].push(squishedSingleLineComments[endLine]);
  }

  return fileAst;
}


/** Reduce an AST to only contain relevant information.

  @THROWS only `AppError.GithubAppParseTagError`
 */
export const getReducedFileAstFromFileAst = (fileAst: FileAst, filePath: string): ReducedFileAst => {

  const reducedFileAst = newEmptyReducedFileAst()

  // Comments must be parsed to include only comments with data
  for (let commentLineNumber in fileAst.comments) {

    const commentNodes = fileAst.comments[commentLineNumber]

    if(commentNodes.length > 1) {
      const multiCommentPerLineErr: AppError.ParseTagError = {
        parseTagError: true,
        errorName: "multiple-comments-on-single-line",
        clientExplanation: `Viva Doc does not support having multiple comments on the same line. File: ${filePath}, line number: ${commentLineNumber}`
      }

      throw multiCommentPerLineErr;
    }

    const commentNode = commentNodes[0]
    const match = LangUtil.matchSingleVdTagAnnotation(commentNode.content, filePath, commentLineNumber)

    switch (match.branchTag) {

      case "case-1":
        continue

      case "case-2":
        reducedFileAst.comments[commentNode.endLine] = {
          startLine: commentNode.startLine,
          endLine: commentNode.endLine,
          data: { dataType: "tag-end-block", seen: false }
        }
        continue

      case "case-3":
        const { ownerGroups, tagType, tagAnnotationLineOffset } = match.value
        reducedFileAst.comments[commentNode.endLine] = {
          startLine: commentNode.startLine,
          endLine: commentNode.endLine,
          data: {
            dataType: "tag-declaration",
            tagType,
            ownerGroups,
            tagAnnotationLine: commentNode.startLine + tagAnnotationLineOffset
          }
        }
        continue;
    }

  } // End loop

  return reducedFileAst
}


/** Most languages will get the tags from the AST the same way.

  Noteable exceptions are languages like python which can have comments under the function declarations instead of
  before.

  @THROWS [not only] `AppError.GithubAppParseTagError`.
 */
export const standardTagsFromReducedFileAst =
  ( reducedFileAst: ReducedFileAst
  , fileContent: string
  , filePath: string
  ): Tag.VdTag[] => {

  const vdTags: Tag.VdTag[] = []

  loopAnalyzeComments:
  for (let commentLineNumber in reducedFileAst.comments) {

    const reducedCommentNode = reducedFileAst.comments[commentLineNumber]

    switch (reducedCommentNode.data.dataType ) {

      case "tag-declaration":

        switch ( reducedCommentNode.data.tagType ) {

          case "file":
            vdTags.push({
              tagType: "file",
              ownerGroups: reducedCommentNode.data.ownerGroups,
              tagAnnotationLine: reducedCommentNode.data.tagAnnotationLine,
              content: File.splitFileContentIntoLines(fileContent),
              startLine: 1,
              endLine: File.getNumberOfLinesForFile(fileContent)
            })
            continue

          case "line": {
            const startLine = reducedCommentNode.startLine
            const endLine = reducedCommentNode.endLine + 1 // + 1 because it owns a single line

            vdTags.push({
              tagType: "line",
              ownerGroups: reducedCommentNode.data.ownerGroups,
              startLine,
              endLine,
              tagAnnotationLine: reducedCommentNode.data.tagAnnotationLine,
              content: LangUtil.getContentByLineNumbers(fileContent, startLine, endLine)
            })
            continue
          }

          case "block": {

            const commentLineNumbers = R.pipe(
              R.map(parseInt),
              R.sort((a, b) => { return a - b })
            )(Object.keys(reducedFileAst.comments))

            // Find end-block annotation
            for (let commentLineNumber of commentLineNumbers) {
              if (commentLineNumber < reducedCommentNode.endLine) {
                continue;
              }

              const currentCommentNode = reducedFileAst.comments[commentLineNumber]

              if (currentCommentNode.data.dataType === "tag-end-block" ) {

                if (currentCommentNode.data.seen) {
                  const overusedEndBlockErr: AppError.ParseTagError = {
                    parseTagError: true,
                    errorName: "end-block-used-multiple-times",
                    clientExplanation: `You cannot have the same end-block used by multiple block tags. File: ${filePath}, line number: ${currentCommentNode.startLine}`
                  }

                  throw overusedEndBlockErr;
                }

                const startLine = reducedCommentNode.startLine
                const endLine = reducedFileAst.comments[commentLineNumber].endLine

                currentCommentNode.data.seen = true
                vdTags.push({
                  tagType: "block",
                  startLine,
                  endLine,
                  ownerGroups: reducedCommentNode.data.ownerGroups,
                  tagAnnotationLine: reducedCommentNode.data.tagAnnotationLine,
                  content: LangUtil.getContentByLineNumbers(fileContent, startLine, endLine)
                })
                continue loopAnalyzeComments
              }
            }

            const noEndBlockErr: AppError.ParseTagError = {
              parseTagError: true,
              errorName: "no-end-block",
              clientExplanation: `Every block tag needs an end-block. File: ${filePath}, line number: ${reducedCommentNode.startLine}`
            }

            throw noEndBlockErr;
          }

        } // end inner switch

    } // end switch

  } // end for loop

  return vdTags
}


const squishSingleLineComments =
  ( singleLineComments: { [endLine: number]: RawCommentNode }
  ) : { [endLine: number]: CommentNode } => {

  const result: { [endLine: number]: CommentNode } = { };
  const endLines: number[] = Object.keys(singleLineComments).map((endLineAsStr) => parseInt(endLineAsStr, 10));
  const ascendingEndLines = R.sort((a, b) => a - b, endLines);

  for (let endLine of ascendingEndLines) {

    const commentAbove = singleLineComments[endLine - 1];
    const currentComment = singleLineComments[endLine];

    // No mergable comment
    if ( commentAbove === undefined || commentAbove.indentIndex !== currentComment.indentIndex) {
      result[endLine] = singleLineComments[endLine];
      continue;
    }

    // Merge comment
    const finalCommentAbove = result[endLine - 1];
    delete result[endLine - 1];
    result[endLine] = {
      content: `${finalCommentAbove.content}\n${currentComment.content}`,
      endLine: endLine,
      startLine: finalCommentAbove.startLine
    }
  }

  return result;
}
