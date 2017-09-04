wsh.js
=======

The shell is intended for implementing a simple terminal interface on a webpage.

## Demo
A simple demo can be found [here](https://mattiasrunge.github.io/wsh.js/demo/).

## History and credit
This is a fork of [josh.js](http://sdether.github.io/josh.js/) to implement new features and bring up to es6/es7.

## What to use wsh for and when to use it
WSH allows developers to build their own command line interface to any sites. It supports full CLI Readline in the browser like TAB completion, emacs-style line editing, killring and history with reverse search.

## License
wsh.js is licensed under the Apache 2.0 License since that is what [josh.js](http://sdether.github.io/josh.js/) is licensed under.

## Functionallity
It implements key trapping to bring [GNU Readline](http://cnswww.cns.cwru.edu/php/chet/readline/readline.html) like line editing to the browser.

#### Line Editing
In the below `C-x` refers to the `Ctrl-x` keystroke, while `M-x` refers to the `Meta-x` keystroke which is mapped to `Alt`, `⌘` and `Left Windows`.

<dl>
<dt><em>Movement</em></dt>
<dt><code>C-b</code> or <code>Left Arrow</code></dt>
<dd>Move back one character</dd>
<dt><code>M-b</code> or <code>Right Arrow</code></dt>
<dd>Move back one word</dd>
<dt><code>C-f</code></dt>
<dd>Move forward one character</dd>
<dt><code>M-f</code></dt>
<dd>Move forward one word</dd>
<dt><code>C-a</code> or <code>Home</code></dt>
<dd>Move to the beginning of the line</dd>
<dt><code>C-e</code> or <code>End</code></dt>
<dd>Move to the end of the line</dd>

<br/>
<dt><em>Edit/Kill</em></dt>
<dt><code>Backspace</code></dt>
<dd>Delete one character back</dd>
<dt><code>C-d</code> or <code>Delete</code></dt>
<dd>Delete character under cursor</dd>
<dt><code>C-k</code></dt>
<dd><em>Kill</em> (i.e. put in kill ring) text to the end of the line</dd>
<dt><code>M-Backspace</code></dt>
<dd><em>Kill</em> one word back</dd>
<dt><code>M-d</code></dt>
<dd><em>Kill</em> word under cursor</dd>
<dt><code>C-y</code></dt>
<dd><em>Yank</em> (i.e. pull from kill ring) the most recently <em>killed</em> text</dd>
<dt><code>M-y</code></dt>
<dd>Rotate to the next item in killring and yank it. Must be preceded by <em>yank</em></dd>

<br/>
<dt><em>History</em></dt>
<dt><code>C-r</code></dt>
<dd>Reverse search through history</dd>
<dt><code>C-p</code> or <code>Up Arrow</code></dt>
<dd>Previous entry in history</dd>
<dt><code>C-n</code> or <code>Down Arrow</code></dt>
<dd>Next entry in history</dd>
<dt><code>Page Up</code></dt>
<dd>Top of history</dd>
<dt><code>Page Down</code></dt>
<dd>Bottom of history</dd>

<br/>
<dt><em>Misc</em></dt>
<dt><code>C-l</code></dt>
<dd>refresh line (clear screen in shell)</dd>
<dt><code>Tab</code></dt>
<dd>Invoke completion handler for text under cursor</dd>
<dt><code>Esc</code> in reverse search</dt>
<dd>Cancel search</dd>
<dt><code>C-c</code></dt>
<dd>call <code>onCancel</code> handler</dd>
<dt><code>C-d</code> on empty line</dt>
<dd>call <code>onCancel</code> handler</dd>
</dl>

### File System
By implementing the functions `getNode` and `getChildNodes`, this library adds path traversal, discovery and completion just like a bash shell.

### History
Local storage is used to save command history that persists over page changes and reloads.
