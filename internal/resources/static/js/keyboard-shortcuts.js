/**
 * Keyboard Shortcuts Module
 * Centralizes keyboard shortcut handling for the entire application
 */

// Track editor related elements
let mainContent;
let editorContainer;
let viewToolbar;
let editToolbar;
let editPageButton;
let saveButton;

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    // Get DOM references
    mainContent = document.querySelector('.content');
    editorContainer = document.querySelector('.editor-container');
    viewToolbar = document.querySelector('.view-toolbar');
    editToolbar = document.querySelector('.edit-toolbar');
    editPageButton = document.querySelector('.edit-page');
    saveButton = document.querySelector('.save-changes');

    // Add global keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Register formatting commands when CodeMirror is available
    if (window.CodeMirror) {
        registerFormattingCommands();
    }
}

// Register text formatting commands and shortcuts with CodeMirror
function registerFormattingCommands() {
    // Define the formatting commands
    // Bold formatting
    CodeMirror.commands.formatBold = function(cm) {
        const selection = cm.getSelection();
        if (selection) {
            cm.replaceSelection(`**${selection}**`);
            // Move cursor after the bold text
            const cursor = cm.getCursor();
            cm.setCursor(cursor);
        } else {
            const cursor = cm.getCursor();
            cm.replaceRange('**', cursor);
            cm.setCursor({ line: cursor.line, ch: cursor.ch });
            cm.replaceRange('**', cursor);
            cm.setCursor({ line: cursor.line, ch: cursor.ch });
        }
        cm.focus();
    };

    // Italic formatting
    CodeMirror.commands.formatItalic = function(cm) {
        const selection = cm.getSelection();
        if (selection) {
            cm.replaceSelection(`*${selection}*`);
            // Move cursor after the italic text
            const cursor = cm.getCursor();
            cm.setCursor(cursor);
        } else {
            const cursor = cm.getCursor();
            cm.replaceRange('*', cursor);
            cm.setCursor({ line: cursor.line, ch: cursor.ch });
            cm.replaceRange('*', cursor);
            cm.setCursor({ line: cursor.line, ch: cursor.ch });
        }
        cm.focus();
    };

    // Heading formatting
    CodeMirror.commands.formatHeading = function(cm) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const lineWithoutIndent = line.trimStart();
        const indent = line.length - lineWithoutIndent.length;

        // Check for existing heading level
        let headingLevel = 0;
        for (let i = indent; i < line.length; i++) {
            if (line[i] === '#') {
                headingLevel++;
            } else if (line[i] !== ' ') {
                break;
            }
        }

        if (headingLevel > 0 && headingLevel < 6) {
            // Increment heading level (# -> ## -> ### -> ...)
            const newPrefix = ' '.repeat(indent) + '#'.repeat(headingLevel + 1) + ' ';
            const content = line.substring(indent + headingLevel + (line[indent + headingLevel] === ' ' ? 1 : 0)).trim();

            cm.replaceRange(newPrefix + content,
                { line: cursor.line, ch: 0 },
                { line: cursor.line, ch: line.length });

            cm.setCursor({ line: cursor.line, ch: newPrefix.length + content.length });

        } else if (headingLevel >= 6) {
            // Reset to no heading (removing the heading markers)
            const content = line.substring(indent + headingLevel + (line[indent + headingLevel] === ' ' ? 1 : 0)).trim();
            cm.replaceRange(' '.repeat(indent) + content,
                { line: cursor.line, ch: 0 },
                { line: cursor.line, ch: line.length });

            cm.setCursor({ line: cursor.line, ch: indent + content.length });

        } else {
            // Add heading level 1
            const newPrefix = ' '.repeat(indent) + '# ';
            const content = lineWithoutIndent;

            cm.replaceRange(newPrefix + content,
                { line: cursor.line, ch: 0 },
                { line: cursor.line, ch: line.length });

            cm.setCursor({ line: cursor.line, ch: newPrefix.length + content.length });
        }
        cm.focus();
    };

    // Quote formatting
    CodeMirror.commands.formatQuote = function(cm) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const trimmedLine = line.trimStart();
        const indentSize = line.length - trimmedLine.length;

        if (trimmedLine.startsWith('>')) {
            // Line is already a quote, remove the quote marker
            const quoteContent = trimmedLine.substring(1).trimStart();
            cm.replaceRange(' '.repeat(indentSize) + quoteContent,
                { line: cursor.line, ch: 0 },
                { line: cursor.line, ch: line.length });

            cm.setCursor({ line: cursor.line, ch: indentSize + quoteContent.length });
        } else {
            // Convert line to a quote
            const newPrefix = ' '.repeat(indentSize) + '> ';
            cm.replaceRange(newPrefix + trimmedLine,
                { line: cursor.line, ch: 0 },
                { line: cursor.line, ch: line.length });

            cm.setCursor({ line: cursor.line, ch: newPrefix.length + trimmedLine.length });
        }
        cm.focus();
    };

    // Smart code formatting
    CodeMirror.commands.formatCode = function(cm) {
        const selection = cm.getSelection();
        const cursor = cm.getCursor();

        // Check if there's a selection and if it spans multiple lines
        if (selection) {
            const hasMultipleLines = selection.includes('\n');

            if (hasMultipleLines) {
                // Multi-line selection: Use code block (```) formatting
                // Check if already in a code block
                const lines = selection.split('\n');
                const isCodeBlock = lines.length >= 2 &&
                                lines[0].trim().startsWith('```') &&
                                lines[lines.length - 1].trim() === '```';

                if (isCodeBlock) {
                    // Remove code block formatting
                    const contentLines = lines.slice(1, lines.length - 1);
                    cm.replaceSelection(contentLines.join('\n'));
                } else {
                    // Add code block formatting
                    cm.replaceSelection('```\n' + selection + '\n```');
                }
            } else {
                // Single-line selection: Use inline code (`) formatting
                // Check if already in inline code
                const isInlineCode = selection.startsWith('`') && selection.endsWith('`');

                if (isInlineCode) {
                    // Remove inline code formatting
                    cm.replaceSelection(selection.substring(1, selection.length - 1));
                } else {
                    // Add inline code formatting
                    cm.replaceSelection('`' + selection + '`');
                }
            }
        } else {
            // No selection: Get the current line and add code block formatting (```)
            const line = cursor.line;
            const lineText = cm.getLine(line);

            // Check if we need to remove existing code block
            const prevLine = line > 0 ? cm.getLine(line - 1) : "";
            const nextLine = line < cm.lineCount() - 1 ? cm.getLine(line + 1) : "";
            const isInCodeBlock = prevLine.trim() === '```' && nextLine.trim() === '```';

            if (isInCodeBlock) {
                // Remove the code block (remove the lines before and after)
                cm.replaceRange('',
                    { line: line + 1, ch: 0 },
                    { line: line + 2, ch: 0 });
                cm.replaceRange('',
                    { line: line - 1, ch: 0 },
                    { line: line, ch: 0 });
            } else {
                // Add a code block around the current line
                // Insert the closing ``` first to avoid line number changes
                cm.replaceRange('\n```',
                    { line: line, ch: lineText.length });

                // Then insert the opening ```
                cm.replaceRange('```\n',
                    { line: line, ch: 0 });

                // Position cursor at the same position on the line (now line+1)
                cm.setCursor({ line: line + 1, ch: cursor.ch });
            }
        }

        cm.focus();
    };

    // Register keyboard shortcuts
    CodeMirror.keyMap.default['Ctrl-B'] = 'formatBold';
    CodeMirror.keyMap.default['Ctrl-I'] = 'formatItalic';
    CodeMirror.keyMap.default['Ctrl-H'] = 'formatHeading';
    CodeMirror.keyMap.default['Ctrl-K'] = 'formatQuote';
    CodeMirror.keyMap.default['Ctrl-/'] = 'formatCode';
}

