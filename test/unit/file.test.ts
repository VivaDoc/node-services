import * as File from "../../src/file"
import * as FileData from "./file.data"

describe("splitFileContentIntoLines", () => {
  test.each(FileData.SPLIT_FILE_CONTENT_INTO_LINES_TESTS)("%s", (name, fileContent, expected) => {
    expect(File.splitFileContentIntoLines(fileContent)).toEqual(expected)
  })
})

describe("mergeLinesIntoFileContent", () => {
  test.each(FileData.MERGE_LINES_INTO_FILE_CONTENT_TESTS)("%s", (name, fileContentLines, expected) => {
    expect(File.mergeLinesIntoFileContent(fileContentLines)).toEqual(expected)
  })
})

describe("getNumberOfLinesForFile", () => {
  test.each(FileData.GET_NUMBER_OF_LINES_FOR_FILE_CONTENT_TESTS)("%s", (name, fileContentOrLines, expected) => {
    expect(File.getNumberOfLinesForFile(fileContentOrLines)).toEqual(expected)
  })
})
