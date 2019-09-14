import * as Diff from "../../../src/github-app/diff"
import * as Review from "../../../src/github-app/review"
import * as Tag from "../../../src/github-app/tag"

type CalculateReviewsTestTable = [ string, [Tag.VdTag[], Tag.VdTag[], Diff.AlteredLine[]], Review.Review[] ][]

export const CALCULATE_REVIEWS_FROM_MODIFICATION_TESTS: CalculateReviewsTestTable = [
  [
    "Modify code for line annotation",
    [
      [
        {
          "tagType": "line",
          "ownerGroups": [ [ "amilner42" ] ],
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 5"
          ]
        }
      ],
      [
        {
          "tagType": "line",
          "ownerGroups": [ [ "amilner42" ] ],
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        }
      ],
      [
        {
          "type": "deleted",
          "previousLineNumber": 2,
          "currentLineNumber": 2,
          "content": "const a = 5"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 2,
          "content": "const a = 6"
        }
      ]
    ],
    [ {
        reviewType: "modified",
        tag: {
          "tagType": "line",
          "ownerGroups": [ [ "amilner42" ] ],
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        },
        alteredLines: [
          {
            "type": "deleted",
            "previousLineNumber": 2,
            "currentLineNumber": 2,
            "content": "const a = 5"
          },
          {
            "type": "added",
            "previousLineNumber": 3,
            "currentLineNumber": 2,
            "content": "const a = 6"
          }
        ]
      }
    ]
  ],
  [
    "Add code on lines right above and below tag",
    [
      [
        {
          "tagType": "line",
          "ownerGroups": [ [ "amilner42" ] ],
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        }
      ],
      [
        {
          "tagType": "line",
          "ownerGroups": [ [ "amilner42" ] ],
          "startLine": 2,
          "endLine": 3,
          "tagAnnotationLine": 2,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        }
      ],
      [
        {
          "type": "added",
          "previousLineNumber": 1,
          "currentLineNumber": 1,
          "content": "here"
        },
        {
          "type": "added",
          "previousLineNumber": 3,
          "currentLineNumber": 4,
          "content": "here"
        }
      ]
    ],
    []
  ],
  [
    "Delete code on lines above and below tag ownership",
    [
      [
        {
          "tagType": "line",
          "ownerGroups": [ [ "amilner42" ] ],
          "startLine": 2,
          "endLine": 3,
          "tagAnnotationLine": 2,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        }
      ],
      [
        {
          "tagType": "line",
          "ownerGroups": [ [ "amilner42" ] ],
          "startLine": 1,
          "endLine": 2,
          "tagAnnotationLine": 1,
          "content": [
            "// @VD amilner42 line",
            "const a = 6"
          ]
        }
      ],
      [
        {
          "type": "deleted",
          "previousLineNumber": 1,
          "currentLineNumber": 1,
          "content": "here"
        },
        {
          "type": "deleted",
          "previousLineNumber": 4,
          "currentLineNumber": 3,
          "content": "here"
        }
      ]
    ],
    []
  ]
]