// Handle all keyboard events
function handleKeyDown(e) {
    // Ctrl+E to enter edit mode
    if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault(); // Prevent default browser behavior
        if (editPageButton && !mainContent.classList.contains('editing')) {
            // Immediately click the edit button without any delay
            editPageButton.click();

            // Force browser to process this event immediately
            window.requestAnimationFrame(() => {
                if (editor && mainContent.classList.contains('editing')) {
                    editor.refresh();
                    editor.focus();
                }
            });
        }
    }

    // Ctrl+S to save changes in edit mode
    else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); // Prevent browser's save dialog
        if (mainContent && mainContent.classList.contains('editing') && saveButton) {
            saveButton.click();
        }
    }

    // Escape key for closing dialogs and exiting edit mode
    else if (e.key === 'Escape') {
        handleEscapeKey(e);
    }
}

// Handle Escape key for various scenarios
function handleEscapeKey(e) {
    // Check the state of dialogs and UI
    const versionHistoryDialog = document.querySelector('.version-history-dialog');
    const isVersionHistoryDialogOpen = versionHistoryDialog && versionHistoryDialog.classList.contains('active');
    const isFileUploadDialogOpen = document.querySelector('.file-upload-dialog')?.classList.contains('active');
    const isLoginDialogOpen = document.querySelector('.login-dialog')?.classList.contains('active');
    const isMessageDialogOpen = document.querySelector('.message-dialog')?.classList.contains('active');
    const isDeleteConfirmDialogOpen = document.querySelector('.confirmation-dialog')?.classList.contains('active');
    const isUserConfirmDialogOpen = document.querySelector('.user-confirmation-dialog')?.classList.contains('active');
    const isNewDocDialogOpen = document.querySelector('.new-document-dialog')?.classList.contains('active');
    const isSettingsDialogOpen = document.querySelector('.settings-dialog')?.classList.contains('active');
    const isMoveDocDialogOpen = document.querySelector('.move-document-dialog')?.classList.contains('active');
    const isSearchResultsOpen = document.querySelector('.search-results')?.classList.contains('active');
    const isActionsMenuOpen = document.querySelector('.page-actions-menu')?.classList.contains('active');
    const isEditing = mainContent && mainContent.classList.contains('editing');

    // Handle in priority order (dialogs take precedence over edit mode)
    if (isLoginDialogOpen) {
        // Close login dialog
        window.Auth.hideLoginDialog();
        e.preventDefault();
    } else if (isMessageDialogOpen) {
        // Close message dialog
        window.DialogSystem.hideMessageDialog();
        e.preventDefault();
    } else if (isUserConfirmDialogOpen) {
        // Close user confirmation dialog
        window.DialogSystem.hideConfirmDialog();
        e.preventDefault();
    } else if (isVersionHistoryDialogOpen) {
        // Close version history dialog
        window.VersionHistory.hideVersionHistoryDialog();
        e.preventDefault();
        return; // Exit the event handler completely to prevent exiting edit mode
    } else if (isFileUploadDialogOpen) {
        // Close file upload dialog
        window.FileUpload.hideFileUploadDialog();
        e.preventDefault();
    } else if (isMoveDocDialogOpen) {
        // Close move document dialog
        window.MoveDocument.hideMoveDocDialog();
        e.preventDefault();
    } else if (isDeleteConfirmDialogOpen) {
        // Close delete confirmation dialog
        window.DocumentManager.hideConfirmationDialog();
        e.preventDefault();
    } else if (isNewDocDialogOpen) {
        // Close new document dialog
        window.DocumentManager.hideNewDocDialog();
        e.preventDefault();
    } else if (isSettingsDialogOpen) {
        // Close settings dialog
        window.SettingsManager.hideSettingsDialog();
        e.preventDefault();
    } else if (isSearchResultsOpen) {
        // Close search results
        window.Search.hideSearchResults();
        e.preventDefault();
    } else if (isActionsMenuOpen) {
        // Close actions menu
        document.querySelector('.page-actions-menu').classList.remove('active');
        e.preventDefault();
    } else if (isEditing) {
        // Find and click the cancel button to properly exit edit mode
        // This ensures all proper event handlers are triggered
        const cancelButton = document.querySelector('.cancel-edit');
        if (cancelButton) {
            e.preventDefault();
            cancelButton.click();
        } else {
            // Fallback to manual exit if cancel button isn't found
            e.preventDefault();
            exitEditMode();
        }
    }
}

// Exit edit mode - use the editor's function directly
function exitEditMode() {
    if (window.WikiEditor && typeof window.WikiEditor.exitEditMode === 'function') {
        window.WikiEditor.exitEditMode(mainContent, editorContainer, viewToolbar, editToolbar);
    }
}

// Export module
window.KeyboardShortcuts = {
    init: initKeyboardShortcuts,
    handleKeyDown,
    handleEscapeKey,
    exitEditMode,
    registerFormattingCommands
};

// Initialize keyboard shortcuts when DOM is loaded
document.addEventListener('DOMContentLoaded', initKeyboardShortcuts);