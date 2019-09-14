// All the supported languages with information fetched from here: https://github.com/github/linguist/blob/master/lib/linguist/languages.yml
// The list has been pulled and converted to JSON and can be viewed in `language-list.json`
// @VD amilner42 file


export type Language
  = "C"
  | "C#"
  | "C++"
  | "Go"
  | "Java"
  | "JavaScript"
  | "TypeScript";


export interface LanguageData {
  extensions: string[];
}


export const LANGUAGES: { [ Key in Language ]: LanguageData } = {
  "C": {
    "extensions": [
      ".c",
      ".cats",
      ".h",
      ".idc"
    ]
  },
  "C#": {
    "extensions": [
      ".cs",
      ".cake",
      ".csx"
    ]
  },
  "C++": {
    "extensions": [
      ".cpp",
      ".c++",
      ".cc",
      ".cp",
      ".cxx",
      ".h",
      ".h++",
      ".hh",
      ".hpp",
      ".hxx",
      ".inc",
      ".inl",
      ".ino",
      ".ipp",
      ".re",
      ".tcc",
      ".tpp"
    ]
  },
  "Go": {
    "extensions": [
      ".go"
    ]
  },
  "Java": {
    "extensions": [
      ".java"
    ]
  },
  "JavaScript": {
    "extensions": [
      ".js",
      "._js",
      ".bones",
      ".es",
      ".es6",
      ".frag",
      ".gs",
      ".jake",
      ".jsb",
      ".jscad",
      ".jsfl",
      ".jsm",
      ".jss",
      ".mjs",
      ".njs",
      ".pac",
      ".sjs",
      ".ssjs",
      ".xsjs",
      ".xsjslib"
    ]
  },
  "TypeScript": {
    "extensions": [
      ".ts"
    ]
  }
}
