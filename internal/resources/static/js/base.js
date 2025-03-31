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

        // Close dropdown when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                actionsMenu.classList.remove('active');
            }
        });
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

    // Add keyboard shortcuts for edit mode
    document.addEventListener('keydown', function(e) {
        // Ctrl+E to enter edit mode
        if (e.ctrlKey && e.key.toLowerCase() === 'e') {
            e.preventDefault(); // Prevent default browser behavior
            if (editPageButton && !mainContent.classList.contains('editing')) {
                editPageButton.click();
            }
        }

        // Ctrl+S to save changes in edit mode
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault(); // Prevent browser's save dialog
            if (mainContent.classList.contains('editing')) {
                saveButton.click();
            }
        }

        // Esc to cancel edit mode, close login dialog, or close file upload dialog
        if (e.key === 'Escape') {
            // Check for open dialogs
            const versionHistoryDialog = document.querySelector('.version-history-dialog');
            const isVersionHistoryDialogOpen = versionHistoryDialog && versionHistoryDialog.classList.contains('active');
            const isFileUploadDialogOpen = fileUploadDialog && fileUploadDialog.classList.contains('active');
            const isLoginDialogOpen = loginDialog && loginDialog.classList.contains('active');
            const isMessageDialogOpen = document.querySelector('.message-dialog')?.classList.contains('active');
            const isDeleteConfirmDialogOpen = confirmationDialog && confirmationDialog.classList.contains('active');
            const isUserConfirmDialogOpen = document.querySelector('.user-confirmation-dialog')?.classList.contains('active');
            const isNewDocDialogOpen = newDocDialog && newDocDialog.classList.contains('active');
            const isSettingsDialogOpen = document.querySelector('.settings-dialog')?.classList.contains('active');
            const isMoveDocDialogOpen = document.querySelector('.move-document-dialog')?.classList.contains('active');
            const isEditing = mainContent && mainContent.classList.contains('editing');

            if (isLoginDialogOpen) {
                // Close login dialog first
                hideLoginDialog();
            } else if (isMessageDialogOpen) {
                // Close message dialog first
                window.DialogSystem.hideMessageDialog();
            } else if (isUserConfirmDialogOpen) {
                // Close user confirmation dialog
                window.DialogSystem.hideConfirmDialog();
            } else if (isVersionHistoryDialogOpen) {
                // Close version history dialog first
                window.VersionHistory.hideVersionHistoryDialog();
                return; // Exit the event handler completely to prevent exiting edit mode
            } else if (isFileUploadDialogOpen) {
                // Close file upload dialog
                hideFileUploadDialog();
            } else if (isMoveDocDialogOpen) {
                // Close move document dialog
                hideMoveDocDialog();
            } else if (isDeleteConfirmDialogOpen) {
                // Close delete confirmation dialog
                window.DocumentManager.hideConfirmationDialog();
            } else if (isNewDocDialogOpen) {
                // Close new document dialog
                window.DocumentManager.hideNewDocDialog();
            } else if (isSettingsDialogOpen) {
                // Close settings dialog
                window.SettingsManager.hideSettingsDialog();
            } else if (isEditing) {
                // Close edit mode if no dialogs are open
                exitEditMode();
            }
        }
    });

    // Document deletion functionality has been moved to document-management.js

    // Settings functionality has been moved to settings-manager.js

    // User Management Functions have been moved to settings-manager.js

    // File Upload Dialog Functionality
    const uploadFileButton = document.querySelector('.upload-file');
    const fileUploadDialog = document.querySelector('.file-upload-dialog');
    const closeFileUploadDialog = fileUploadDialog.querySelector('.close-dialog');
    const fileUploadForm = document.getElementById('fileUploadForm');
    const filesList = document.querySelector('.files-list');
    const fileUploadErrorMessage = fileUploadDialog.querySelector('.error-message');
    const fileUploadTabButtons = document.querySelectorAll('.file-upload-tabs .tab-button');
    const fileUploadTabPanes = fileUploadDialog.querySelectorAll('.tab-pane');

    // File utility functions have been moved to file-utilities.js

    // Tab switching in file upload dialog
    fileUploadTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            // Remove active class from all tabs
            fileUploadTabButtons.forEach(btn => btn.classList.remove('active'));
            fileUploadTabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to current tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // If switching to files tab, load files
            if (tabId === 'files-tab') {
                loadDocumentFiles();
            }
        });
    });

    // Show file upload dialog
    function showFileUploadDialog() {
        fileUploadDialog.classList.add('active');
        fileUploadErrorMessage.style.display = 'none';
        fileUploadForm.reset();

        // Fetch the latest max upload size when dialog opens
        window.SettingsManager.fetchMaxUploadSize();

        // Explicitly reset and activate the first tab when opening the dialog
        setTimeout(() => {
            const firstTabButton = document.querySelector('.file-upload-tabs .tab-button[data-tab="upload-tab"]');
            const firstTabPane = document.getElementById('upload-tab');

            if (firstTabButton && firstTabPane) {
                // Reset all tabs first
                document.querySelectorAll('.file-upload-tabs .tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.file-upload-dialog .tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });

                // Activate the first tab
                firstTabButton.classList.add('active');
                firstTabPane.classList.add('active');
            }
        }, 50); // Small delay to ensure dialog is rendered

        // Load files if the files tab is active
        if (document.getElementById('files-tab').classList.contains('active')) {
            window.FileUtilities.loadDocumentFiles();
        }
    }

    // Hide file upload dialog
    function hideFileUploadDialog() {
        fileUploadDialog.classList.remove('active');
    }

    // Expose function to global scope for use in other modules
    window.hideFileUploadDialog = hideFileUploadDialog;

    // Add event listeners for showing/hiding dialog
    if (uploadFileButton) {
        uploadFileButton.addEventListener('click', showFileUploadDialog);
    }

    if (closeFileUploadDialog) {
        closeFileUploadDialog.addEventListener('click', hideFileUploadDialog);
    }

    // Handle ESC key to close the file upload dialog
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (fileUploadDialog.classList.contains('active')) {
                hideFileUploadDialog();
                e.preventDefault();
            }
        }
    });

    // Function to load document files - moved to file-utilities.js

    // Function to render the files list - moved to file-utilities.js

    // Function to handle file insertion into the editor - moved to file-utilities.js

    // Function to delete a file - moved to file-utilities.js

    // Handle file upload form submission
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Ensure we have the latest max upload size
            await window.SettingsManager.fetchMaxUploadSize();

            const fileInput = document.getElementById('fileToUpload');
            const file = fileInput.files[0];

            if (!file) {
                let message = 'Please select a file to upload';
                if (window.i18n && window.i18n.t) {
                    message = window.i18n.t('attachments.no_file_chosen');
                }
                fileUploadErrorMessage.textContent = message;
                fileUploadErrorMessage.style.display = 'block';
                return;
            }

            // Check file size
            const maxFileUploadSizeMB = window.SettingsManager.maxFileUploadSizeMB();
            const maxFileUploadSizeBytes = window.SettingsManager.maxFileUploadSizeBytes();

            if (file.size > maxFileUploadSizeBytes) {
                // Use translated message with the maxFileSize variable
                let message = `File size exceeds the ${maxFileUploadSizeMB}MB limit`;
                if (window.i18n && window.i18n.t) {
                    message = window.i18n.t('attachments.error_file_size').replace('{{maxFileSize}}', `${maxFileUploadSizeMB}MB`);
                }
                fileUploadErrorMessage.textContent = message;
                fileUploadErrorMessage.style.display = 'block';
                return;
            }

            // Check file type
            const ext = file.name.split('.').pop().toLowerCase();

            // Use the globally defined ALLOWED_FILE_EXTENSIONS from base.html template
            if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
                console.log('[DEBUG] - Showing error for invalid file type');

                // Format allowed extensions into a user-friendly string
                let allowedTypesDisplay;
                try {
                    // If ALLOWED_FILE_EXTENSIONS is a JSON string, parse it
                    let extensionsArray = ALLOWED_FILE_EXTENSIONS;

                    // Check if it's a string that needs parsing
                    if (typeof ALLOWED_FILE_EXTENSIONS === 'string' &&
                        ALLOWED_FILE_EXTENSIONS.startsWith('[') &&
                        ALLOWED_FILE_EXTENSIONS.endsWith(']')) {
                        extensionsArray = JSON.parse(ALLOWED_FILE_EXTENSIONS);
                    }

                    // Convert array to comma-separated string without quotes
                    if (Array.isArray(extensionsArray)) {
                        allowedTypesDisplay = extensionsArray.join(', ');
                    } else {
                        allowedTypesDisplay = String(ALLOWED_FILE_EXTENSIONS).replace(/[\[\]"]/g, '').replace(/,/g, ', ');
                    }
                } catch (e) {
                    // Fallback: clean up the raw string
                    allowedTypesDisplay = String(ALLOWED_FILE_EXTENSIONS).replace(/[\[\]"]/g, '').replace(/,/g, ', ');
                }

                // Use translated message with the allowedTypes variable
                let message = 'Invalid file type. Allowed types: ' + allowedTypesDisplay;
                if (window.i18n && window.i18n.t) {
                    message = window.i18n.t('attachments.error_file_type').replace('{{allowedTypes}}', allowedTypesDisplay);
                }
                fileUploadErrorMessage.textContent = message;
                fileUploadErrorMessage.style.display = 'block';
                return;
            }

            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('docPath', getCurrentDocPath());

            try {
                // Show loading state
                const uploadBtn = document.getElementById('uploadFileBtn');
                const originalText = uploadBtn.textContent;
                uploadBtn.textContent = 'Uploading...';
                uploadBtn.disabled = true;

                const response = await fetch('/api/files/upload', {
                    method: 'POST',
                    body: formData
                });

                // Reset button state
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || 'Failed to upload file');
                }

                // Clear form and show success message
                fileUploadForm.reset();
                window.DialogSystem.showMessageDialog("Upload Successful", "File has been uploaded successfully.");

                // Switch to the files tab and refresh the files list
                const filesTabBtn = Array.from(fileUploadTabButtons).find(btn => btn.getAttribute('data-tab') === 'files-tab');
                if (filesTabBtn) {
                    filesTabBtn.click();
                }

                // Refresh the file attachments section
                window.FileUtilities.loadDocumentFiles();
            } catch (error) {
                console.error('Error uploading file:', error);
                fileUploadErrorMessage.textContent = error.message || 'Failed to upload file';
                fileUploadErrorMessage.style.display = 'block';
            }
        });
        // Reset error message when a new file is selected
        const fileInput = document.getElementById('fileToUpload');
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                // Clear any existing error messages when a new file is selected
                if (fileUploadErrorMessage) {
                    fileUploadErrorMessage.style.display = 'none';
                }
            });
        }
    }

    // File Attachments Section functionality
    const fileAttachmentsSection = document.querySelector('.file-attachments-section');
    const fileAttachmentsList = document.querySelector('.file-attachments-list');

    // Only initialize file attachments if we're on a document page
    if (fileAttachmentsSection && document.querySelector('.markdown-content')) {
        window.FileUtilities.loadDocumentFiles();
    }

    // Function to load file attachments for current document - moved to file-utilities.js

    // Function to render file attachments - moved to file-utilities.js

    // Version History functionality has been moved to version-history.js

    // Function to update toolbar buttons based on authentication status - moved to auth.js

    // Call updateToolbarButtons on page load - Auth module does this on initialization

    // Login and logout button handlers have been moved to auth.js

    // Move Document functionality
    const moveDocButton = document.querySelector('.move-document');
    const moveDocDialog = document.querySelector('.move-document-dialog');

    if (moveDocButton && moveDocDialog) {
        const moveDocForm = document.getElementById('moveDocumentForm');
        const closeMoveDocDialog = moveDocDialog.querySelector('.close-dialog');
        const cancelMoveDocButton = moveDocDialog.querySelector('.cancel-dialog');
        const moveDocErrorMessage = moveDocDialog.querySelector('.error-message');
        const moveSourcePathInput = document.getElementById('moveSourcePath');
        const moveTargetPathInput = document.getElementById('moveTargetPath');

        // Hide move button for homepage
        function updateMoveButtonVisibility() {
            const currentPath = getCurrentDocPath();
            if (currentPath === '' || currentPath === '/' || currentPath.toLowerCase() === 'homepage') {
                moveDocButton.style.display = 'none';
            } else {
                moveDocButton.style.display = '';
            }
        }

        // Update visibility when editor is loaded
        document.addEventListener('editor-loaded', updateMoveButtonVisibility);
        updateMoveButtonVisibility();

        // Show dialog when clicking Move Document button
        moveDocButton.addEventListener('click', function() {
            showMoveDocDialog();
        });

        // Function to show the move dialog
        function showMoveDocDialog() {
            // First check if user is an admin
            window.Auth.checkIfUserIsAdmin().then(isAdmin => {
                if (!isAdmin) {
                    window.Auth.showAdminOnlyError();
                    return;
                }

                // Don't show for homepage
                const currentPath = getCurrentDocPath();
                if (currentPath === '' || currentPath === '/' || currentPath.toLowerCase() === 'homepage') {
                    window.DialogSystem.showMessageDialog('Cannot Move Homepage', 'The homepage cannot be moved or renamed.');
                    return;
                }

                moveDocDialog.classList.add('active');
                moveDocErrorMessage.style.display = 'none';
                moveDocForm.reset();

                // Pre-populate source path with current path
                moveSourcePathInput.value = currentPath;

                // Pre-populate target path with the current path for editing
                moveTargetPathInput.value = currentPath;

                // Focus on target path field
                setTimeout(() => {
                    moveTargetPathInput.focus();
                    moveTargetPathInput.select();
                }, 100);
            });
        }

        // Function to hide the move dialog
        function hideMoveDocDialog() {
            moveDocDialog.classList.remove('active');
        }

        // Close dialog when clicking close button or cancel
        if (closeMoveDocDialog) {
            closeMoveDocDialog.addEventListener('click', hideMoveDocDialog);
        }

        if (cancelMoveDocButton) {
            cancelMoveDocButton.addEventListener('click', hideMoveDocDialog);
        }

        // Handle ESC key to close the dialog
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (moveDocDialog.classList.contains('active')) {
                    hideMoveDocDialog();
                    e.preventDefault();
                } else if (document.querySelector('.editor-container').style.display === 'block') {
                    // If ESC is pressed again and we're in edit mode, exit edit mode
                    exitEditMode();
                    e.preventDefault();
                }
            }
        });

        // Handle form submission
        moveDocForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get values
            const sourcePath = moveSourcePathInput.value.trim();
            const targetPath = moveTargetPathInput.value.trim();

            // Validate
            if (!sourcePath) {
                moveDocErrorMessage.textContent = 'Source path is required';
                moveDocErrorMessage.style.display = 'block';
                return;
            }

            if (!targetPath) {
                moveDocErrorMessage.textContent = 'New path is required';
                moveDocErrorMessage.style.display = 'block';
                return;
            }

            // Extract the new slug from the target path
            const pathParts = targetPath.split('/');
            const newSlug = pathParts.pop();
            const newPath = pathParts.join('/');

            try {
                const response = await fetch('/api/document/move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sourcePath: sourcePath,
                        targetPath: newPath,
                        newSlug: newSlug
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        // Redirect to the new document location
                        window.location.href = '/' + result.newPath;
                    } else {
                        moveDocErrorMessage.textContent = result.message || 'Failed to move document';
                        moveDocErrorMessage.style.display = 'block';
                    }
                } else {
                    const errorData = await response.json().catch(() => null);
                    if (errorData && errorData.message) {
                        moveDocErrorMessage.textContent = errorData.message;
                    } else {
                        moveDocErrorMessage.textContent = 'Failed to move document';
                    }
                    moveDocErrorMessage.style.display = 'block';
                    console.error('Document move error:', errorData);
                }
            } catch (error) {
                console.error('Error moving document:', error);
                moveDocErrorMessage.textContent = 'An error occurred. Please try again.';
                moveDocErrorMessage.style.display = 'block';
            }
        });
    }

    // Function to check if the default password is in use - moved to auth.js

    // Function to fetch max upload size from server has been moved to settings-manager.js

    // Check for pending actions from previous login - moved to auth.js
});
