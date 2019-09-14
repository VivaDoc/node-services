import * as Diff from "../../../src/github-app/diff"

type DescribeTable = [ string, TestTable ][]

type TestTable = [ string, string, Diff.FileDiff[] ][]

/** Rename file tests */

const PURE_RENAME_TEXT = `diff --git a/test.js b/other.js
similarity index 100%
rename from test.js
rename to other.js`

const PURE_RENAME_ACROSS_FOLDERS_TEXT = `diff --git a/test.js b/a/test.js
similarity index 100%
rename from test.js
rename to a/test.js`

const PURE_RENAME_TRICKY_NAME = `diff --git a/new.js b/new.js b/new.js
similarity index 100%
rename from new.js
rename to new.js b/new.js`

const PURE_RENAME_TRICKY_NAME_REVERSE = `diff --git a/new.js b/new.js b/new.js
similarity index 100%
rename from new.js b/new.js
rename to new.js`

const RENAME_FILE_TESTS: TestTable = [
  [
    "Pure rename",
    PURE_RENAME_TEXT,
    [ { diffType: "renamed", previousFilePath: "test.js", currentFilePath: "other.js", alteredLines: [] } ]
  ],
  [
    "Pure rename across folders",
    PURE_RENAME_ACROSS_FOLDERS_TEXT,
    [ { diffType: "renamed", previousFilePath: "test.js", currentFilePath: "a/test.js", alteredLines: [] } ]
  ],
  [
    "Renaming with unrealistic tricky folder naming that makes the summary-line ambiguous",
    PURE_RENAME_TRICKY_NAME,
    [ { diffType: "renamed", previousFilePath: "new.js", currentFilePath: "new.js b/new.js", alteredLines: [] } ]
  ],
  [
    "Renaming with unrealistic tricky folder naming that makes the summary-line ambiguous - reverse",
    PURE_RENAME_TRICKY_NAME_REVERSE,
    [ { diffType: "renamed", previousFilePath: "new.js b/new.js", currentFilePath: "new.js", alteredLines: [] } ]
  ]
]

/** New file tests */

const BLANK_NEW_FILE_TEXT = `diff --git a/new.js b/new.js
new file mode 100644
index 0000000..e69de29`

const NEW_FILE_TEXT = `diff --git a/new.js b/new.js
new file mode 100644
index 0000000..4f7b968
--- /dev/null
+++ b/new.js
@@ -0,0 +1,6 @@
+1
+2
+3
+4
+5
+`

const NEW_FILE_TESTS: TestTable = [
  [
    "Blank new file",
    BLANK_NEW_FILE_TEXT,
    [ { diffType: "new", currentFilePath: "new.js", lines: [] } ]
  ],
  [
    "New file with content",
    NEW_FILE_TEXT,
    [ { diffType: "new", currentFilePath: "new.js", lines: ["1", "2", "3", "4", "5", ""] } ]
  ]
]

/** Modified file tests */

const MODIFIED_FILE_TEXT = `diff --git a/test.js b/test.js
index 8d6a11d..30a2334 100644
--- a/test.js
+++ b/test.js
@@ -1,12 +1,15 @@
+a
 // @VD amilner42 line
 const a = 5;
+a
+a
+a
 
-// @VD amilner42 function
 const b = () => {
        a = 7;
-       b = 6;
 }
 
 const  d = () => {
 
 }
+a
`

const MODIFIED_FILE_TESTS: TestTable = [
  [
    "Modified file with additions and deletions",
    MODIFIED_FILE_TEXT,
    [
      {
        diffType: "modified",
        currentFilePath: "test.js",
        alteredLines: [
          {
            "content": "a",
            "currentLineNumber": 1,
            "previousLineNumber": 1,
            "type": "added"
          },
          {
            "content": "a",
            "currentLineNumber": 4,
            "previousLineNumber": 3,
            "type": "added"
          },
          {
            "content": "a",
            "currentLineNumber": 5,
            "previousLineNumber": 3,
            "type": "added"
          },
          {
            "content": "a",
            "currentLineNumber": 6,
            "previousLineNumber": 3,
            "type": "added"
          },
          {
            "content": "// @VD amilner42 function",
            "currentLineNumber": 8,
            "previousLineNumber": 4,
            "type": "deleted"
          },
          {
            "content": "       b = 6;",
            "currentLineNumber": 10,
            "previousLineNumber": 7,
            "type": "deleted"
          },
          {
            "content": "a",
            "currentLineNumber": 15,
            "previousLineNumber": 13,
            "type": "added"
          }
        ]
      }
    ]
  ]
]

/** Deleted file tests */

const DELETED_FILE_TEXT = `diff --git a/test.js b/test.js
deleted file mode 100644
index 30a2334..0000000
--- a/test.js
+++ /dev/null
@@ -1,15 +0,0 @@
-a
-// @VD amilner42 line
-const a = 5;
-a
-a
-a
-
-const b = () => {
-       a = 7;
-}
-
-const  d = () => {
-
-}
-a`

