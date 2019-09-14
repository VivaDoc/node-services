export const SPLIT_FILE_CONTENT_INTO_LINES_TESTS: [ string, string, string[] ][] = [
  [
    "Blank file",
    "",
    [ ]
  ],
  [
    "Single empty line",
    "\n",
    [ "" ]
  ],
  [
    "File not ending with a newline",
    "Just one line",
    [ "Just one line" ]
  ],
  [
    "File ending with a newline terminator",
    "Just one line\n",
    [ "Just one line" ]
  ],
  [
    "Two lines with windows newlines",
    "1\r\n2",
    [ "1", "2" ]
  ],
  [
    "Mix of all kinds of newlines",
    "1\r2\r\n3\n4\n",
    [ "1", "2", "3", "4" ]
  ]
]

export const MERGE_LINES_INTO_FILE_CONTENT_TESTS: [ string, string[], string ][] = [
  [
    "Blank file",
    [ ],
    ""
  ],
  [
    "Single empty line",
    [ "" ],
    "\n"
  ],
  [
    "Single line",
    [ "one" ],
    "one\n"
  ],
  [
    "Bunch of lines",
    [ "1", "2", "3" ],
    "1\n2\n3\n"
  ]
]

export const GET_NUMBER_OF_LINES_FOR_FILE_CONTENT_TESTS: [string, string | string[], number][] = [
  [
    "Lines: 0 lines",
    [ ],
    0
  ],
  [
    "Lines: 1 line",
    [ "" ],
    1
  ],
  [
    "Lines: Many lines",
    [ "1", "2", "3" ],
    3
  ],
  [
    "String: blank string",
    "",
    0
  ],
  [
    "String: blank string with newline-terminator",
    "\n",
    1
  ],
  [
    "String: a few lines with no final newline-terminator",
    "1\n2\n3",
    3
  ],
  [
    "String: a few lines with final newline-terminator",
    "1\n2\n3\n",
    3
  ]
]
