// The C++ parser follows the standard comments parser.

import * as AST from "../ast"
import * as StandardComments from "../standard-comments"


export const parse = StandardComments.parse
export const astToTags = AST.standardTagsFromReducedFileAst;
