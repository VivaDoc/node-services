// Generated from ./StandardCommentsParser.g4 by ANTLR 4.6-SNAPSHOT


import { ATN } from "antlr4ts/atn/ATN";
import { ATNDeserializer } from "antlr4ts/atn/ATNDeserializer";
import { FailedPredicateException } from "antlr4ts/FailedPredicateException";
import { NotNull } from "antlr4ts/Decorators";
import { NoViableAltException } from "antlr4ts/NoViableAltException";
import { Override } from "antlr4ts/Decorators";
import { Parser } from "antlr4ts/Parser";
import { ParserRuleContext } from "antlr4ts/ParserRuleContext";
import { ParserATNSimulator } from "antlr4ts/atn/ParserATNSimulator";
import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";
import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";
import { RecognitionException } from "antlr4ts/RecognitionException";
import { RuleContext } from "antlr4ts/RuleContext";
//import { RuleVersion } from "antlr4ts/RuleVersion";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { Token } from "antlr4ts/Token";
import { TokenStream } from "antlr4ts/TokenStream";
import { Vocabulary } from "antlr4ts/Vocabulary";
import { VocabularyImpl } from "antlr4ts/VocabularyImpl";

import * as Utils from "antlr4ts/misc/Utils";

import { StandardCommentsParserListener } from "./StandardCommentsParserListener";
import { StandardCommentsParserVisitor } from "./StandardCommentsParserVisitor";


export class StandardCommentsParser extends Parser {
	public static readonly MultiLineComment = 1;
	public static readonly SingleLineComment = 2;
	public static readonly IrrelevantChar = 3;
	public static readonly RULE_program = 0;
	public static readonly RULE_sourceElements = 1;
	public static readonly RULE_sourceElement = 2;
	public static readonly RULE_multiLineComment = 3;
	public static readonly RULE_singleLineComment = 4;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"program", "sourceElements", "sourceElement", "multiLineComment", "singleLineComment",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "MultiLineComment", "SingleLineComment", "IrrelevantChar",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(StandardCommentsParser._LITERAL_NAMES, StandardCommentsParser._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return StandardCommentsParser.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace

	// @Override
	public get grammarFileName(): string { return "StandardCommentsParser.g4"; }

	// @Override
	public get ruleNames(): string[] { return StandardCommentsParser.ruleNames; }

	// @Override
	public get serializedATN(): string { return StandardCommentsParser._serializedATN; }

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(StandardCommentsParser._ATN, this);
	}
	// @RuleVersion(0)
	public program(): ProgramContext {
		let _localctx: ProgramContext = new ProgramContext(this._ctx, this.state);
		this.enterRule(_localctx, 0, StandardCommentsParser.RULE_program);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 11;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === StandardCommentsParser.MultiLineComment || _la === StandardCommentsParser.SingleLineComment) {
				{
				this.state = 10;
				this.sourceElements();
				}
			}

