const fs = require('fs');
const path = require('path');

class PgnWriter {
  constructor({ outDir, prefix, gamesPerChunk, eloBins, zeroPad, dryRun }) {
    this.outDir = outDir;
    this.prefix = prefix;
    this.gamesPerChunk = gamesPerChunk;
    this.eloBins = eloBins;
    this.zeroPad = Math.max(4, zeroPad || 4);
    this.dryRun = dryRun;
    this.states = new Map();
  }

  getBaseDir(binLabel) {
    if (this.eloBins) {
      return path.join(this.outDir, 'bins', binLabel);
    }
    return path.join(this.outDir, 'chunks');
  }

  ensureState(binLabel) {
    if (!this.states.has(binLabel)) {
      this.states.set(binLabel, { chunkIndex: 0, inChunk: 0, stream: null, path: null });
    }
    return this.states.get(binLabel);
  }

  nextPath(binLabel, chunkIndex) {
    const baseDir = this.getBaseDir(binLabel);
    const padded = String(chunkIndex).padStart(this.zeroPad, '0');
    const filename = `${this.prefix}_${padded}.pgn`;
    return path.join(baseDir, filename);
  }

  openChunk(state, binLabel) {
    state.chunkIndex += 1;
    state.inChunk = 0;
    state.path = this.nextPath(binLabel, state.chunkIndex);
    if (!this.dryRun) {
      fs.mkdirSync(path.dirname(state.path), { recursive: true });
      state.stream = fs.createWriteStream(state.path, { flags: 'a' });
    }
  }

  writeGame(gameText, binLabel) {
    const state = this.ensureState(binLabel);
    if (!state.stream || state.inChunk >= this.gamesPerChunk) {
      if (state.stream) {
        state.stream.end();
      }
      this.openChunk(state, binLabel);
    }
    state.inChunk += 1;
    if (!this.dryRun) {
      state.stream.write(gameText);
    }
    return { path: state.path, chunkIndex: state.chunkIndex };
  }

  previewPath(binLabel) {
    const state = this.ensureState(binLabel);
    const nextIndex = state.chunkIndex || 1;
    return { path: this.nextPath(binLabel, nextIndex), chunkIndex: nextIndex };
  }

  closeAll() {
    for (const state of this.states.values()) {
      if (state.stream) {
        state.stream.end();
      }
    }
  }
}

module.exports = { PgnWriter };
