import * as SH from "../../src/string-helpers"
import * as SHData from "./string-helpers.data"

describe("getNumberOfLines", () => {
  test.each(SHData.GET_NUMBER_OF_LINES_TESTS)("%s", (name, str, expected) => {
    expect(SH.getNumberOfLines(str)).toEqual(expected)
  })
})

describe("getNumberOfNewLineTerminators", () => {
  test.each(SHData.GET_NUMBER_OF_LINES_TESTS)("%s", (name, str, expected) => {
    expect(SH.getNumberOfLines(str)).toEqual(expected)
  })
})
