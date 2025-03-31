// Dialog functionality has been moved to dialog-system.js

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Prevent toolbar flashing on page load
    document.body.classList.add('page-loaded');

    // Authentication functionality has been moved to auth.js

    // Dialog functions are now initialized in dialog-system.js

    // Sidebar navigation functionality has been moved to sidebar-navigation.js

    // Theme management has been moved to theme-manager.js

    // Copy button functionality has been moved to copy-button.js

    // Search functionality has been moved to search.js

    // Page actions dropdown
    const actionsButton = document.querySelector('.page-actions-button');
    const actionsMenu = document.querySelector('.page-actions-menu');

    if (actionsButton && actionsMenu) {
        actionsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            actionsMenu.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!actionsMenu.contains(e.target) && !actionsButton.contains(e.target)) {
                actionsMenu.classList.remove('active');
            }
        });

        // Escape key handling is now in keyboard-shortcuts.js
    }

    // Edit functionality
    const editPageButton = document.querySelector('.edit-page');
    const saveButton = document.querySelector('.save-changes');
    const cancelButton = document.querySelector('.cancel-edit');
    const editorContainer = document.querySelector('.editor-container');
    const mainContent = document.querySelector('.content');
    const viewToolbar = document.querySelector('.view-toolbar');
    const editToolbar = document.querySelector('.edit-toolbar');

    // Authentication functionality has been moved to auth.js

    // Dialog functionality has been moved to dialog-system.js

    // Auto-enter edit mode if content is empty
    const markdownContent = document.querySelector('.markdown-content');
    if (markdownContent && editPageButton) {
        const contentText = markdownContent.textContent.trim();
        const h1Only = markdownContent.children.length === 1 &&
                      markdownContent.children[0].tagName === 'H1';

        if (h1Only) {
            editPageButton.click();
        }
    }

    // Login Dialog Functionality has been moved to auth.js

    // Document Management functionality (new document, delete) has been moved to document-management.js

    // Function to exit edit mode
    function exitEditMode() {
        WikiEditor.exitEditMode(mainContent, editorContainer, viewToolbar, editToolbar);
    }

    // Update edit button functionality
    if (editPageButton) {
        editPageButton.addEventListener('click', async function() {
            try {
                // Check if user is authenticated
                const authResponse = await fetch('/api/check-auth');
                if (authResponse.status === 401) {
                    // Show login dialog
                    window.Auth.showLoginDialog(() => {
                        // After login, check if admin
                        window.Auth.checkIfUserIsAdmin().then(isAdmin => {
                            if (isAdmin) {
                                loadEditor();
                                // Update toolbar buttons after login
                                window.Auth.updateToolbarButtons();
                            } else {
                                window.Auth.showAdminOnlyError();
                            }
                        });
                    });
                    return;
                }

                // User is authenticated, check if admin
                const isAdmin = await window.Auth.checkIfUserIsAdmin();
                if (isAdmin) {
                    loadEditor();
                } else {
                    window.Auth.showAdminOnlyError();
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to check authentication status');
            }
        });
    }

    // Function to load the editor
    async function loadEditor() {
        // Use the WikiEditor module from editor.js
        return WikiEditor.loadEditor(mainContent, editorContainer, viewToolbar, editToolbar);
    }

    // Editor theme is now handled by theme-manager.js through the themeChanged event

    // Save button functionality
    if (saveButton) {
        saveButton.addEventListener('click', async function() {
            try {
                const isHomepage = window.location.pathname === '/';
                const apiPath = isHomepage ? '/api/save/' : `/api/save${window.location.pathname}`;

                const content = WikiEditor.getEditorContent();

                const response = await fetch(apiPath, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: content
                });

                if (!response.ok) throw new Error('Failed to save content');

                window.location.reload();

            } catch (error) {
                console.error('Error:', error);
                alert('Failed to save changes');
            }
        });
    }

    // Cancel button functionality
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            exitEditMode();
        });
    }

    // Keyboard shortcuts have been moved to keyboard-shortcuts.js

    // Document deletion functionality has been moved to document-management.js

    // Settings functionality has been moved to settings-manager.js

    // User Management Functions have been moved to settings-manager.js

    // File Upload functionality has been moved to file-upload.js

    // Function to load file attachments for current document - moved to file-utilities.js

    // Function to render file attachments - moved to file-utilities.js

    // Version History functionality has been moved to version-history.js

    // Function to update toolbar buttons based on authentication status - moved to auth.js

    // Call updateToolbarButtons on page load - Auth module does this on initialization

    // Login and logout button handlers have been moved to auth.js

    // Move Document functionality has been moved to move-document.js

    // Function to check if the default password is in use - moved to auth.js

    // Function to fetch max upload size from server has been moved to settings-manager.js

    // Check for pending actions from previous login - moved to auth.js
});
