/**
 * Copyright 2013 Michael N. Gagnon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * IDEAS:
 *  - make the text box read-only while the simulation is playing
 *  - add break points
 *  - have the text box highlight the line that is currently being executed
 *
 * TODO: see if there is more sophisticated gutter mechanisms to
 * present comments and errors to the user
 * http://codemirror.net/doc/upgrade_v3.html#gutters
 *
 * TODO: listen for changes in the document and automatically update gutter
 * with comments and errors
 *
 * TODO: how to keep width of gutter constant?
 *
 * IDEA: breakpoints, see http://codemirror.net/demo/marker.html
 *
 * TODO: error text usually needs to be more verbose. Perhaps add a link to
 * a popup that explains the error and gives references.
 */

// Defines a syntax highlighter for the robocom language
CodeMirror.defineMIME("text/x-robocom", {
  name: "clike",
  //keywords: words("move turn goto"),
  keywords: {
    "move" : true,
    "turn" : true,
    "goto" : true
  },
  blockKeywords: {},
  atoms: {
    "true" : true,
    "false" : true,
    "left" : true,
    "right" : true
  },
  hooks: {
    "@": function(stream) {
      stream.eatWhile(/[\w\$_]/);
      return "meta";
    }
  }
});

// lineComments is a map where line index points to comment for that line
function addLineComments(lineComments) {
  for (i in lineComments) {
      var comment = lineComments[i]
      console.dir(i)
      console.log(comment)
      codeMirrorBox
        .setGutterMarker(
          parseInt(i),
          "note-gutter",
          comment)
  }
}