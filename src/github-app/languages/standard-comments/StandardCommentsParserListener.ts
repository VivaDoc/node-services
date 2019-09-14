// Generated from ./StandardCommentsParser.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { ProgramContext } from "./StandardCommentsParser";
import { SourceElementsContext } from "./StandardCommentsParser";
import { SourceElementContext } from "./StandardCommentsParser";
import { MultiLineCommentContext } from "./StandardCommentsParser";
import { SingleLineCommentContext } from "./StandardCommentsParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `StandardCommentsParser`.
 */
export interface StandardCommentsParserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `StandardCommentsParser.program`.
	 * @param ctx the parse tree
	 */
	enterProgram?: (ctx: ProgramContext) => void;
	/**
	 * Exit a parse tree produced by `StandardCommentsParser.program`.
	 * @param ctx the parse tree
	 */
	exitProgram?: (ctx: ProgramContext) => void;

	/**
	 * Enter a parse tree produced by `StandardCommentsParser.sourceElements`.
	 * @param ctx the parse tree
	 */
	enterSourceElements?: (ctx: SourceElementsContext) => void;
	/**
	 * Exit a parse tree produced by `StandardCommentsParser.sourceElements`.
	 * @param ctx the parse tree
	 */
	exitSourceElements?: (ctx: SourceElementsContext) => void;

	/**
	 * Enter a parse tree produced by `StandardCommentsParser.sourceElement`.
	 * @param ctx the parse tree
	 */
	enterSourceElement?: (ctx: SourceElementContext) => void;
	/**
	 * Exit a parse tree produced by `StandardCommentsParser.sourceElement`.
	 * @param ctx the parse tree
	 */
	exitSourceElement?: (ctx: SourceElementContext) => void;

	/**
	 * Enter a parse tree produced by `StandardCommentsParser.multiLineComment`.
	 * @param ctx the parse tree
	 */
	enterMultiLineComment?: (ctx: MultiLineCommentContext) => void;
	/**
	 * Exit a parse tree produced by `StandardCommentsParser.multiLineComment`.
	 * @param ctx the parse tree
	 */
	exitMultiLineComment?: (ctx: MultiLineCommentContext) => void;

	/**
	 * Enter a parse tree produced by `StandardCommentsParser.singleLineComment`.
	 * @param ctx the parse tree
	 */
	enterSingleLineComment?: (ctx: SingleLineCommentContext) => void;
	/**
	 * Exit a parse tree produced by `StandardCommentsParser.singleLineComment`.
	 * @param ctx the parse tree
	 */
	exitSingleLineComment?: (ctx: SingleLineCommentContext) => void;
}

