// A parser representing the standard comments format in many languages.

import * as GenericCommentParser from "../generic-comment-parser"

import { StandardCommentsLexer } from "./StandardCommentsLexer"
import { StandardCommentsParser } from "./StandardCommentsParser"


export const parse = GenericCommentParser.createCommentParser(StandardCommentsLexer, StandardCommentsParser);
