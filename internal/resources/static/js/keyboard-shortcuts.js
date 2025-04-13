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
    exitEditMode
};

// Initialize keyboard shortcuts when DOM is loaded
document.addEventListener('DOMContentLoaded', initKeyboardShortcuts);