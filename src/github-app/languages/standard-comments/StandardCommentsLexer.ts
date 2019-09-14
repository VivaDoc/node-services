// Generated from ./StandardCommentsLexer.g4 by ANTLR 4.6-SNAPSHOT


import { ATN } from "antlr4ts/atn/ATN";
import { ATNDeserializer } from "antlr4ts/atn/ATNDeserializer";
import { CharStream } from "antlr4ts/CharStream";
import { Lexer } from "antlr4ts/Lexer";
import { LexerATNSimulator } from "antlr4ts/atn/LexerATNSimulator";
import { NotNull } from "antlr4ts/Decorators";
import { Override } from "antlr4ts/Decorators";
import { RuleContext } from "antlr4ts/RuleContext";
import { Vocabulary } from "antlr4ts/Vocabulary";
import { VocabularyImpl } from "antlr4ts/VocabularyImpl";

import * as Utils from "antlr4ts/misc/Utils";


export class StandardCommentsLexer extends Lexer {
	public static readonly MultiLineComment = 1;
	public static readonly SingleLineComment = 2;
	public static readonly IrrelevantChar = 3;
	public static readonly ERROR = 2;
	// tslint:disable:no-trailing-whitespace
	public static readonly modeNames: string[] = [
		"DEFAULT_MODE",
	];

	public static readonly ruleNames: string[] = [
		"MultiLineComment", "SingleLineComment", "IrrelevantChar",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "MultiLineComment", "SingleLineComment", "IrrelevantChar",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(StandardCommentsLexer._LITERAL_NAMES, StandardCommentsLexer._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return StandardCommentsLexer.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace


	constructor(input: CharStream) {
		super(input);
		this._interp = new LexerATNSimulator(StandardCommentsLexer._ATN, this);
	}

	// @Override
	public get grammarFileName(): string { return "StandardCommentsLexer.g4"; }

	// @Override
	public get ruleNames(): string[] { return StandardCommentsLexer.ruleNames; }

	// @Override
	public get serializedATN(): string { return StandardCommentsLexer._serializedATN; }

	// @Override
	public get modeNames(): string[] { return StandardCommentsLexer.modeNames; }

	public static readonly _serializedATN: string =
		"\x03\uAF6F\u8320\u479D\uB75C\u4880\u1605\u191C\uAB37\x02\x05\"\b\x01\x04" +
		"\x02\t\x02\x04\x03\t\x03\x04\x04\t\x04\x03\x02\x03\x02\x03\x02\x03\x02" +
		"\x07\x02\x0E\n\x02\f\x02\x0E\x02\x11\v\x02\x03\x02\x03\x02\x03\x02\x03" +
		"\x03\x03\x03\x03\x03\x03\x03\x07\x03\x1A\n\x03\f\x03\x0E\x03\x1D\v\x03" +
		"\x03\x04\x03\x04\x03\x04\x03\x04\x03\x0F\x02\x02\x05\x03\x02\x03\x05\x02" +
		"\x04\x07\x02\x05\x03\x02\x03\x05\x02\f\f\x0F\x0F\u202A\u202B#\x02\x03" +
		"\x03\x02\x02\x02\x02\x05\x03\x02\x02\x02\x02\x07\x03\x02\x02\x02\x03\t" +
		"\x03\x02\x02\x02\x05\x15\x03\x02\x02\x02\x07\x1E\x03\x02\x02\x02\t\n\x07" +
		"1\x02\x02\n\v\x07,\x02\x02\v\x0F\x03\x02\x02\x02\f\x0E\v\x02\x02\x02\r" +
		"\f\x03\x02\x02\x02\x0E\x11\x03\x02\x02\x02\x0F\x10\x03\x02\x02\x02\x0F" +
		"\r\x03\x02\x02\x02\x10\x12\x03\x02\x02\x02\x11\x0F\x03\x02\x02\x02\x12" +
		"\x13\x07,\x02\x02\x13\x14\x071\x02\x02\x14\x04\x03\x02\x02\x02\x15\x16" +
		"\x071\x02\x02\x16\x17\x071\x02\x02\x17\x1B\x03\x02\x02\x02\x18\x1A\n\x02" +
		"\x02\x02\x19\x18\x03\x02\x02\x02\x1A\x1D\x03\x02\x02\x02\x1B\x19\x03\x02" +
		"\x02\x02\x1B\x1C\x03\x02\x02\x02\x1C\x06\x03\x02\x02\x02\x1D\x1B\x03\x02" +
		"\x02\x02\x1E\x1F\v\x02\x02\x02\x1F \x03\x02\x02\x02 !\b\x04\x02\x02!\b" +
		"\x03\x02\x02\x02\x05\x02\x0F\x1B\x03\x02\x03\x02";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!StandardCommentsLexer.__ATN) {
			StandardCommentsLexer.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(StandardCommentsLexer._serializedATN));
		}

		return StandardCommentsLexer.__ATN;
	}

}

