export const GET_NUMBER_OF_LINES_TESTS: [ string, string, number ][] = [
  [
    "Blank string",
    "",
    0
  ],
  [
    "Single empty line",
    "\n",
    1
  ],
  [
    "A few lines",
    "1\n2\n3\n",
    3
  ],
  [
    "A few lines no final terminator",
    "1\n2\n3",
    3
  ]
]

export const GET_NUMBER_OF_NEWLINE_TERMINATORS_TESTS: [ string, string, number ][] = [
  [
    "No newline terminators",
    "",
    0
  ],
  [
    "1 newline terminator",
    "aasadfasd\n",
    1
  ],
  [
    "a few newline terminators",
    "\n asdfasd \r asdfasdfasdfasd \r\n",
    3
  ]
]
