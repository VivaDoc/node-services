import * as Lang from "../../../src/github-app/languages"
import * as Tag from "../../../src/github-app/tag"

type DescribeTable = [ string, TestTable ][]

// `null` for expected implies that an error should be thrown, when we refine our errors you can refine it here too.
type TestTable = [ string, Lang.Language, string, null | Tag.VdTag[] ][]

/** Tests for valid files */

const JAVASCRIPT_MANY_TAGS_TEXT = `// @VD amilner42 line
const a = 5;

// doo doo
export const func = () => {
  ...
  ...
  // @VD amilner42 block
  a = 2
  b = 3
  // @VD end
  ...
}
`

const JAVASCRIPT_MANY_MULTILINE_COMMENT_TAGS_TEXT = `/*
 @VD amilner42 line
*/
const a = 5;

/* @VD amilner42 line
*/
export const func = () => {
  ...
  ...
  /*
  @VD amilner42 block
  */
  a = 2
  b = 3
  /* @VD end-block
   */
  ...
}
`

const VALID_JAVASCRIPT_TESTS: TestTable = [
  [
    "Blank file",
    "JavaScript",
    "",
    []
  ],
  [
    "VD tag with no space shouldn't trigger",
    "JavaScript",
    "//@VD amilner42 line",
    []
  ],
  [
    "Javascript file with many tags",
    "JavaScript",
    JAVASCRIPT_MANY_TAGS_TEXT,
    [
      {
        "content": [
          "// @VD amilner42 line",
          "const a = 5;"
        ],
        "endLine": 2,
        "ownerGroups": [ [ "amilner42" ] ],
        "startLine": 1,
        "tagAnnotationLine": 1,
        "tagType": "line"
      },
      {
        "content": [
          "  // @VD amilner42 block",
          "  a = 2",
          "  b = 3",
          "  // @VD end"
        ],
        "endLine": 11,
        "ownerGroups": [ [ "amilner42" ] ],
        "startLine": 8,
        "tagAnnotationLine": 8,
        "tagType": "block"
      }
    ]
  ],
  [
    "Javascript many tags with annotations in multiline comments",
    "JavaScript",
    JAVASCRIPT_MANY_MULTILINE_COMMENT_TAGS_TEXT,
    [
      {
        "content": [
          "/*",
          " @VD amilner42 line",
          "*/",
          "const a = 5;"
        ],
        "endLine": 4,
        "ownerGroups": [ [ "amilner42" ] ],
        "startLine": 1,
        "tagAnnotationLine": 2,
        "tagType": "line"
      },
      {
        "content": [
          "/* @VD amilner42 line",
          "*/",
          "export const func = () => {",
        ],
        "endLine": 8,
        "ownerGroups": [ [ "amilner42" ] ],
        "startLine": 6,
        "tagAnnotationLine": 6,
        "tagType": "line"
      },
      {
        "content": [
          "  /*",
          "  @VD amilner42 block",
          "  */",
          "  a = 2",
          "  b = 3",
          "  /* @VD end-block",
          "   */"
        ],
        "endLine": 17,
        "ownerGroups": [ [ "amilner42" ] ],
        "startLine": 11,
        "tagAnnotationLine": 12,
        "tagType": "block"
      }
    ]
  ]
]

// Valid tests for all languages.
const VALID_FILE_TESTS: TestTable = VALID_JAVASCRIPT_TESTS

/** Tests for invalid files */

const JAVASCRIPT_BLOCKS_END_IN_SAME_END_BLOCK_TEXT = `// @VD amilner42 block
some code

// @VD amilner42 block

some code

// @VD end
`

const JAVASCRIPT_OVERLAPPING_BLOCK_TAGS_TEXT =`// @VD amilner42 block
some code

// @VD amilner42 block

some code

// @VD end

// @VD end
`

const INVALID_JAVASCRIPT_TESTS: TestTable = [
  [
    "Invalid @VD block tag - no end-block",
    "JavaScript",
    `// @VD amilner42 block
    const a = 5
    `,
    null
  ],
  [
    "Invalid random @VD annotation without username and tag type",
    "JavaScript",
    "// @VD ",
    null
  ],
  [
    "Invalid @VD annotation with improper tag type banana",
    "JavaScript",
    "// @VD amilner42 banana ",
    null
  ],
  [
    "Invalid @VD annotation with improper tag type lines",
    "JavaScript",
    "// @VD amilner42 lines ",
    null
  ],
  [
    "Invalid @VD line annotation on the last line",
    "JavaScript",
    "/* @VD amilner42 line */",
    null
  ],
  [
    "Invalid - multiple block tags with same ending block annotation",
    "JavaScript",
    JAVASCRIPT_BLOCKS_END_IN_SAME_END_BLOCK_TEXT,
    null
  ],
  [
    "Invalid - ambiguous block tag endings (feature not supported yet)",
    "JavaScript",
    JAVASCRIPT_OVERLAPPING_BLOCK_TAGS_TEXT,
    null
  ]
]

/** Invalid tests for all languages. */
const INVALID_FILE_TESTS: TestTable = INVALID_JAVASCRIPT_TESTS

/** The describe table for generating a bunch of tests. */
export const TESTS: DescribeTable = [
  [
    "Valid files",
    VALID_FILE_TESTS
  ],
  [
    "Invalid files",
    INVALID_FILE_TESTS
  ]
]
