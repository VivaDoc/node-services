lexer grammar StandardCommentsLexer;

channels { ERROR }

options { }

// All tokens on the main channel:

MultiLineComment:               '/*' .*? '*/';
SingleLineComment:              '//' ~[\r\n\u2028\u2029]*;

// All tokens on the hidden channel:

IrrelevantChar:            . -> channel(HIDDEN);
