/**
 * Editor Core Module
 * Handles main editor functionality, initialization, and content management
 */

// Global editor variables
let editor = null;
let originalContent = '';

// Define custom CodeMirror modes
if (typeof CodeMirror !== 'undefined') {
    // Define a custom overlay mode for highlight syntax (==text==)
    CodeMirror.defineMode("markdown-highlight-overlay", function(config, parserConfig) {
        // Improved regex that handles edge cases better
        const highlightRegex = /==(?:[^=]|=(?!=))+?==/;

        return {
            token: function(stream, state) {
                // Look for the start of a highlight marker
                if (stream.match(/==/)) {
                    // Check if we have a complete highlight pattern
                    const line = stream.string.slice(stream.pos - 2);
                    const match = line.match(highlightRegex);

                    if (match && match.index === 0) {
                        // We found a complete highlight pattern
                        // Move the stream position to the end of the match
                        stream.pos += match[0].length - 2;
                        return "highlight";
                    }

                    // If not a complete highlight, just return null
                    return null;
                }

                // Skip until we find a potential highlight marker
                while (stream.next() != null && !stream.match(/==/, false)) {}
                return null;
            }
        };
    });

    // Create a custom markdown mode that properly handles frontmatter
    CodeMirror.defineMode("markdown-with-frontmatter", function(config) {
        // Create the base markdown mode
        const markdownMode = CodeMirror.getMode(config, {
            name: "markdown",
            highlightFormatting: true,
            strikethrough: true,
            fencedCodeBlockHighlighting: true,
            taskLists: true
        });

        return {
            startState: function() {
                return {
                    markdownState: CodeMirror.startState(markdownMode),
                    inFrontmatter: false,
                    firstLine: true
                };
            },

            copyState: function(state) {
                return {
                    markdownState: CodeMirror.copyState(markdownMode, state.markdownState),
                    inFrontmatter: state.inFrontmatter,
                    firstLine: state.firstLine
                };
            },

            token: function(stream, state) {
                // Handle frontmatter start
                if (state.firstLine && stream.sol() && stream.match(/---/)) {
                    state.inFrontmatter = true;
                    state.firstLine = false;
                    return "frontmatter-delimiter";
                }

                // No longer on first line
                if (state.firstLine && stream.sol()) {
                    state.firstLine = false;
                }

                // Handle frontmatter end
                if (state.inFrontmatter && stream.sol() && stream.match(/---/)) {
                    state.inFrontmatter = false;
                    return "frontmatter-delimiter";
                }

                // Inside frontmatter
                if (state.inFrontmatter) {
                    // Skip to end of line for frontmatter content
                    stream.skipToEnd();
                    return "frontmatter";
                }

                // Default to markdown mode outside frontmatter
                return markdownMode.token(stream, state.markdownState);
            },

            blankLine: function(state) {
                if (state.inFrontmatter) {
                    return "frontmatter";
                }
                if (markdownMode.blankLine) {
                    return markdownMode.blankLine(state.markdownState);
                }
                return null;
            },

            indent: function(state, textAfter) {
                if (state.inFrontmatter) return 0;
                if (markdownMode.indent) {
                    return markdownMode.indent(state.markdownState, textAfter);
                }
                return CodeMirror.Pass;
            },

            innerMode: function(state) {
                if (state.inFrontmatter) return {state: state, mode: this};
                return {state: state.markdownState, mode: markdownMode};
            }
        };
    });

    // Create a simple frontmatter detector overlay that doesn't use state
    CodeMirror.defineMode("frontmatter-detector", function() {
        return {
            token: function(stream, state) {
                // Check for frontmatter delimiters at the beginning of lines
                if (stream.sol() && stream.match(/---/)) {
                    return "frontmatter-delimiter";
                }

                // Skip to next position
                stream.next();
                return null;
            }
        };
    });
}

// Helper functions for text manipulation
function wrapText(cm, prefix = '', suffix = '', placeholder = '') {
    const selection = cm.getSelection();
    if (selection) {
        cm.replaceSelection(`${prefix}${selection}${suffix}`);
    } else {
        const cursor = cm.getCursor();
        cm.replaceRange(prefix + placeholder + suffix, cursor);
        // Place cursor between prefix and suffix so the user can start typing.
        cm.setCursor(cursor.line, cursor.ch + prefix.length);
    }
    // Ensure the editor keeps focus.
    cm.focus();
}

