// Module for access to all language-specific code.

import R from "ramda"

import * as AST from "./ast"
import * as F from "../../functional"
import * as Languages from "./languages"
import * as Tag from "../tag"


import * as c from "./c"
import * as cplusplus from "./c++"
import * as csharp from "./c#"
import * as go from "./go"
import * as java from "./java"
import * as javascript from "./javascript"
import * as typescript from "./typescript"


/** EXTERNAL TYPES */


export type Language = Languages.Language;


export interface HasCurrentLanguage {
  currentLanguage: Language;
}


export interface HasPreviousLanguage {
  previousLanguage: Language;
}


/** EXTERNAL FUNCTIONS */


export const getSupportedLanguageFromExtension = (extension: string): F.Maybe<Language> => {

  let language: Language;
  for ( language in Languages.LANGUAGES ) {

    const langData = Languages.LANGUAGES[language];

    if ( R.contains(`.${extension}`, langData.extensions) ) {
      return language;
    }

  }

  return null;
}


export const getLanguageFromFilePath = (filePath: string): F.Maybe<Language> => {

  const fileName: string = R.last(filePath.split("/")) as string;
  const nameSplitByPeriod = fileName.split(".");

  // In the future we may support things such as `Dockerfile` here.
  if (nameSplitByPeriod.length === 0) {
    return null;
  }

  const extension = R.last(nameSplitByPeriod) as string;

  return getSupportedLanguageFromExtension(extension);
}


/** Parse the AST from the file given the language. */
export const parse = (language: Language, fileContent: string, filePath: string): AST.ReducedFileAst => {

  switch (language) {

    case "C":
      return c.parse(fileContent, filePath);

    case "C#":
      return csharp.parse(fileContent, filePath);

    case "C++":
      return cplusplus.parse(fileContent, filePath);

    case "Go":
      return go.parse(fileContent, filePath);

    case "Java":
      return java.parse(fileContent, filePath);

    case "JavaScript":
      return javascript.parse(fileContent, filePath);

    case "TypeScript":
      return typescript.parse(fileContent, filePath);

  }
}


// Converts a reduced ast to VD tags
export const astToTags =
  ( language: Language
  , reducedFileAst: AST.ReducedFileAst
  , fileContent: string
  , filePath: string
  ): Tag.VdTag[] => {

  switch (language) {

    case "C":
      return c.astToTags(reducedFileAst, fileContent, filePath)

    case "C#":
      return csharp.astToTags(reducedFileAst, fileContent, filePath)

    case "C++":
      return cplusplus.astToTags(reducedFileAst, fileContent, filePath)

    case "Go":
      return go.astToTags(reducedFileAst, fileContent, filePath)

    case "Java":
      return java.astToTags(reducedFileAst, fileContent, filePath)

    case "JavaScript":
      return javascript.astToTags(reducedFileAst, fileContent, filePath)

    case "TypeScript":
      return typescript.astToTags(reducedFileAst, fileContent, filePath)

  }
}
