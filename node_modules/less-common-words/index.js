var ignore = require("most-common-words");

module.exports = extract;

function extract (text) {
  var result = [];
  var words = text.toLowerCase().split(/[^\w]/);

  var i = -1;
  var len = words.length;
  while (++i < len) {
    if (!words[i] || words[i].length < 2 || ignore.indexOf(words[i]) > -1) continue;

    result.push(words[i]);
  }

  return result;
}
