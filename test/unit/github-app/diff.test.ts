import * as Diff from "../../../src/github-app/diff"
import * as DiffData from "./diff.data"

describe.each(DiffData.TESTS)(
  "%s",
  (name, table) => {
    test.each(table)("%s", (name, text, expected) => {
      expect(Diff.parseDiff(text)).toEqual(expected)
    })
  }
)
