// Generated from ./StandardCommentsParser.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";

import { ProgramContext } from "./StandardCommentsParser";
import { SourceElementsContext } from "./StandardCommentsParser";
import { SourceElementContext } from "./StandardCommentsParser";
import { MultiLineCommentContext } from "./StandardCommentsParser";
import { SingleLineCommentContext } from "./StandardCommentsParser";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `StandardCommentsParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export interface StandardCommentsParserVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `StandardCommentsParser.program`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitProgram?: (ctx: ProgramContext) => Result;

	/**
	 * Visit a parse tree produced by `StandardCommentsParser.sourceElements`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSourceElements?: (ctx: SourceElementsContext) => Result;

	/**
	 * Visit a parse tree produced by `StandardCommentsParser.sourceElement`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSourceElement?: (ctx: SourceElementContext) => Result;

	/**
	 * Visit a parse tree produced by `StandardCommentsParser.multiLineComment`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMultiLineComment?: (ctx: MultiLineCommentContext) => Result;

	/**
	 * Visit a parse tree produced by `StandardCommentsParser.singleLineComment`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSingleLineComment?: (ctx: SingleLineCommentContext) => Result;
}

