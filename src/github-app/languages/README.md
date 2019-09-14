# Languages

In this project we support multiple languages, we do so by creating lexers and parsers with
[antlr4](https://www.antlr.org/).

### Examples

Refer to any of the folders in `/language` such as `/language/standard-comments`.

### Setup

You'll need to install antlr, then add the following aliases to your bashrc:

```bash
# Antlr

alias antlr4='java -jar /usr/local/lib/antlr-4.7.2-complete.jar'
alias grun='java org.antlr.v4.gui.TestRig'
```

### Testing parsers out.

```bash
# example for javascript
cd github-app/src/languages/javascript;
antlr4 JavascriptParser.g4; # alias we set
javac JavascriptParser*.java; # compile java files
grun Javascript program -gui <file-location-to-parse> # parses a file
grun Javascript program -gui # hit enter and type what you want to parse, then Ctrl-D to complete
```
