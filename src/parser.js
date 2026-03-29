const { isHeaderStart, parseHeaderLine, formatGameText } = require('./pgn-utils');

class GameBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this.headerLines = [];
    this.moveLines = [];
    this.headers = {};
    this.sawContent = false;
  }

  hasAnyContent() {
    return this.headerLines.length > 0 || this.moveLines.length > 0;
  }

  pushLine(line) {
    if (isHeaderStart(line) && this.hasAnyContent()) {
      const game = this.buildGame();
      this.reset();
      this.addLine(line);
      return game;
    }
    this.addLine(line);
    return null;
  }

  addLine(line) {
    if (line.startsWith('[')) {
      this.headerLines.push(line);
      const header = parseHeaderLine(line);
      if (header) {
        this.headers[header.key] = header.value;
      }
    } else {
      this.moveLines.push(line);
    }
  }

  buildGame() {
    if (!this.hasAnyContent()) {
      return null;
    }
    const rawText = formatGameText(this.headerLines, this.moveLines);
    const moveText = this.moveLines.join('\n').trim();
    return {
      headerLines: this.headerLines.slice(),
      moveLines: this.moveLines.slice(),
      headers: { ...this.headers },
      moveText,
      rawText
    };
  }

  finalize() {
    return this.buildGame();
  }
}

module.exports = { GameBuilder };
