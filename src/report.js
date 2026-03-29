const fs = require('fs');

function writeReport(path, report) {
  fs.writeFileSync(path, JSON.stringify(report, null, 2));
}

module.exports = { writeReport };