const DELETED_FILE_TESTS: TestTable = [
  [
    "Delete file with content",
    DELETED_FILE_TEXT,
    [
      {
        "currentFilePath": "test.js",
        "diffType": "deleted",
        "lines": [
          "a",
          "// @VD amilner42 line",
          "const a = 5;",
          "a",
          "a",
          "a",
          "",
          "const b = () => {",
          "       a = 7;",
          "}",
          "",
          "const  d = () => {",
          "",
          "}",
          "a"
        ]
      }
    ]
  ]
]

/** Multiple file tests */

const DELETE_MULTIPLE_FILES_TEXT = `diff --git a/other.js b/other.js
deleted file mode 100644
index 4f7b968..0000000
--- a/other.js
+++ /dev/null
@@ -1,6 +0,0 @@
-1
-2
-3
-4
-5
-
diff --git a/test.js b/test.js
deleted file mode 100644
index 30a2334..0000000
--- a/test.js
+++ /dev/null
@@ -1,15 +0,0 @@
-a
-// @VD amilner42 line
-const a = 5;
-a
-a
-a
-
-const b = () => {
-       a = 7;
-}
-
-const  d = () => {
-
-}
-a`

const DELETE_MODIFY_RENAME_NEW_FILES_TEXT = `diff --git a/a/a.txt b/a/a.txt
index 2731b06..2e09960 100644
--- a/a/a.txt
+++ b/a/a.txt
@@ -1,2 +1 @@
-qasdfasdfasdfsdf
-asdf
+modified
diff --git a/newnewnew.txt b/newnewnew.txt
new file mode 100644
index 0000000..e69de29
diff --git a/other.js b/othername.js
similarity index 100%
rename from other.js
rename to othername.js
diff --git a/test.js b/test.js
deleted file mode 100644
index 30a2334..0000000
--- a/test.js
+++ /dev/null
@@ -1,15 +0,0 @@
-a
-// @VD amilner42 line
-const a = 5;
-a
-a
-a
-
-const b = () => {
-       a = 7;
-}
-
-const  d = () => {
-
-}
-a
`

const MULTIPLE_FILE_TESTS: TestTable = [
  [
    "Delete multiple files",
    DELETE_MULTIPLE_FILES_TEXT,
    [
      {
        "currentFilePath": "other.js",
        "diffType": "deleted",
        "lines": [
          "1",
          "2",
          "3",
          "4",
          "5",
          ""
        ]
      },
      {
        "currentFilePath": "test.js",
        "diffType": "deleted",
        "lines": [
          "a",
          "// @VD amilner42 line",
          "const a = 5;",
          "a",
          "a",
          "a",
          "",
          "const b = () => {",
          "       a = 7;",
          "}",
          "",
          "const  d = () => {",
          "",
          "}",
          "a"
        ]
      }
    ]
  ],
  [
    "Delete / modify / rename / new files",
    DELETE_MODIFY_RENAME_NEW_FILES_TEXT,
    [
      {
        "alteredLines": [
          {
            "content": "qasdfasdfasdfsdf",
            "currentLineNumber": 1,
            "previousLineNumber": 1,
            "type": "deleted"
          },
          {
            "content": "asdf",
            "currentLineNumber": 1,
            "previousLineNumber": 2,
            "type": "deleted"
          },
          {
            "content": "modified",
            "currentLineNumber": 1,
            "previousLineNumber": 3,
            "type": "added"
          }
        ],
        "currentFilePath": "a/a.txt",
        "diffType": "modified"
      },
      {
        "currentFilePath": "newnewnew.txt",
        "diffType": "new",
        "lines": []
      },
      {
        "alteredLines": [],
        "currentFilePath": "othername.js",
        "diffType": "renamed",
        "previousFilePath": "other.js"
      },
      {
        "currentFilePath": "test.js",
        "diffType": "deleted",
        "lines": [
          "a",
          "// @VD amilner42 line",
          "const a = 5;",
          "a",
          "a",
          "a",
          "",
          "const b = () => {",
          "       a = 7;",
          "}",
          "",
          "const  d = () => {",
          "",
          "}",
          "a"
        ]
      }
    ]
  ]
]

/** The describe table needed to generate a bunch of tests. */
export const TESTS: DescribeTable = [
  [
    "Rename File",
    RENAME_FILE_TESTS
  ],
  [
    "New File",
    NEW_FILE_TESTS
  ],
  [
    "Modified File",
    MODIFIED_FILE_TESTS
  ],
  [
    "Deleted File",
    DELETED_FILE_TESTS
  ],
  [
    "Multiple files",
    MULTIPLE_FILE_TESTS
  ]
]