// Main editor loading function
async function loadEditor(mainContent, editorContainer, viewToolbar, editToolbar) {
    try {
        const isHomepage = window.location.pathname === '/';
        const apiPath = isHomepage ? '/api/source/' : `/api/source${window.location.pathname}`;

        const response = await fetch(apiPath);
        if (!response.ok) throw new Error('Failed to fetch content');

        const markdown = await response.text();

        // Store original content for change detection
        originalContent = markdown;

        // Show editor and switch toolbars
        mainContent.classList.add('editing');
        editorContainer.classList.add('active');
        viewToolbar.style.display = 'none';
        editToolbar.style.display = 'flex';

        // Clear the editor container
        editorContainer.innerHTML = '';

        // Create a container for our editor components (toolbar, editor, preview, statusbar)
        const editorLayout = document.createElement('div');
        editorLayout.className = 'editor-layout';
        editorContainer.appendChild(editorLayout);

        // 1. Create toolbar at the top
        const toolbar = window.EditorToolbar.createToolbar(editorLayout);

        // 2. Create an editor area container to hold both editor and preview
        const editorArea = document.createElement('div');
        editorArea.className = 'editor-area';
        editorLayout.appendChild(editorArea);

        // 3. Create editor wrapper inside the editor area
        const editorWrapper = document.createElement('div');
        editorWrapper.className = 'custom-editor-wrapper';
        editorArea.appendChild(editorWrapper);

        // 4. Create textarea for CodeMirror
        const textarea = document.createElement('textarea');
        textarea.id = 'markdown-editor';
        editorWrapper.appendChild(textarea);

        // 5. Create preview element inside the editor area
        const previewElement = window.EditorPreview.createPreview(editorArea);

        // 6. Create statusbar at the bottom
        const statusbar = createStatusbar(editorLayout);

        // Reset the preview mode
        previewElement.classList.remove('editor-preview-active');

        // Initialize CodeMirror
        if (!editor) {
            // Check if we're on mobile
            const isMobile = window.innerWidth <= 768;

            editor = CodeMirror.fromTextArea(textarea, {
                mode: 'markdown',
                theme: 'default', // Always use default theme and customize it
                lineNumbers: true,
                lineWrapping: true,
                autofocus: true,
                tabSize: 2,
                indentWithTabs: false,
                // Disable styleActiveLine completely on mobile to prevent the highlighting issue
                styleActiveLine: isMobile ? false : {
                    nonEmpty: true
                },
                extraKeys: {
                    // Tab and Enter handling is now done directly in markdown-table-editor.js
                    // by overriding the CodeMirror commands
                    // All other shortcuts are handled centrally in keyboard-shortcuts.js
                },
                placeholder: 'Write your markdown here...',
                spellcheck: true,
                gutters: ["CodeMirror-linenumbers"]
            });

            // Apply our custom markdown mode with frontmatter support
            editor.setOption("mode", "markdown-with-frontmatter");
            editor.addOverlay("markdown-highlight-overlay");

            // Apply custom styling to the editor
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

            // Apply custom styling to tone down the syntax highlighting colors
            const editorElement = document.querySelector('.CodeMirror');
            if (editorElement) {
                window.EditorThemes.updateCodeMirrorTheme(isDarkMode ? 'dark' : 'light');
            }

            // Set editor height
            editor.setSize(null, "calc(100vh - 380px)");

            // Set up events for toolbar interactions
            window.EditorToolbar.setupToolbarActions(toolbar);

            // Set up events for statusbar updates
            editor.on('cursorActivity', () => updateStatusbar(statusbar));
            editor.on('change', () => {
                updateStatusbar(statusbar);

                // Update preview if active
                if (previewElement.classList.contains('editor-preview-active')) {
                    window.EditorPreview.updatePreview(editor.getValue());
                }

                // Set up beforeunload handler when changes occur
                setupBeforeUnloadHandler();
            });

            // Set initial state of the wordwrap button based on editor settings
            const wrapButton = document.querySelector('.toggle-wordwrap-button');
            if (wrapButton && editor.getOption('lineWrapping')) {
                wrapButton.classList.add('active');
                wrapButton.title = 'Disable Word Wrap';
            }
        }

        // Set initial content
        editor.setValue(markdown);
        // Clear history so the loaded content is the initial undo boundary
        if (editor && typeof editor.clearHistory === 'function') {
            editor.clearHistory();
        }

        // Make sure editor is visible (not in preview mode)
        document.querySelector('.CodeMirror').style.display = 'block';

        // Force a refresh with multiple attempts to ensure editor renders properly
        refreshEditor(statusbar);

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load content for editing');
    }
}

// Function to create statusbar
function createStatusbar(container) {
    const statusbar = document.createElement('div');
    statusbar.className = 'editor-statusbar';

    // Add status elements (lines, words, cursor position)
    const linesStatus = document.createElement('span');
    linesStatus.className = 'lines';
    linesStatus.textContent = '0';

    const wordsStatus = document.createElement('span');
    wordsStatus.className = 'words';
    wordsStatus.textContent = '0';

    const cursorStatus = document.createElement('span');
    cursorStatus.className = 'cursor';
    cursorStatus.textContent = '0:0';

    statusbar.appendChild(linesStatus);
    statusbar.appendChild(wordsStatus);
    statusbar.appendChild(cursorStatus);

    container.appendChild(statusbar);
    return statusbar;
}

// Function to update statusbar
function updateStatusbar(statusbar) {
    if (!editor || !statusbar) return;

    const content = editor.getValue();
    const lines = content.split('\n').length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const cursor = editor.getCursor();

    statusbar.querySelector('.lines').textContent = lines;
    statusbar.querySelector('.words').textContent = words;
    statusbar.querySelector('.cursor').textContent = `${cursor.line + 1}:${cursor.ch}`;
}