			this.state = 13;
			this.match(StandardCommentsParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public sourceElements(): SourceElementsContext {
		let _localctx: SourceElementsContext = new SourceElementsContext(this._ctx, this.state);
		this.enterRule(_localctx, 2, StandardCommentsParser.RULE_sourceElements);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 16;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			do {
				{
				{
				this.state = 15;
				this.sourceElement();
				}
				}
				this.state = 18;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			} while (_la === StandardCommentsParser.MultiLineComment || _la === StandardCommentsParser.SingleLineComment);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public sourceElement(): SourceElementContext {
		let _localctx: SourceElementContext = new SourceElementContext(this._ctx, this.state);
		this.enterRule(_localctx, 4, StandardCommentsParser.RULE_sourceElement);
		try {
			this.state = 22;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case StandardCommentsParser.MultiLineComment:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 20;
				this.multiLineComment();
				}
				break;
			case StandardCommentsParser.SingleLineComment:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 21;
				this.singleLineComment();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public multiLineComment(): MultiLineCommentContext {
		let _localctx: MultiLineCommentContext = new MultiLineCommentContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, StandardCommentsParser.RULE_multiLineComment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 24;
			this.match(StandardCommentsParser.MultiLineComment);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public singleLineComment(): SingleLineCommentContext {
		let _localctx: SingleLineCommentContext = new SingleLineCommentContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, StandardCommentsParser.RULE_singleLineComment);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 26;
			this.match(StandardCommentsParser.SingleLineComment);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public static readonly _serializedATN: string =
		"\x03\uAF6F\u8320\u479D\uB75C\u4880\u1605\u191C\uAB37\x03\x05\x1F\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x03\x02" +
		"\x05\x02\x0E\n\x02\x03\x02\x03\x02\x03\x03\x06\x03\x13\n\x03\r\x03\x0E" +
		"\x03\x14\x03\x04\x03\x04\x05\x04\x19\n\x04\x03\x05\x03\x05\x03\x06\x03" +
		"\x06\x03\x06\x02\x02\x02\x07\x02\x02\x04\x02\x06\x02\b\x02\n\x02\x02\x02" +
		"\x1C\x02\r\x03\x02\x02\x02\x04\x12\x03\x02\x02\x02\x06\x18\x03\x02\x02" +
		"\x02\b\x1A\x03\x02\x02\x02\n\x1C\x03\x02\x02\x02\f\x0E\x05\x04\x03\x02" +
		"\r\f\x03\x02\x02\x02\r\x0E\x03\x02\x02\x02\x0E\x0F\x03\x02\x02\x02\x0F" +
		"\x10\x07\x02\x02\x03\x10\x03\x03\x02\x02\x02\x11\x13\x05\x06\x04\x02\x12" +
		"\x11\x03\x02\x02\x02\x13\x14\x03\x02\x02\x02\x14\x12\x03\x02\x02\x02\x14" +
		"\x15\x03\x02\x02\x02\x15\x05\x03\x02\x02\x02\x16\x19\x05\b\x05\x02\x17" +
		"\x19\x05\n\x06\x02\x18\x16\x03\x02\x02\x02\x18\x17\x03\x02\x02\x02\x19" +
		"\x07\x03\x02\x02\x02\x1A\x1B\x07\x03\x02\x02\x1B\t\x03\x02\x02\x02\x1C" +
		"\x1D\x07\x04\x02\x02\x1D\v\x03\x02\x02\x02\x05\r\x14\x18";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!StandardCommentsParser.__ATN) {
			StandardCommentsParser.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(StandardCommentsParser._serializedATN));
		}

		return StandardCommentsParser.__ATN;
	}

}

export class ProgramContext extends ParserRuleContext {
	public EOF(): TerminalNode { return this.getToken(StandardCommentsParser.EOF, 0); }
	public sourceElements(): SourceElementsContext | undefined {
		return this.tryGetRuleContext(0, SourceElementsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return StandardCommentsParser.RULE_program; }
	// @Override
	public enterRule(listener: StandardCommentsParserListener): void {
		if (listener.enterProgram) {
			listener.enterProgram(this);
		}
	}
	// @Override
	public exitRule(listener: StandardCommentsParserListener): void {
		if (listener.exitProgram) {
			listener.exitProgram(this);
		}
	}
	// @Override
	public accept<Result>(visitor: StandardCommentsParserVisitor<Result>): Result {
		if (visitor.visitProgram) {
			return visitor.visitProgram(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SourceElementsContext extends ParserRuleContext {
	public sourceElement(): SourceElementContext[];
	public sourceElement(i: number): SourceElementContext;
	public sourceElement(i?: number): SourceElementContext | SourceElementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceElementContext);
		} else {
			return this.getRuleContext(i, SourceElementContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return StandardCommentsParser.RULE_sourceElements; }
	// @Override
	public enterRule(listener: StandardCommentsParserListener): void {
		if (listener.enterSourceElements) {
			listener.enterSourceElements(this);
		}
	}
	// @Override
	public exitRule(listener: StandardCommentsParserListener): void {
		if (listener.exitSourceElements) {
			listener.exitSourceElements(this);
		}
	}
	// @Override
	public accept<Result>(visitor: StandardCommentsParserVisitor<Result>): Result {
		if (visitor.visitSourceElements) {
			return visitor.visitSourceElements(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SourceElementContext extends ParserRuleContext {
	public multiLineComment(): MultiLineCommentContext | undefined {
		return this.tryGetRuleContext(0, MultiLineCommentContext);
	}
	public singleLineComment(): SingleLineCommentContext | undefined {
		return this.tryGetRuleContext(0, SingleLineCommentContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return StandardCommentsParser.RULE_sourceElement; }
	// @Override
	public enterRule(listener: StandardCommentsParserListener): void {
		if (listener.enterSourceElement) {
			listener.enterSourceElement(this);
		}
	}
	// @Override
	public exitRule(listener: StandardCommentsParserListener): void {
		if (listener.exitSourceElement) {
			listener.exitSourceElement(this);
		}
	}
	// @Override
	public accept<Result>(visitor: StandardCommentsParserVisitor<Result>): Result {
		if (visitor.visitSourceElement) {
			return visitor.visitSourceElement(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class MultiLineCommentContext extends ParserRuleContext {
	public MultiLineComment(): TerminalNode { return this.getToken(StandardCommentsParser.MultiLineComment, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return StandardCommentsParser.RULE_multiLineComment; }
	// @Override
	public enterRule(listener: StandardCommentsParserListener): void {
		if (listener.enterMultiLineComment) {
			listener.enterMultiLineComment(this);
		}
	}
	// @Override
	public exitRule(listener: StandardCommentsParserListener): void {
		if (listener.exitMultiLineComment) {
			listener.exitMultiLineComment(this);
		}
	}
	// @Override
	public accept<Result>(visitor: StandardCommentsParserVisitor<Result>): Result {
		if (visitor.visitMultiLineComment) {
			return visitor.visitMultiLineComment(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SingleLineCommentContext extends ParserRuleContext {
	public SingleLineComment(): TerminalNode { return this.getToken(StandardCommentsParser.SingleLineComment, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return StandardCommentsParser.RULE_singleLineComment; }
	// @Override
	public enterRule(listener: StandardCommentsParserListener): void {
		if (listener.enterSingleLineComment) {
			listener.enterSingleLineComment(this);
		}
	}
	// @Override
	public exitRule(listener: StandardCommentsParserListener): void {
		if (listener.exitSingleLineComment) {
			listener.exitSingleLineComment(this);
		}
	}
	// @Override
	public accept<Result>(visitor: StandardCommentsParserVisitor<Result>): Result {
		if (visitor.visitSingleLineComment) {
			return visitor.visitSingleLineComment(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


