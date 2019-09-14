import * as SH from "../../string-helpers"
import * as AST from "./ast"
import * as LangUtil from "./util"
import * as AppError from "../../app-error"

import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts'
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker"
import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener"


// A poorly typed generic function for creating comment parsers.
export const createCommentParser = (LanguageLexer: any, LanguageParser: any) => {

  const parser = (fileContent: string, filePath: string): AST.ReducedFileAst  => {

    // Create lexer and parser
    const inputStream = new ANTLRInputStream(fileContent)
    const lexer = new LanguageLexer(inputStream)
    const tokenStream = new CommonTokenStream(lexer)
    const parser = new LanguageParser(tokenStream)
    parser.errorHandler = new LangUtil.ErrorHappenedStrategy()
    const parseTree = parser.program()
    const listener = new ExtractCommentsListener();

    if((parser.errorHandler as LangUtil.ErrorHappenedStrategy).hasError) {
      // TODO make this better if we parse more than just comments, right now it can't even error.
      const err: AppError.ParseTagError = {
        errorName: "parse-error",
        parseTagError: true,
        clientExplanation: `There was an error parsing ${filePath}`
      }

      throw err;
    }

    // Visit the parse tree
    ParseTreeWalker.DEFAULT.walk(listener as CommentParserListener, parseTree)

    const fileAst: AST.FileAst = AST.getFileAstFromRawFileAst(listener.rawFileAst);
    const reducedFileAst = AST.getReducedFileAstFromFileAst(fileAst, filePath);

    return reducedFileAst;
  }

  return parser;

}


interface CommentParserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `XXX.program`.
	 * @param ctx the parse tree
	 */
	enterProgram?: (ctx: any) => void;
	/**
	 * Exit a parse tree produced by `XXX.program`.
	 * @param ctx the parse tree
	 */
	exitProgram?: (ctx: any) => void;

	/**
	 * Enter a parse tree produced by `XXX.sourceElements`.
	 * @param ctx the parse tree
	 */
	enterSourceElements?: (ctx: any) => void;
	/**
	 * Exit a parse tree produced by `XXX.sourceElements`.
	 * @param ctx the parse tree
	 */
	exitSourceElements?: (ctx: any) => void;

	/**
	 * Enter a parse tree produced by `XXX.sourceElement`.
	 * @param ctx the parse tree
	 */
	enterSourceElement?: (ctx: any) => void;
	/**
	 * Exit a parse tree produced by `XXX.sourceElement`.
	 * @param ctx the parse tree
	 */
	exitSourceElement?: (ctx: any) => void;

	/**
	 * Enter a parse tree produced by `XXX.multiLineComment`.
	 * @param ctx the parse tree
	 */
	enterMultiLineComment?: (ctx: any) => void;
	/**
	 * Exit a parse tree produced by `XXX.multiLineComment`.
	 * @param ctx the parse tree
	 */
	exitMultiLineComment?: (ctx: any) => void;

	/**
	 * Enter a parse tree produced by `XXX.singleLineComment`.
	 * @param ctx the parse tree
	 */
	enterSingleLineComment?: (ctx: any) => void;
	/**
	 * Exit a parse tree produced by `XXX.singleLineComment`.
	 * @param ctx the parse tree
	 */
	exitSingleLineComment?: (ctx: any) => void;
}


/**
 * A listener which extracts a `AST.RawFileAst`.
 */
class ExtractCommentsListener implements CommentParserListener {

  public rawFileAst: AST.RawFileAst;

  constructor() {
    this.rawFileAst = AST.newEmptyRawFileAst()
  }

  enterSingleLineComment(ctx: any) {
    if (ctx._start.text === undefined) {
        throw new Error("TODO - Single Line Comment Context Undefined")
    }

    const content = ctx._start.text
    AST.addSingleLineCommentToRawAst(
      this.rawFileAst,
      {
        content,
        startLine: ctx._start.line,
        endLine: ctx._start.line,
        indentIndex: ctx._start.charPositionInLine
      }
    );
  }

  enterMultiLineComment(ctx: any) {
    if (ctx._start.text === undefined) {
      throw new Error("TODO - Multiline Comment Context Undefined")
    }

    const content = ctx._start.text
    AST.addMultilineCommentToRawAst(
      this.rawFileAst,
      {
        content,
        startLine: ctx._start.line,
        endLine: ctx._start.line + SH.getNumberOfLines(content) - 1
      }
    )
  }
}
