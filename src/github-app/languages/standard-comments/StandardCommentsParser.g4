parser grammar StandardCommentsParser;


options {
    tokenVocab=StandardCommentsLexer;
}


program
    : sourceElements? EOF;


sourceElements
    : sourceElement+
    ;


sourceElement
    : multiLineComment
    | singleLineComment
    ;


multiLineComment
    : MultiLineComment
    ;


singleLineComment
    : SingleLineComment
    ;