// Helper function to ensure editor gets properly refreshed
function refreshEditor(statusbar) {
    if (!editor) return;

    // Immediate refresh - apply all refreshes at once
    editor.refresh();
    editor.focus();
    if (statusbar) updateStatusbar(statusbar);

    // Secondary quick refresh to ensure rendering
    requestAnimationFrame(() => {
        if (editor) {
            editor.refresh();
            editor.focus();
            if (statusbar) updateStatusbar(statusbar);
        }
    });
}

// Exit edit mode
function exitEditMode(mainContent, editorContainer, viewToolbar, editToolbar) {
    // Remove beforeunload handler first
    removeBeforeUnloadHandler();

    // Make sure to update UI state classes first
    if (mainContent) mainContent.classList.remove('editing');
    if (editorContainer) editorContainer.classList.remove('active');

    // Update toolbar visibility
    if (viewToolbar) viewToolbar.style.display = 'flex';
    if (editToolbar) editToolbar.style.display = 'none';

    // Reset original content
    originalContent = '';

    // Completely destroy the editor instance
    if (editor) {
        try {
            editor.toTextArea();
        } catch(e) {
            console.warn('Error while destroying editor:', e);
        }
        editor = null;
    }

    // Remove preview element
    window.EditorPreview.cleanup();

    // Remove pickers
    window.EditorPickers.cleanup();
}

// Content management functions
function getEditorContent() {
    return editor ? editor.getValue() : '';
}

function insertIntoEditor(url, isImage, name) {
    // Check if editor exists and is initialized
    if (!editor) {
        return false;
    }

    // Check if it's an MP4 file
    const isVideo = name.toLowerCase().endsWith('.mp4');

    // Extract just the filename from the URL
    const filename = name;

    // Create markdown code based on file type
    let markdown = '';
    if (isVideo) {
        // For MP4 files, use code block syntax with just the filename
        markdown = "```mp4\n" + filename + "\n```\n\n";
    } else if (isImage) {
        // For images, use image markdown with just the filename
        markdown = `![${name}](${filename})\n\n`;
    } else {
        // For other files, use link markdown with just the filename
        markdown = `[${name}](${filename})\n\n`;
    }

    // Insert markdown at cursor position
    editor.replaceSelection(markdown);

    // Focus the editor
    editor.focus();

    return true;
}

function insertRawContent(content) {
    // Check if editor exists and is initialized
    if (!editor) {
        return false;
    }

    // Insert content at cursor position
    editor.replaceSelection(content);

    // Focus the editor
    editor.focus();

    return true;
}

function isEditorActive() {
    return !!editor;
}

// Function to check if document has unsaved changes
function hasUnsavedChanges() {
    if (!editor) return false;

    // Compare current content with original content
    const currentContent = editor.getValue();
    if (currentContent !== originalContent) {
        return true;
    }

    return false;
}

// Add function to handle beforeunload event
function setupBeforeUnloadHandler() {
    // Only add the handler if it doesn't already exist
    if (!window._beforeUnloadHandler) {
        window._beforeUnloadHandler = function(e) {
            if (hasUnsavedChanges()) {
                // Standard way to show a confirmation dialog when leaving page
                e.preventDefault();
                // Custom message (note: most modern browsers no longer show this message, just a generic one)
                const leaveMsg = window.i18n ? window.i18n.t('editor.unsaved_changes_leave') : 'You have unsaved changes. Are you sure you want to leave?';
                e.returnValue = leaveMsg;
                return leaveMsg;
            }
        };

        // Add the event listener
        window.addEventListener('beforeunload', window._beforeUnloadHandler);
    }
}

// Function to remove the beforeunload handler
function removeBeforeUnloadHandler() {
    if (window._beforeUnloadHandler) {
        window.removeEventListener('beforeunload', window._beforeUnloadHandler);
        window._beforeUnloadHandler = null;
    }
}

// Function to toggle word wrap
function toggleWordWrap() {
    if (!editor) return;

    // Get current line wrapping state
    const currentWrapping = editor.getOption('lineWrapping');

    // Toggle line wrapping
    editor.setOption('lineWrapping', !currentWrapping);

    // Update button appearance
    const wrapButton = document.querySelector('.toggle-wordwrap-button');
    if (wrapButton) {
        if (!currentWrapping) {
            // Line wrapping was turned on
            wrapButton.classList.add('active');
            wrapButton.title = 'Disable Word Wrap';
        } else {
            // Line wrapping was turned off
            wrapButton.classList.remove('active');
            wrapButton.title = 'Enable Word Wrap';
        }
    }

    // Refresh editor to apply changes
    editor.refresh();
}

// Export the module
window.EditorCore = {
    // Editor management
    loadEditor,
    exitEditMode,
    refreshEditor,
    
    // Content functions
    getEditorContent,
    insertIntoEditor,
    insertRawContent,
    isEditorActive,
    hasUnsavedChanges,
    
    // Utility functions
    wrapText,
    toggleWordWrap,
    
    // Getters
    getEditor: () => editor,
    getOriginalContent: () => originalContent,
    setOriginalContent: (content) => { originalContent = content; }
};