/**
 * Markdown Table Editor for wiki-go
 * Based on mte-kernel library (https://github.com/susisu/mte-kernel)
 */

(function() {
  // Make sure CodeMirror is loaded
  if (typeof CodeMirror === 'undefined') {
    console.error('CodeMirror is not loaded');
    return;
  }

  // Make sure MteKernel is loaded
  if (typeof MteKernel === 'undefined') {
    console.error('MteKernel is not loaded');
    return;
  }

  /**
   * Create a markdown table with the specified number of rows and columns
   *
   * @param {number} rows - Number of rows in the table (including header)
   * @param {number} cols - Number of columns in the table
   * @returns {string} Markdown table
   */
  function createMarkdownTable(rows, cols) {
    if (rows < 1) rows = 1;
    if (cols < 1) cols = 1;

    const headerRow = '| ' + Array(cols).fill('Header').join(' | ') + ' |';
    const separatorRow = '| ' + Array(cols).fill('---').join(' | ') + ' |';
    const dataRows = [];

    // Start from 1 since we already have a header row
    for (let i = 1; i < rows; i++) {
      dataRows.push('| ' + Array(cols).fill('Cell').join(' | ') + ' |');
    }

    return [headerRow, separatorRow].concat(dataRows).join('\n');
  }

  // Expose the createMarkdownTable function globally for use by the table picker
  window.createMarkdownTable = createMarkdownTable;

  /**
   * Implementation of the ITextEditor interface required by mte-kernel
   */
  class CodeMirrorTableEditor {
    /**
     * Creates a new CodeMirrorTableEditor
     *
     * @param {CodeMirror.Editor} cm - CodeMirror editor instance
     */
    constructor(cm) {
      this.cm = cm;
    }

    /**
     * Gets the current cursor position
     *
     * @returns {MteKernel.Point} A point object that represents the cursor position
     */
    getCursorPosition() {
      const cursor = this.cm.getCursor();
      return new MteKernel.Point(cursor.line, cursor.ch);
    }

    /**
     * Sets the cursor position to a specified one
     *
     * @param {MteKernel.Point} pos - A point object which the cursor position is set to
     */
    setCursorPosition(pos) {
      this.cm.setCursor(pos.row, pos.column);
    }

    /**
     * Sets the selection range
     *
     * @param {MteKernel.Range} range - A range object that describes a selection range
     */
    setSelectionRange(range) {
      this.cm.setSelection(
        { line: range.start.row, ch: range.start.column },
        { line: range.end.row, ch: range.end.column }
      );
    }

    /**
     * Gets the last row index of the text editor
     *
     * @returns {number} The last row index
     */
    getLastRow() {
      return this.cm.lastLine();
    }

    /**
     * Checks if the editor accepts a table at a row to be edited
     *
     * @param {number} row - A row index in the text editor
     * @returns {boolean} true if the table at the row can be edited
     */
    acceptsTableEdit(row) {
      // Check if the row is in a code block
      const token = this.cm.getTokenAt({ line: row, ch: 0 });
      // If we're in a code block, don't edit tables
      if (token && token.type && (
          token.type.includes('comment') ||
          token.type.includes('string') ||
          token.type.includes('variable-2') ||
          token.type.includes('code')
      )) {
        return false;
      }
      return true;
    }

    /**
     * Gets a line string at a row
     *
     * @param {number} row - Row index, starts from 0
     * @returns {string} The line at the specified row
     */
    getLine(row) {
      return this.cm.getLine(row) || '';
    }

    /**
     * Inserts a line at a specified row
     *
     * @param {number} row - Row index, starts from 0
     * @param {string} line - A string to be inserted
     */
    insertLine(row, line) {
      if (row > this.getLastRow()) {
        // If trying to insert beyond the last line, append a newline first
        this.cm.replaceRange('\n' + line, { line: this.getLastRow(), ch: this.cm.getLine(this.getLastRow()).length });
      } else {
        this.cm.replaceRange(line + '\n', { line: row, ch: 0 });
      }
    }

    /**
     * Deletes a line at a specified row
     *
     * @param {number} row - Row index, starts from 0
     */
    deleteLine(row) {
      const lastRow = this.getLastRow();
      if (row > lastRow) {
        return;
      }

      const start = { line: row, ch: 0 };
      const end = {
        line: row < lastRow ? row + 1 : row,
        ch: row < lastRow ? 0 : this.cm.getLine(row).length
      };
      this.cm.replaceRange('', start, end);
    }

    /**
     * Replace lines in a specified range
     *
     * @param {number} startRow - Start row index, starts from 0
     * @param {number} endRow - End row index
     * @param {Array<string>} lines - An array of strings
     */
    replaceLines(startRow, endRow, lines) {
      const lastRow = this.getLastRow();
      const start = { line: startRow, ch: 0 };
      let end;

      if (endRow > lastRow) {
        end = { line: lastRow, ch: this.cm.getLine(lastRow).length };
      } else {
        end = { line: endRow, ch: 0 };
      }

      // Join lines with newlines and ensure there's a newline at the end
      // if we're not replacing to the end of the document
      const text = lines.join('\n') + (endRow <= lastRow ? '\n' : '');
      this.cm.replaceRange(text, start, end);
    }

    /**
     * Batches multiple operations as a single undo/redo step
     *
     * @param {Function} func - A callback function that executes some operations
     */
    transact(func) {
      this.cm.operation(func);
    }
  }

  /**
   * Register the markdown table editor command with CodeMirror
   */
  function registerMarkdownTableEditor() {
    // Default options for the table editor
    const defaultOptions = MteKernel.options({
      // Your default options here
      leftMarginChars: new Set([' ', '>', '#']), // For Markdown syntax
      minDelimiterWidth: 3,
      defaultAlignment: MteKernel.Alignment.LEFT,
      headerAlignment: MteKernel.Alignment.CENTER
    });

    // Add CodeMirror commands for table editing
    CodeMirror.commands.markdownTableFormat = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      // Only run if cursor is in a table
      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.format(defaultOptions);
      }
    };

    CodeMirror.commands.markdownTableNextCell = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.nextCell(defaultOptions);
      } else {
        // Fall back to default tab behavior
        cm.execCommand('indentMore');
      }
    };

    CodeMirror.commands.markdownTablePreviousCell = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.previousCell(defaultOptions);
      } else {
        // Fall back to default shift-tab behavior
        cm.execCommand('indentLess');
      }
    };

    CodeMirror.commands.markdownTableNextRow = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.nextRow(defaultOptions);
      } else {
        // Fall back to default enter behavior
        cm.execCommand('newlineAndIndent');
      }
    };

    CodeMirror.commands.markdownTableAlignLeft = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.alignColumn(MteKernel.Alignment.LEFT, defaultOptions);
      }
    };

    CodeMirror.commands.markdownTableAlignCenter = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.alignColumn(MteKernel.Alignment.CENTER, defaultOptions);
      }
    };

    CodeMirror.commands.markdownTableAlignRight = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.alignColumn(MteKernel.Alignment.RIGHT, defaultOptions);
      }
    };

    CodeMirror.commands.markdownTableInsertRow = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.insertRow(defaultOptions);
      }
    };

    CodeMirror.commands.markdownTableDeleteRow = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.deleteRow(defaultOptions);
      }
    };

    CodeMirror.commands.markdownTableInsertColumn = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.insertColumn(defaultOptions);
      }
    };

    CodeMirror.commands.markdownTableDeleteColumn = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      if (tableEditor.cursorIsInTable(defaultOptions)) {
        tableEditor.deleteColumn(defaultOptions);
      }
    };

    // Format all tables in the document
    CodeMirror.commands.markdownTableFormatAll = function(cm) {
      const cmTableEditor = new CodeMirrorTableEditor(cm);
      const tableEditor = new MteKernel.TableEditor(cmTableEditor);

      tableEditor.formatAll(defaultOptions);
    };
  }

  // Register the markdown table editor when the document is loaded
  function initMarkdownTableEditor() {
    registerMarkdownTableEditor();
  }

  // Initialize when the document is ready
  if (document.readyState === 'complete') {
    initMarkdownTableEditor();
  } else {
    window.addEventListener('DOMContentLoaded', initMarkdownTableEditor);
  }

  // Store reference to the original tab/shift-tab commands if they exist
  const originalTabCommand = CodeMirror.commands.tab;
  const originalShiftTabCommand = CodeMirror.commands.indentLess;

  // Register direct commands with CodeMirror to override default Tab behavior
  CodeMirror.commands.tab = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Two cases to handle:
    // 1. We're in a properly detected table
    // 2. We're on a line that starts with a pipe | (beginning of a table)
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Use mte-kernel to handle the tab within the table
      tableEditor.nextCell(defaultOptions);
    } else if (cm.somethingSelected()) {
      cm.indentSelection('add');
    } else {
      // Default tab behavior - insert spaces
      cm.replaceSelection('  ', 'end');
    }
  };

  CodeMirror.commands.shiftTab = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Two cases to handle:
    // 1. We're in a properly detected table
    // 2. We're on a line that starts with a pipe | (beginning of a table)
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Use mte-kernel to handle the shift+tab within the table
      tableEditor.previousCell(defaultOptions);
    } else if (cm.somethingSelected()) {
      cm.indentSelection('subtract');
    } else {
      // Default shift-tab behavior
      cm.execCommand('indentLess');
    }
  };

  // Make sure Tab and Enter keys are properly mapped in CodeMirror keymap
  CodeMirror.keyMap.default['Tab'] = 'tab';
  CodeMirror.keyMap.default['Shift-Tab'] = 'shiftTab';
  CodeMirror.keyMap.default['Enter'] = 'tableAwareEnter';

  // Direct implementation for moving a row up - doesn't rely on mte-kernel
  CodeMirror.commands.directMoveRowUp = function(cm) {
    const cursor = cm.getCursor();
    const currentLine = cursor.line;

    // Only proceed if we're not at the top line
    if (currentLine <= 0) {
      return;
    }

    // Get the current line text and line above text
    const currentLineText = cm.getLine(currentLine);
    const aboveLineText = cm.getLine(currentLine - 1);

    // Make sure both lines are table rows
    if (!currentLineText || !aboveLineText ||
        !currentLineText.trim().startsWith('|') ||
        !aboveLineText.trim().startsWith('|')) {
      return;
    }

    // Find table boundaries
    let tableStart = currentLine;
    while (tableStart > 0) {
      const prevLine = cm.getLine(tableStart - 1);
      if (!prevLine || !prevLine.trim().startsWith('|')) break;
      tableStart--;
    }

    // Don't move header (row 0) or delimiter row (row 1)
    if (currentLine === tableStart) {
      return;
    }

    if (currentLine === tableStart + 1) {
      return;
    }

    // Don't move the row immediately after delimiter (first data row) above the delimiter
    if (currentLine === tableStart + 2 && currentLine - 1 === tableStart + 1) {
      return;
    }

    // Replace the lines
    cm.replaceRange(
      currentLineText,
      {line: currentLine - 1, ch: 0},
      {line: currentLine - 1, ch: aboveLineText.length}
    );

    cm.replaceRange(
      aboveLineText,
      {line: currentLine, ch: 0},
      {line: currentLine, ch: currentLineText.length}
    );

    // Move cursor up to follow the moved row
    cm.setCursor({line: currentLine - 1, ch: cursor.ch});
  };

  // Connect markdownTableMoveRowUp to directMoveRowUp
  CodeMirror.commands.markdownTableMoveRowUp = function(cm) {
    if (typeof CodeMirror.commands.directMoveRowUp === 'function') {
      CodeMirror.commands.directMoveRowUp(cm);
    }
  };

  // Direct implementation for moving a row down - doesn't rely on mte-kernel
  CodeMirror.commands.directMoveRowDown = function(cm) {
    const cursor = cm.getCursor();
    const currentLine = cursor.line;

    // Get the current line text
    const currentLineText = cm.getLine(currentLine);

    // Make sure current line is a table row
    if (!currentLineText || !currentLineText.trim().startsWith('|')) {
      return;
    }

    // Check if there's a line below
    if (currentLine >= cm.lineCount() - 1) {
      return;
    }

    // Get the line below text
    const belowLineText = cm.getLine(currentLine + 1);

    // Make sure the line below is a table row
    if (!belowLineText || !belowLineText.trim().startsWith('|')) {
      return;
    }

    // Find table boundaries
    let tableStart = currentLine;
    while (tableStart > 0) {
      const prevLine = cm.getLine(tableStart - 1);
      if (!prevLine || !prevLine.trim().startsWith('|')) break;
      tableStart--;
    }

    // Find table end
    let tableEnd = currentLine;
    while (tableEnd < cm.lineCount() - 1) {
      const nextLine = cm.getLine(tableEnd + 1);
      if (!nextLine || !nextLine.trim().startsWith('|')) break;
      tableEnd++;
    }

    // Don't move if this is the last row of the table
    if (currentLine === tableEnd) {
      return;
    }

    // Don't move header (row 0) or delimiter row (row 1)
    if (currentLine === tableStart || currentLine === tableStart + 1) {
      return;
    }

    // Don't move a data row below a non-table row
    if (!belowLineText.trim().startsWith('|')) {
      return;
    }

    // Replace the lines
    cm.replaceRange(
      belowLineText,
      {line: currentLine, ch: 0},
      {line: currentLine, ch: currentLineText.length}
    );

    cm.replaceRange(
      currentLineText,
      {line: currentLine + 1, ch: 0},
      {line: currentLine + 1, ch: belowLineText.length}
    );

    // Move cursor down to follow the moved row
    cm.setCursor({line: currentLine + 1, ch: cursor.ch});
  };

  // Connect markdownTableMoveRowDown to directMoveRowDown
  CodeMirror.commands.markdownTableMoveRowDown = function(cm) {
    if (typeof CodeMirror.commands.directMoveRowDown === 'function') {
      CodeMirror.commands.directMoveRowDown(cm);
    }
  };

  // Direct implementation for moving a column left
  CodeMirror.commands.directMoveColumnLeft = function(cm) {
    const cursor = cm.getCursor();
    const currentLine = cursor.line;

    // Make sure we're in a table row
    const lineText = cm.getLine(currentLine);
    if (!lineText || !lineText.trim().startsWith('|')) {
      return;
    }

    // Find table boundaries
    let tableStart = currentLine;
    while (tableStart > 0) {
      const prevLine = cm.getLine(tableStart - 1);
      if (!prevLine || !prevLine.trim().startsWith('|')) break;
      tableStart--;
    }

    // Find table end
    let tableEnd = currentLine;
    while (tableEnd < cm.lineCount() - 1) {
      const nextLine = cm.getLine(tableEnd + 1);
      if (!nextLine || !nextLine.trim().startsWith('|')) break;
      tableEnd++;
    }

    // Find which column the cursor is in
    const cursorCol = findCursorColumn(cm, lineText, cursor.ch);

    // Don't move if cursor is in the first content column (index 1)
    if (cursorCol <= 1) {
      return;
    }

    // Move the column left in each row of the table
    for (let row = tableStart; row <= tableEnd; row++) {
      const rowText = cm.getLine(row);
      const columns = splitTableRow(rowText);

      if (cursorCol < columns.length - 1) { // -1 for the last empty column
        // Swap columns
        const temp = columns[cursorCol];
        columns[cursorCol] = columns[cursorCol - 1];
        columns[cursorCol - 1] = temp;

        // Reconstruct the row
        const newRowText = columns.join('|');

        // Replace the row
        cm.replaceRange(
          newRowText,
          {line: row, ch: 0},
          {line: row, ch: rowText.length}
        );
      }
    }

    // Calculate new cursor position that stays with the moved column (now at cursorCol-1)
    // Get updated line text after movement
    const updatedLineText = cm.getLine(cursor.line);
    const newCursorPos = getCursorPositionForColumn(updatedLineText, cursorCol - 1);

    // Move cursor to follow the moved column
    cm.setCursor({line: cursor.line, ch: newCursorPos});
  };

  // Direct implementation for moving a column right
  CodeMirror.commands.directMoveColumnRight = function(cm) {
    const cursor = cm.getCursor();
    const currentLine = cursor.line;

    // Make sure we're in a table row
    const lineText = cm.getLine(currentLine);
    if (!lineText || !lineText.trim().startsWith('|')) {
      return;
    }

    // Find table boundaries
    let tableStart = currentLine;
    while (tableStart > 0) {
      const prevLine = cm.getLine(tableStart - 1);
      if (!prevLine || !prevLine.trim().startsWith('|')) break;
      tableStart--;
    }

    // Find table end
    let tableEnd = currentLine;
    while (tableEnd < cm.lineCount() - 1) {
      const nextLine = cm.getLine(tableEnd + 1);
      if (!nextLine || !nextLine.trim().startsWith('|')) break;
      tableEnd++;
    }

    // Find which column the cursor is in
    const cursorCol = findCursorColumn(cm, lineText, cursor.ch);

    // Get the number of columns in the table
    const columns = splitTableRow(lineText);

    // Don't move if cursor is in the last meaningful column
    if (cursorCol >= columns.length - 2) { // -2 to account for last empty column
      return;
    }

    // Move the column right in each row of the table
    for (let row = tableStart; row <= tableEnd; row++) {
      const rowText = cm.getLine(row);
      const rowColumns = splitTableRow(rowText);

      if (cursorCol < rowColumns.length - 2) { // -2 for last empty column
        // Swap columns
        const temp = rowColumns[cursorCol];
        rowColumns[cursorCol] = rowColumns[cursorCol + 1];
        rowColumns[cursorCol + 1] = temp;

        // Reconstruct the row
        const newRowText = rowColumns.join('|');

        // Replace the row
        cm.replaceRange(
          newRowText,
          {line: row, ch: 0},
          {line: row, ch: rowText.length}
        );
      }
    }

    // Calculate new cursor position that stays with the moved column (now at cursorCol+1)
    // Get updated line text after movement
    const updatedLineText = cm.getLine(cursor.line);
    const newCursorPos = getCursorPositionForColumn(updatedLineText, cursorCol + 1);

    // Move cursor to follow the moved column
    cm.setCursor({line: cursor.line, ch: newCursorPos});
  };

  // Helper function to find which column the cursor is in
  function findCursorColumn(cm, lineText, cursorCh) {
    // Count pipes before cursor
    let pipeCount = 0;
    for (let i = 0; i < cursorCh; i++) {
      if (lineText[i] === '|') {
        pipeCount++;
      }
    }
    return pipeCount;
  }

  // Helper function to split a table row into columns
  function splitTableRow(rowText) {
    const trimmed = rowText.trim();
    // Handle empty or invalid rows
    if (!trimmed || !trimmed.startsWith('|')) {
      return [rowText];
    }

    // Split into columns
    const parts = [];
    let currentPart = '';
    let inPipe = false;

    for (let i = 0; i < rowText.length; i++) {
      if (rowText[i] === '|') {
        // End current part and start a new one
        parts.push(currentPart);
        currentPart = '';
        inPipe = true;
      } else {
        currentPart += rowText[i];
      }
    }

    // Add the last part if we ended with a pipe
    if (inPipe) {
      parts.push(currentPart);
    }

    return parts;
  }

  // Helper function to get cursor position for a column
  function getCursorPositionForColumn(lineText, column) {
    // Find the boundaries of the specified column
    let pipeCount = 0;
    let startPos = 0;
    let endPos = lineText.length;

    for (let i = 0; i < lineText.length; i++) {
      if (lineText[i] === '|') {
        pipeCount++;
        if (pipeCount === column) {
          startPos = i + 1;  // Start position is after this pipe
        } else if (pipeCount === column + 1) {
          endPos = i;  // End position is before the next pipe
          break;
        }
      }
    }

    // Find a good position within the column content
    if (startPos < endPos) {
      // Skip leading whitespace
      while (startPos < endPos && lineText[startPos] === ' ') {
        startPos++;
      }

      // If there's content, position at the start of the content
      if (startPos < endPos && lineText[startPos] !== ' ') {
        return startPos;
      }

      // If it's an empty cell or only whitespace, position just after the pipe + space
      return startPos <= endPos ? startPos : endPos - 1;
    }

    // Fallback - position after the pipe
    return startPos;
  }

  // Connect markdownTableMoveColumnLeft to directMoveColumnLeft
  CodeMirror.commands.markdownTableMoveColumnLeft = function(cm) {
    if (typeof CodeMirror.commands.directMoveColumnLeft === 'function') {
      CodeMirror.commands.directMoveColumnLeft(cm);
    }
  };

  // Connect markdownTableMoveColumnRight to directMoveColumnRight
  CodeMirror.commands.markdownTableMoveColumnRight = function(cm) {
    if (typeof CodeMirror.commands.directMoveColumnRight === 'function') {
      CodeMirror.commands.directMoveColumnRight(cm);
    }
  };

  // Toolbar button mappings - add these BEFORE the re-registration
  CodeMirror.commands.markdownTableAlignColumnLeft = function(cm) {
    CodeMirror.commands.tableAlignLeft(cm);
  };

  CodeMirror.commands.markdownTableAlignColumnCenter = function(cm) {
    CodeMirror.commands.tableAlignCenter(cm);
  };

  CodeMirror.commands.markdownTableAlignColumnRight = function(cm) {
    CodeMirror.commands.tableAlignRight(cm);
  };

  CodeMirror.commands.markdownTableAlignColumnNone = function(cm) {
    CodeMirror.commands.tableAlignNone(cm);
  };

  // Re-register all shortcuts after table editor is loaded
  if (window.KeyboardShortcuts && typeof window.KeyboardShortcuts.registerAllCodeMirrorShortcuts === 'function') {
    window.KeyboardShortcuts.registerAllCodeMirrorShortcuts();
  }

  // Store the original Enter key behavior
  const originalEnterCommand = CodeMirror.commands.newlineAndIndentContinueMarkdownList;

  // Create a custom Enter command that checks for tables
  CodeMirror.commands.tableAwareEnter = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Two cases to handle:
    // 1. We're in a properly detected table
    // 2. We're on a line that starts with a pipe | (beginning of a table)
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Use mte-kernel to handle the enter key within the table
      tableEditor.nextRow(defaultOptions);
    } else {
      // Use original behavior
      originalEnterCommand.call(this, cm);
    }
  };

  // Override the main Enter command in editor.js by patching keymap
  const oldKeyMap = CodeMirror.keyMap.default;
  CodeMirror.keyMap.default = Object.assign({}, oldKeyMap, {
    'Enter': 'tableAwareEnter'
  });

  // Add command for escaping tables with Ctrl+Enter
  CodeMirror.commands.tableEscape = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Use mte-kernel to escape from the table
      tableEditor.escape(defaultOptions);
    } else {
      // Default Ctrl+Enter behavior - just add a new line
      cm.replaceSelection('\n', 'end');
    }
  };

  /**
   * Position cursor in a cell at the given row and column
   * Handles empty cells by positioning cursor after the pipe character
   *
   * @param {CodeMirror.Editor} cm - CodeMirror editor instance
   * @param {number} tableStartRow - Start row of the table
   * @param {number} row - Target row in the table
   * @param {number} col - Target column in the table
   * @param {MteKernel.Table} table - Table object
   * @param {MteKernel.TableEditor} tableEditor - TableEditor instance
   * @returns {boolean} True if cursor was positioned, false if default selection should be used
   */
  function positionCursorInCell(cm, tableStartRow, row, col, table, tableEditor) {
    const lineText = cm.getLine(tableStartRow + row);
    const pipes = lineText.split('|');

    // Check if the target cell is empty
    if (col + 1 < pipes.length && pipes[col + 1].trim() === '') {
      // Find the pipe position for this column
      let pipeIndex = 0;
      let pipesFound = 0;

      for (let i = 0; i < lineText.length; i++) {
        if (lineText[i] === '|') {
          pipesFound++;
          if (pipesFound === col + 1) {
            pipeIndex = i;
            break;
          }
        }
      }

      if (pipeIndex > 0) {
        // Position cursor after pipe + space
        const spaceAfterPipe = pipeIndex + 1 < lineText.length &&
                             lineText[pipeIndex + 1] === ' ' ?
                             pipeIndex + 2 : pipeIndex + 1;

        cm.setCursor({ line: tableStartRow + row, ch: spaceAfterPipe });
        return true;
      }
    }

    return false;
  }

  // Move left (Ctrl+Left) - Use previousCell
  CodeMirror.commands.tableMoveLeft = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    // Check if we're at the start of a line after a table
    const isAfterTable = cursor.ch === 0 &&
                         cursor.line > 0 &&
                         cm.getLine(cursor.line - 1).trim().endsWith('|');

    if (isAfterTable) {
      // We're at the beginning of a line right after a table
      const prevLine = cursor.line - 1;

      // Create a temporary cursor in the last cell of the table
      const prevLineText = cm.getLine(prevLine);
      const lastPipePos = prevLineText.lastIndexOf('|');

      if (lastPipePos > 0) {
        cm.setCursor({ line: prevLine, ch: lastPipePos - 1 });

        if (tableEditor.cursorIsInTable(defaultOptions)) {
          tableEditor._withTable(defaultOptions, ({ range, table }) => {
            const lastRow = table.getHeight() - 1;
            const lastCol = table.getHeaderWidth() - 1;

            // Try to position cursor in empty cell
            if (!positionCursorInCell(cm, range.start.row, lastRow, lastCol, table, tableEditor)) {
              // Normal case - select the cell content
              const newFocus = new MteKernel.Focus(lastRow, lastCol, 0);
              tableEditor._selectFocus(range.start.row, table, newFocus);
            }
          });
        } else {
          // Not a valid table, revert to original position
          cm.setCursor(cursor);
          cm.execCommand('goWordLeft');
        }
      } else {
        // Default behavior
        cm.execCommand('goWordLeft');
      }
      return;
    }

    if (isInTable || isStartingTable) {
      tableEditor._withTable(defaultOptions, ({ range, table, focus }) => {
        // Special case 1: At first cell of table, go to previous line
        if (focus.column === 0 && focus.row === 0) {
          if (range.start.row > 0) {
            // Move to end of previous line
            cm.setCursor({ line: range.start.row - 1, ch: cm.getLine(range.start.row - 1).length });
          } else {
            // At start of document, go to beginning of line
            cm.setCursor({ line: range.start.row, ch: 0 });
          }
          return;
        }

        // Special case 2: At beginning of row (not first row), go to end of previous row
        if (focus.column === 0 && focus.row > 0) {
          // Go to previous row, last cell
          const targetRow = focus.row === 2 ? 0 : focus.row - 1; // Skip delimiter row
          const targetCol = table.getHeaderWidth() - 1;

          // Get the cell content to check if it's empty
          const lineText = cm.getLine(range.start.row + targetRow);
          const pipes = lineText.split('|');
          const isEmpty = targetCol + 1 < pipes.length && pipes[targetCol + 1].trim() === '';

          if (isEmpty) {
            // For empty cells, position cursor after the pipe
            const lastPipePos = lineText.lastIndexOf('|');
            const secondLastPipePos = lineText.lastIndexOf('|', lastPipePos - 1);

            if (secondLastPipePos >= 0) {
              // Position cursor after the second-to-last pipe (start of the last cell)
              const spaceAfterPipe = secondLastPipePos + 1 < lineText.length &&
                                   lineText[secondLastPipePos + 1] === ' ' ?
                                   secondLastPipePos + 2 : secondLastPipePos + 1;

              cm.setCursor({ line: range.start.row + targetRow, ch: spaceAfterPipe });
              return;
            }
          }

          // For cells with content, use _selectFocus to select the content
          const newFocus = new MteKernel.Focus(targetRow, targetCol, 0);
          tableEditor._selectFocus(range.start.row, table, newFocus);
          return;
        }

        // Normal case: use the built-in previous cell
        tableEditor.previousCell(defaultOptions);
      });
    } else {
      // Default Ctrl+Left behavior
      cm.execCommand('goWordLeft');
    }
  };

  // Move right (Ctrl+Right) - Use nextCell
  CodeMirror.commands.tableMoveRight = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    // Handle special case: cursor at beginning of blank line before a table
    if (cursor.ch === 0 && line.trim() === '' && cursor.line < cm.lineCount() - 1) {
      const nextLine = cursor.line + 1;
      const nextLineText = cm.getLine(nextLine);
      if (nextLineText.trim().startsWith('|')) {
        const firstPipePos = nextLineText.indexOf('|');
        if (firstPipePos >= 0) {
          // Position cursor temporarily at a position where we can detect the table
          cm.setCursor({ line: nextLine, ch: firstPipePos + 1 });

          if (tableEditor.cursorIsInTable(defaultOptions)) {
            tableEditor._withTable(defaultOptions, ({ range, table }) => {
              // Check if the first cell is empty
              const pipes = nextLineText.split('|');
              const isEmpty = pipes.length > 1 && pipes[1].trim() === '';

              if (isEmpty) {
                // Empty cell - position after pipe and space
                const spaceAfterPipe = firstPipePos + 1 < nextLineText.length &&
                                     nextLineText[firstPipePos + 1] === ' ' ?
                                     firstPipePos + 2 : firstPipePos + 1;

                cm.setCursor({ line: nextLine, ch: spaceAfterPipe });
              } else {
                // Non-empty cell - select the content
                const newFocus = new MteKernel.Focus(0, 0, 0);
                tableEditor._selectFocus(range.start.row, table, newFocus);
              }
            });
          } else {
            // Not a valid table, just position after the pipe
            const spaceAfterPipe = firstPipePos + 1 < nextLineText.length &&
                                 nextLineText[firstPipePos + 1] === ' ' ?
                                 firstPipePos + 2 : firstPipePos + 1;

            cm.setCursor({ line: nextLine, ch: spaceAfterPipe });
          }
          return;
        }
      }
    }

    // Check if we're at the end of a line before a table
    const isBeforeTable = cursor.ch === line.length &&
                          cursor.line < cm.lineCount() - 1 &&
                          cm.getLine(cursor.line + 1).trim().startsWith('|');

    if (isBeforeTable) {
      // We're at the end of a line with a table on the next line
      const nextLine = cursor.line + 1;
      const nextLineText = cm.getLine(nextLine);
      const firstPipePos = nextLineText.indexOf('|');

      if (firstPipePos >= 0) {
        // Position cursor after the first pipe and try to select text
        // Make sure to position after the first pipe, not before it
        const spaceAfterPipe = firstPipePos + 1 < nextLineText.length &&
                               nextLineText[firstPipePos + 1] === ' ' ?
                               firstPipePos + 2 : firstPipePos + 1;

        cm.setCursor({ line: nextLine, ch: spaceAfterPipe });

        if (tableEditor.cursorIsInTable(defaultOptions)) {
          tableEditor._withTable(defaultOptions, ({ range, table }) => {
            // Try to position cursor in empty cell
            if (!positionCursorInCell(cm, range.start.row, 0, 0, table, tableEditor)) {
              // Select the text in the first cell
              const newFocus = new MteKernel.Focus(0, 0, 0);
              tableEditor._selectFocus(range.start.row, table, newFocus);
            }
          });
        } else {
          // Not a valid table, revert to original position
          cm.setCursor(cursor);
          cm.execCommand('goWordRight');
        }
      } else {
        // Default behavior
        cm.execCommand('goWordRight');
      }
      return;
    }

    // Detect if the cursor is in the line above a table (not at beginning or end of line)
    const isLineBeforeTable = cursor.line < cm.lineCount() - 1 &&
                            cm.getLine(cursor.line + 1).trim().startsWith('|');

    if (isLineBeforeTable && !isInTable) {
      // If we're in a line before a table, and doing Ctrl+Right should jump to the table
      if (cursor.ch === line.length ||
          (line.length > cursor.ch && line.substring(cursor.ch).trim() === '')) {
        // We're at end of meaningful content, jump to table on next line
        const nextLine = cursor.line + 1;
        const nextLineText = cm.getLine(nextLine);
        const firstPipePos = nextLineText.indexOf('|');

        if (firstPipePos >= 0) {
          // Position cursor after the first pipe and space
          const spaceAfterPipe = firstPipePos + 1 < nextLineText.length &&
                               nextLineText[firstPipePos + 1] === ' ' ?
                               firstPipePos + 2 : firstPipePos + 1;

          cm.setCursor({ line: nextLine, ch: spaceAfterPipe });
          return;
        }
      }
    }

    if (isInTable || isStartingTable) {
      tableEditor._withTable(defaultOptions, ({ range, table, focus }) => {
        // Special case: At last cell of table, go to next line
        if (focus.column === table.getHeaderWidth() - 1 && focus.row === table.getHeight() - 1) {
          // Last cell of table, move to next line
          cm.setCursor({ line: range.end.row + 1, ch: 0 });
          return;
        }

        // Special case: At end of row but not last row
        if (focus.column === table.getHeaderWidth() - 1) {
          // Move to next row, first column
          const targetRow = focus.row === 0 ? 2 : focus.row + 1; // Skip delimiter row
          const targetCol = 0;

          // Get the cell content to check if it's empty
          const lineText = cm.getLine(range.start.row + targetRow);
          const pipes = lineText.split('|');
          const isEmpty = targetCol + 1 < pipes.length && pipes[targetCol + 1].trim() === '';

          if (isEmpty) {
            // For empty cells, position cursor after the pipe
            const firstPipePos = lineText.indexOf('|');

            if (firstPipePos >= 0) {
              // Position cursor after the first pipe (start of the first cell)
              const spaceAfterPipe = firstPipePos + 1 < lineText.length &&
                                   lineText[firstPipePos + 1] === ' ' ?
                                   firstPipePos + 2 : firstPipePos + 1;

              cm.setCursor({ line: range.start.row + targetRow, ch: spaceAfterPipe });
              return;
            }
          }

          // For cells with content, use _selectFocus to select the content
          const newFocus = new MteKernel.Focus(targetRow, targetCol, 0);
          tableEditor._selectFocus(range.start.row, table, newFocus);
          return;
        }

        // Normal case: use the built-in next cell
        tableEditor.nextCell(defaultOptions);
      });
    } else {
      // Default Ctrl+Right behavior
      cm.execCommand('goWordRight');
    }
  };

  // Move up (Ctrl+Up)
  CodeMirror.commands.tableMoveUp = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Use mte-kernel's method to handle navigation
      tableEditor._withTable(defaultOptions, ({ range, table, focus }) => {
        // If we're at the first data row or above, move out of table
        if (focus.row <= 2) {
          // Special case: if in header row (row 0), go above table
          if (focus.row === 0) {
            // Move above the table
            if (range.start.row > 0) {
              cm.setCursor({ line: range.start.row - 1, ch: cm.getLine(range.start.row - 1).length });
            } else {
              cm.setCursor({ line: 0, ch: 0 });
            }
          } else {
            // If in delimiter row (row 1) or first data row (row 2), go to header
            const targetRow = 0;
            const targetCol = focus.column;

            // Get the cell content to check if it's empty
            const lineText = cm.getLine(range.start.row + targetRow);
            const pipes = lineText.split('|');
            const isEmpty = targetCol + 1 < pipes.length && pipes[targetCol + 1].trim() === '';

            if (isEmpty) {
              // For empty cells, position cursor after the pipe
              // Find the position of the pipe for this column
              let pipeIndex = 0;
              let pipesFound = 0;

              for (let i = 0; i < lineText.length; i++) {
                if (lineText[i] === '|') {
                  pipesFound++;
                  if (pipesFound === targetCol + 1) {
                    pipeIndex = i;
                    break;
                  }
                }
              }

              if (pipeIndex > 0) {
                // Position cursor after pipe + space
                const spaceAfterPipe = pipeIndex + 1 < lineText.length &&
                                     lineText[pipeIndex + 1] === ' ' ?
                                     pipeIndex + 2 : pipeIndex + 1;

                cm.setCursor({ line: range.start.row + targetRow, ch: spaceAfterPipe });
                return;
              }
            }

            // For cells with content, use _selectFocus to select the content
            const newFocus = new MteKernel.Focus(targetRow, targetCol, 0);
            tableEditor._selectFocus(range.start.row, table, newFocus);
          }
        } else {
          // We're in a data row > 2, move up to the previous row
          const targetRow = focus.row - 1;
          const targetCol = focus.column;

          // Get the cell content to check if it's empty
          const lineText = cm.getLine(range.start.row + targetRow);
          const pipes = lineText.split('|');
          const isEmpty = targetCol + 1 < pipes.length && pipes[targetCol + 1].trim() === '';

          if (isEmpty) {
            // For empty cells, position cursor after the pipe
            // Find the position of the pipe for this column
            let pipeIndex = 0;
            let pipesFound = 0;

            for (let i = 0; i < lineText.length; i++) {
              if (lineText[i] === '|') {
                pipesFound++;
                if (pipesFound === targetCol + 1) {
                  pipeIndex = i;
                  break;
                }
              }
            }

            if (pipeIndex > 0) {
              // Position cursor after pipe + space
              const spaceAfterPipe = pipeIndex + 1 < lineText.length &&
                                   lineText[pipeIndex + 1] === ' ' ?
                                   pipeIndex + 2 : pipeIndex + 1;

              cm.setCursor({ line: range.start.row + targetRow, ch: spaceAfterPipe });
              return;
            }
          }

          // For cells with content, use the built-in moveFocus
          tableEditor.moveFocus(-1, 0, defaultOptions);
        }
      });
    } else {
      // Default Ctrl+Up behavior
      cm.execCommand('goLineUp');
    }
  };

  // Move down (Ctrl+Down)
  CodeMirror.commands.tableMoveDown = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Use mte-kernel's method to handle navigation
      tableEditor._withTable(defaultOptions, ({ range, table, focus }) => {
        // If we're at the last row, move past the table
        if (focus.row >= table.getHeight() - 1) {
          // Move below the table
          cm.setCursor({ line: range.end.row + 1, ch: 0 });
        } else if (focus.row === 0 || focus.row === 1) {
          // If in header or delimiter row, go to first data row
          const targetRow = 2; // First data row
          const targetCol = focus.column;

          // Get the cell content to check if it's empty
          const lineText = cm.getLine(range.start.row + targetRow);
          const pipes = lineText.split('|');
          const isEmpty = targetCol + 1 < pipes.length && pipes[targetCol + 1].trim() === '';

          if (isEmpty) {
            // For empty cells, position cursor after the pipe
            // Find the position of the pipe for this column
            let pipeIndex = 0;
            let pipesFound = 0;

            for (let i = 0; i < lineText.length; i++) {
              if (lineText[i] === '|') {
                pipesFound++;
                if (pipesFound === targetCol + 1) {
                  pipeIndex = i;
                  break;
                }
              }
            }

            if (pipeIndex > 0) {
              // Position cursor after pipe + space
              const spaceAfterPipe = pipeIndex + 1 < lineText.length &&
                                   lineText[pipeIndex + 1] === ' ' ?
                                   pipeIndex + 2 : pipeIndex + 1;

              cm.setCursor({ line: range.start.row + targetRow, ch: spaceAfterPipe });
              return;
            }
          }

          // For cells with content, use _selectFocus to select the content
          const newFocus = new MteKernel.Focus(targetRow, targetCol, 0);
          tableEditor._selectFocus(range.start.row, table, newFocus);
        } else {
          // Normal data row, move down to next row
          const targetRow = focus.row + 1;
          const targetCol = focus.column;

          // Get the cell content to check if it's empty
          const lineText = cm.getLine(range.start.row + targetRow);
          const pipes = lineText.split('|');
          const isEmpty = targetCol + 1 < pipes.length && pipes[targetCol + 1].trim() === '';

          if (isEmpty) {
            // For empty cells, position cursor after the pipe
            // Find the position of the pipe for this column
            let pipeIndex = 0;
            let pipesFound = 0;

            for (let i = 0; i < lineText.length; i++) {
              if (lineText[i] === '|') {
                pipesFound++;
                if (pipesFound === targetCol + 1) {
                  pipeIndex = i;
                  break;
                }
              }
            }

            if (pipeIndex > 0) {
              // Position cursor after pipe + space
              const spaceAfterPipe = pipeIndex + 1 < lineText.length &&
                                   lineText[pipeIndex + 1] === ' ' ?
                                   pipeIndex + 2 : pipeIndex + 1;

              cm.setCursor({ line: range.start.row + targetRow, ch: spaceAfterPipe });
              return;
            }
          }

          // For cells with content, use the built-in moveFocus
          tableEditor.moveFocus(1, 0, defaultOptions);
        }
      });
    } else {
      // Default Ctrl+Down behavior
      cm.execCommand('goLineDown');
    }
  };

  // Add commands for table column alignment with Shift+Ctrl+Arrow keys

  // Align Left (Shift+Ctrl+Left)
  CodeMirror.commands.tableAlignLeft = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Align the current column to the left
      tableEditor.alignColumn(MteKernel.Alignment.LEFT, defaultOptions);
    }
  };

  // Align Right (Shift+Ctrl+Right)
  CodeMirror.commands.tableAlignRight = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Align the current column to the right
      tableEditor.alignColumn(MteKernel.Alignment.RIGHT, defaultOptions);
    }
  };

  // Align Center (Shift+Ctrl+Up)
  CodeMirror.commands.tableAlignCenter = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Align the current column to the center
      tableEditor.alignColumn(MteKernel.Alignment.CENTER, defaultOptions);
    }
  };

  // Align None (Shift+Ctrl+Down)
  CodeMirror.commands.tableAlignNone = function(cm) {
    const cmTableEditor = new CodeMirrorTableEditor(cm);
    const tableEditor = new MteKernel.TableEditor(cmTableEditor);
    const defaultOptions = MteKernel.options({});

    // Get current cursor and line info
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);

    // Check if we're in a table
    const isInTable = tableEditor.cursorIsInTable(defaultOptions);
    const isStartingTable = !isInTable && line && line.trimStart().startsWith('|');

    if (isInTable || isStartingTable) {
      // Use Alignment.NONE to remove specific alignment
      tableEditor.alignColumn(MteKernel.Alignment.NONE, defaultOptions);
    }
  };
})();