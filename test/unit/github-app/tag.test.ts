import * as TagData from "./tag.data"
import * as Tag from "../../../src/github-app/tag"

// Currently just `Tags.getFileTags` is tested as that is the core functionality.
describe.each(TagData.TESTS)(
  "%s",
  (name, table) => {
    test.each(table)("%s", (name, language, content, expected) => {
      if (expected === null) {
        // Expects error
        expect(() => { return Tag.getFileTags(language, content, "file-path") }).toThrowError()
      } else {
        // Expects result
        expect(Tag.getFileTags(language, content, "file-path")).toEqual(expected)
      }
    })
  }
)
