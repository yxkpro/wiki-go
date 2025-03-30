// Dialog functionality has been moved to dialog-system.js

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Global variables
    let maxFileUploadSizeMB = 20; // Default value, will be updated from settings
    let maxFileUploadSizeBytes = maxFileUploadSizeMB * 1024 * 1024;

    // Prevent toolbar flashing on page load
    document.body.classList.add('page-loaded');

    // Check if default password is in use
    checkDefaultPassword();

    // Dialog functions are now initialized in dialog-system.js

    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const body = document.body;

    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        sidebar.classList.toggle('active');
        body.classList.toggle('sidebar-active');
        content.classList.toggle('sidebar-active');
    });

    document.addEventListener('click', function(e) {
        if (sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !hamburger.contains(e.target)) {
            hamburger.classList.remove('active');
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-active');
            content.classList.remove('sidebar-active');
        }
    });

    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                hamburger.classList.remove('active');
                sidebar.classList.remove('active');
                body.classList.remove('sidebar-active');
                content.classList.remove('sidebar-active');
            }
        });
    });

    // Touch drag functionality for sidebar on mobile
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50; // Minimum distance required for a swipe
    const edgeThreshold = 30; // Distance from edge to detect edge swipe

    // Handle touch start
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    // Handle touch end
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    // Process the swipe
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;

        // Right swipe (open sidebar)
        if (swipeDistance > swipeThreshold && touchStartX < edgeThreshold && !sidebar.classList.contains('active')) {
            hamburger.classList.add('active');
            sidebar.classList.add('active');
            body.classList.add('sidebar-active');
            content.classList.add('sidebar-active');
        }

        // Left swipe (close sidebar)
        if (swipeDistance < -swipeThreshold && sidebar.classList.contains('active')) {
            hamburger.classList.remove('active');
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-active');
            content.classList.remove('sidebar-active');
        }
    }

    // Theme management has been moved to theme-manager.js

    document.querySelectorAll('pre').forEach(pre => {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.innerHTML = `
            <i class="fa fa-copy"></i>
            <span>Copy</span>
        `;

        button.addEventListener('click', async () => {
            const code = pre.querySelector('code')?.textContent || pre.textContent;
            const allowInsecure = document.documentElement.getAttribute('data-allow-insecure') === 'true';
            let success = false;

            // First try the modern Clipboard API (requires secure context)
            try {
                await navigator.clipboard.writeText(code.trim());
                success = true;
            } catch (err) {
                console.warn('Clipboard API failed, trying fallback method:', err);

                // If insecure operations are allowed, try the fallback method
                if (allowInsecure) {
                    try {
                        // Create a temporary textarea element to copy from
                        const textarea = document.createElement('textarea');
                        textarea.value = code.trim();
                        textarea.setAttribute('readonly', '');
                        textarea.style.position = 'absolute';
                        textarea.style.left = '-9999px';
                        document.body.appendChild(textarea);

                        // Select the text and copy it
                        textarea.select();
                        success = document.execCommand('copy');

                        // Clean up
                        document.body.removeChild(textarea);
                    } catch (fallbackErr) {
                        console.error('Fallback clipboard method failed:', fallbackErr);
                    }
                }
            }

            // Update button UI based on success
            if (success) {
                button.classList.add('copied');
                button.innerHTML = `
                    <i class="fa fa-check"></i>
                    <span>Copied!</span>
                `;
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = `
                        <i class="fa fa-copy"></i>
                        <span>Copy</span>
                    `;
                }, 2000);
            } else {
                // Provide feedback if copying failed
                button.classList.add('copy-failed');
                button.innerHTML = `
                    <i class="fa fa-times"></i>
                    <span>Failed</span>
                `;
                setTimeout(() => {
                    button.classList.remove('copy-failed');
                    button.innerHTML = `
                        <i class="fa fa-copy"></i>
                        <span>Copy</span>
                    `;
                }, 2000);
            }
        });

        pre.appendChild(button);
    });

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

    // Function to check if current user is an admin
    async function checkIfUserIsAdmin() {
        try {
            const response = await fetch('/api/check-auth');
            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.is_admin === true;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Function to show admin-only feature error
    function showAdminOnlyError() {
        window.DialogSystem.showMessageDialog("Admin Access Required", "This feature is only available to administrators.");
    }
    
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

    // Login Dialog Functionality
    const loginDialog = document.querySelector('.login-dialog');
    const closeDialog = document.querySelector('.login-dialog .close-dialog');
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.querySelector('.login-dialog .error-message');
    const loginUsernameInput = document.getElementById('username');
    let editCallback = null;

    function showLoginDialog(callback) {
        loginDialog.classList.add('active');
        editCallback = callback;
        errorMessage.style.display = 'none';
        loginForm.reset();
        // Focus on username field after dialog is shown
        setTimeout(() => {
            loginUsernameInput.focus();
        }, 100);
    }

    function hideLoginDialog() {
        const loginDialog = document.querySelector('.login-dialog');
        if (loginDialog) {
            loginDialog.classList.remove('active');
        }
    }

    closeDialog.addEventListener('click', hideLoginDialog);

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                hideLoginDialog();
                if (window.loginCallback) {
                    // Store loginCallback info in localStorage
                    localStorage.setItem('pendingAction', 'loginCallback');
                    window.loginCallback = null; // Clear the callback after use
                } else if (editCallback) {
                    // Store edit action in localStorage
                    localStorage.setItem('pendingAction', 'editPage');
                }

                // Reload the page to refresh the comments section
                window.location.reload();
            } else {
                errorMessage.textContent = window.i18n ? window.i18n.t('login.error') : 'Invalid username or password';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';
        }
    });

    // New Document functionality
    const newDocButton = document.querySelector('.new-document');
    const newDocDialog = document.querySelector('.new-document-dialog');
    const newDocForm = document.getElementById('newDocumentForm');
    const closeNewDocDialog = newDocDialog.querySelector('.close-dialog');
    const cancelNewDocButton = newDocDialog.querySelector('.cancel-new-doc');
    const docTitleInput = document.getElementById('docTitle');
    const docPathInput = document.getElementById('docPath');
    const docSlugInput = document.getElementById('docSlug');
    const newDocErrorMessage = newDocDialog.querySelector('.error-message');

    // Auto-generate slug from title
    docTitleInput.addEventListener('input', function() {
        const title = this.value;
        const slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/-+/g, '-') // Replace multiple dashes with single dash
            .trim();

        docSlugInput.value = slug;
    });

    function showNewDocDialog() {
        newDocDialog.classList.add('active');
        newDocErrorMessage.style.display = 'none';
        newDocForm.reset();

        // Pre-populate path with current path
        const currentPath = window.location.pathname;
        if (currentPath && currentPath !== '/') {
            // Remove leading and trailing slashes
            let path = currentPath.replace(/^\/|\/$/g, '');
            // If current path ends with a filename, get the directory
            if (!path.endsWith('/')) {
                path = path.substring(0, path.lastIndexOf('/'));
            }
            docPathInput.value = path;
        }

        // Focus on title field
        setTimeout(() => {
            docTitleInput.focus();
        }, 100);
    }

    function hideNewDocDialog() {
        newDocDialog.classList.remove('active');
    }

    // Show dialog when clicking New Document button
    if (newDocButton) {
        newDocButton.addEventListener('click', async function() {
            try {
                // Check if user is authenticated
                const authResponse = await fetch('/api/check-auth');
                if (authResponse.status === 401) {
                    // Show login dialog
                    showLoginDialog(() => {
                        // After login, check if admin
                        checkIfUserIsAdmin().then(isAdmin => {
                            if (isAdmin) {
                                showNewDocDialog();
                                // Update toolbar buttons after login
                                updateToolbarButtons();
                            } else {
                                showAdminOnlyError();
                            }
                        });
                    });
                    return;
                }

                // User is authenticated, check if admin
                const isAdmin = await checkIfUserIsAdmin();
                if (isAdmin) {
                    showNewDocDialog();
                } else {
                    showAdminOnlyError();
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to check authentication status');
            }
        });
    }

    // Close dialog when clicking close button or cancel
    closeNewDocDialog.addEventListener('click', hideNewDocDialog);
    cancelNewDocButton.addEventListener('click', hideNewDocDialog);

    // Handle form submission
    newDocForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get values
        const title = docTitleInput.value.trim();
        let path = docPathInput.value.trim();
        let slug = docSlugInput.value.trim();

        // Validate
        if (!title || !slug) {
            newDocErrorMessage.textContent = 'Title and slug are required';
            newDocErrorMessage.style.display = 'block';
            return;
        }

        // Remove leading and trailing slashes from path if it's not empty
        if (path) {
            path = path.replace(/^\/|\/$/g, '');
        }

        // Combine path and slug
        // If path is empty, just use the slug (creates document at root level)
        const fullPath = path ? `${path}/${slug}` : slug;

        try {
            const response = await fetch('/api/document/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    path: fullPath
                })
            });

            if (response.ok) {
                const result = await response.json();
                // Redirect to the new document
                window.location.href = result.url;
            } else {
                const errorData = await response.json().catch(() => null);
                if (errorData && errorData.message) {
                    let errorMsg = errorData.message;
                    // Check if it's a "Document already exists" error
                    if (errorMsg.includes("Document already exists")) {
                        errorMsg = window.i18n ? window.i18n.t('new_doc.already_exists') : 'Document already exists';
                    } else if (errorData.error) {
                        // Add error details if available
                        errorMsg += `: ${errorData.error}`;
                    }
                    newDocErrorMessage.textContent = errorMsg;
                } else {
                    newDocErrorMessage.textContent = 'Failed to create document';
                }
                newDocErrorMessage.style.display = 'block';
                console.error('Document creation error:', errorData);
            }
        } catch (error) {
            console.error('Error creating document:', error);
            newDocErrorMessage.textContent = 'An error occurred. Please try again.';
            newDocErrorMessage.style.display = 'block';
        }
    });

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
                    showLoginDialog(() => {
                        // After login, check if admin
                        checkIfUserIsAdmin().then(isAdmin => {
                            if (isAdmin) {
                                loadEditor();
                                // Update toolbar buttons after login
                                updateToolbarButtons();
                            } else {
                                showAdminOnlyError();
                            }
                        });
                    });
                    return;
                }

                // User is authenticated, check if admin
                const isAdmin = await checkIfUserIsAdmin();
                if (isAdmin) {
                    loadEditor();
                } else {
                    showAdminOnlyError();
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
            const isSettingsDialogOpen = settingsDialog && settingsDialog.classList.contains('active');
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
                hideConfirmationDialog();
            } else if (isNewDocDialogOpen) {
                // Close new document dialog
                hideNewDocDialog();
            } else if (isSettingsDialogOpen) {
                // Close settings dialog
                hideSettingsDialog();
            } else if (isEditing) {
                // Close edit mode if no dialogs are open
                exitEditMode();
            }
        }
    });

    // New code for delete document functionality
    const deleteButton = document.querySelector('.delete-document');
    const confirmationDialog = document.querySelector('.confirmation-dialog');
    const deleteConfirmBtn = document.querySelector('.confirmation-dialog .delete-confirm');
    const cancelDeleteBtn = document.querySelector('.confirmation-dialog .cancel-delete');

    // Function to hide document deletion confirmation dialog
    function hideConfirmationDialog() {
        confirmationDialog.classList.remove('active');
    }

    // Show delete confirmation dialog
    if (deleteButton) {
        deleteButton.addEventListener('click', function() {
            confirmationDialog.classList.add('active');
        });
    }

    // Cancel delete operation
    cancelDeleteBtn.addEventListener('click', function() {
        hideConfirmationDialog();
    });

    // Confirm delete operation
    deleteConfirmBtn.addEventListener('click', async function() {
        try {
            const isHomepage = window.location.pathname === '/';

            // Don't allow deleting the homepage
            if (isHomepage) {
                alert('The homepage cannot be deleted.');
                hideConfirmationDialog();
                return;
            }

            const apiPath = `/api/document${window.location.pathname}`;

            const response = await fetch(apiPath, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to delete document');
            }

            // Handle successful deletion
            // Redirect to parent directory
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            pathParts.pop(); // Remove the last part (document name)
            const parentPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';

            window.location.href = parentPath;
        } catch (error) {
            console.error('Error deleting document:', error);
            alert(error.message || 'Failed to delete document');
            hideConfirmationDialog();
        }
    });

    // Settings functionality
    const settingsButton = document.querySelector('.settings-button');
    const settingsDialog = document.querySelector('.settings-dialog');
    const closeSettingsDialog = settingsDialog.querySelector('.close-dialog');
    const cancelSettingsButton = settingsDialog.querySelector('.cancel-settings');
    const settingsForm = document.getElementById('wikiSettingsForm');
    const settingsErrorMessage = settingsDialog.querySelector('.error-message');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to current tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Show settings dialog
    if (settingsButton) {
        settingsButton.addEventListener('click', async function() {
            try {
                // Check if user is authenticated
                const authResponse = await fetch('/api/check-auth');
                if (authResponse.status === 401) {
                    // Show login dialog
                    showLoginDialog(() => {
                        // After login, check if admin
                        checkIfUserIsAdmin().then(isAdmin => {
                            if (isAdmin) {
                                loadSettings();
                                // Update toolbar buttons after login
                                updateToolbarButtons();
                            } else {
                                showAdminOnlyError();
                            }
                        });
                    });
                    return;
                }

                // User is authenticated, check if admin
                const isAdmin = await checkIfUserIsAdmin();
                if (isAdmin) {
                    loadSettings();

                    // Explicitly reset and activate the first tab when opening settings
                    setTimeout(() => {
                        const firstTabButton = document.querySelector('.settings-tabs .tab-button[data-tab="wiki-tab"]');
                        const firstTabPane = document.getElementById('wiki-tab');

                        if (firstTabButton && firstTabPane) {
                            // Reset all tabs first
                            document.querySelectorAll('.settings-tabs .tab-button').forEach(btn => {
                                btn.classList.remove('active');
                            });
                            document.querySelectorAll('.tab-pane').forEach(pane => {
                                pane.classList.remove('active');
                            });

                            // Activate the first tab
                            firstTabButton.classList.add('active');
                            firstTabPane.classList.add('active');
                        }
                    }, 50); // Small delay to ensure dialog is rendered
                } else {
                    showAdminOnlyError();
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to check authentication status');
            }
        });
    }

    // Close dialog when clicking close button or cancel
    if (closeSettingsDialog) {
        closeSettingsDialog.addEventListener('click', hideSettingsDialog);
    }

    if (cancelSettingsButton) {
        cancelSettingsButton.addEventListener('click', hideSettingsDialog);
    }

    // Handle form submission
    if (settingsForm) {
        settingsForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get form values
            const wikiSettings = {
                title: document.getElementById('wikiTitle').value.trim(),
                owner: document.getElementById('wikiOwner').value.trim(),
                notice: document.getElementById('wikiNotice').value.trim(),
                timezone: document.getElementById('wikiTimezone').value.trim(),
                private: document.getElementById('wikiPrivate').checked,
                disable_comments: document.getElementById('wikiDisableComments').checked,
                max_versions: parseInt(document.getElementById('wikiMaxVersions').value, 10) || 0,
                max_upload_size: parseInt(document.getElementById('wikiMaxUploadSize').value, 10) || 20,
                language: document.getElementById('wikiLanguage').value
            };

            // Capture current language for comparison
            const currentLanguage = document.documentElement.lang;
            const newLanguage = wikiSettings.language;
            const languageChanged = currentLanguage !== newLanguage;

            // Validate
            if (!wikiSettings.title || !wikiSettings.owner || !wikiSettings.notice || !wikiSettings.timezone) {
                settingsErrorMessage.textContent = 'All fields are required';
                settingsErrorMessage.style.display = 'block';
                return;
            }

            // Validate max_versions
            if (isNaN(wikiSettings.max_versions) || wikiSettings.max_versions < 0) {
                settingsErrorMessage.textContent = 'Document versions must be a non-negative number';
                settingsErrorMessage.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('/api/settings/wiki', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(wikiSettings)
                });

                if (response.ok) {
                    // If language changed, close settings and reload the page
                    if (languageChanged) {
                        // Close settings dialog
                        hideSettingsDialog();

                        // Reload the page to apply language changes
                        window.location.reload();
                    } else {
                        // Reload the page to show updated settings
                        window.location.reload();
                    }
                } else {
                    const errorData = await response.json().catch(() => null);
                    if (errorData && errorData.message) {
                        settingsErrorMessage.textContent = errorData.message;
                    } else {
                        settingsErrorMessage.textContent = 'Failed to save settings';
                    }
                    settingsErrorMessage.style.display = 'block';
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                settingsErrorMessage.textContent = 'An error occurred while saving settings';
                settingsErrorMessage.style.display = 'block';
            }
        });
    }

    // Function to load settings from the server
    async function loadSettings() {
        try {
            const response = await fetch('/api/settings/wiki');
            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const settings = await response.json();

            // Populate form fields
            document.getElementById('wikiTitle').value = settings.title || '';
            document.getElementById('wikiOwner').value = settings.owner || '';
            document.getElementById('wikiNotice').value = settings.notice || '';
            document.getElementById('wikiTimezone').value = settings.timezone || '';
            document.getElementById('wikiPrivate').checked = settings.private || false;
            document.getElementById('wikiDisableComments').checked = settings.disable_comments || false;

            // Handle max_versions specifically to account for 0 value
            document.getElementById('wikiMaxVersions').value = settings.max_versions !== undefined ? settings.max_versions : 10;

            // Handle max_upload_size
            document.getElementById('wikiMaxUploadSize').value = settings.max_upload_size !== undefined ? settings.max_upload_size : 20;

            // Update global variables for max file size
            maxFileUploadSizeMB = settings.max_upload_size || 20;
            maxFileUploadSizeBytes = maxFileUploadSizeMB * 1024 * 1024;

            // Load users for the users tab
            loadUsers();

            // Show dialog
            settingsDialog.classList.add('active');
            settingsErrorMessage.style.display = 'none';

            // Ensure the first tab is active by default
            const firstTabButton = document.querySelector('.settings-tabs .tab-button[data-tab="wiki-tab"]');
            const firstTabPane = document.getElementById('wiki-tab');

            if (firstTabButton && firstTabPane) {
                // Reset all tabs first
                document.querySelectorAll('.settings-tabs .tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.settings-dialog .tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });

                // Activate the first tab
                firstTabButton.classList.add('active');
                firstTabPane.classList.add('active');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            alert('Failed to load settings');
        }
    }

    // Function to hide settings dialog
    function hideSettingsDialog() {
        settingsDialog.classList.remove('active');
    }

    // User Management Functions
    const usersList = document.querySelector('.users-list');
    const userForm = document.getElementById('userForm');
    const userFormTitle = document.getElementById('user-form-title');
    const userFormMode = document.getElementById('userFormMode');
    const userFormUsernameInput = document.getElementById('userFormUsername');
    const passwordInput = document.getElementById('userFormPassword');
    const passwordHelp = document.getElementById('password-help');
    const userIsAdminCheckbox = document.getElementById('userIsAdmin');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const cancelUserBtn = document.getElementById('cancelUserBtn');

    // Add event listeners for user management
    if (userForm) {
        userForm.addEventListener('submit', handleUserFormSubmit);
    }

    if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', resetUserForm);
    }

    // Add "Add User" button to the users list container
    const usersListContainer = document.querySelector('.users-list-container');
    if (usersListContainer) {
        const addUserBtn = document.createElement('button');
        addUserBtn.className = 'add-user-btn';
        addUserBtn.setAttribute('data-i18n', 'users.add_new'); // Add data-i18n attribute for automatic translation
        addUserBtn.textContent = 'Add New User'; // Default text
        addUserBtn.addEventListener('click', resetUserForm);
        usersListContainer.insertBefore(addUserBtn, usersListContainer.querySelector('.users-list'));
    }

    // Function to load users list
    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('Failed to load users');
            }
            const data = await response.json();
            renderUsersList(data.users);

            // Create "Add New User" button if it doesn't exist
            if (!usersListContainer.querySelector('.add-user-btn')) {
                const addUserBtn = document.createElement('button');
                addUserBtn.className = 'add-user-btn';
                addUserBtn.setAttribute('data-i18n', 'users.add_new'); // Add data-i18n attribute for automatic translation
                addUserBtn.textContent = 'Add New User'; // Default text
                addUserBtn.addEventListener('click', resetUserForm);
                usersListContainer.insertBefore(addUserBtn, usersListContainer.querySelector('.users-list'));

                // Manually translate the button if i18n is already initialized
                if (window.i18n) {
                    window.i18n.translateElement(addUserBtn);
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // Function to render the users list
    function renderUsersList(users) {
        if (!usersList) return;

        if (!users || users.length === 0) {
            usersList.innerHTML = '<div class="empty-message">No users found</div>';
            return;
        }

        // Get current username from session for highlighting
        const currentUsername = document.cookie
            .split('; ')
            .find(row => row.startsWith('session_user='))
            ?.split('=')[1];

        // Sort users: admins first, then alphabetically
        users.sort((a, b) => {
            if (a.is_admin !== b.is_admin) {
                return b.is_admin ? 1 : -1;
            }
            return a.username.localeCompare(b.username);
        });

        const html = users.map(user => {
            const isCurrentUser = user.username === currentUsername;
            return `
                <div class="user-item" data-username="${user.username}">
                    <div class="user-info">
                        <span class="username">${user.username}</span>
                        ${user.is_admin ? '<span class="admin-badge">Admin</span>' : ''}
                        ${isCurrentUser ? `<span class="current-user-badge">${window.i18n ? window.i18n.t('common.you') : 'You'}</span>` : ''}
                    </div>
                    <div class="user-actions">
                        <button class="edit-user-btn" title="Edit user" data-username="${user.username}" data-is-admin="${user.is_admin}">
                            <i class="fa fa-pencil"></i>
                        </button>
                        ${!isCurrentUser ? `
                        <button class="delete-user-btn" title="Delete user" data-username="${user.username}">
                            <i class="fa fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        usersList.innerHTML = html;

        // Add event listeners to the edit and delete buttons
        usersList.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', () => {
                const username = button.getAttribute('data-username');
                const isAdmin = button.getAttribute('data-is-admin') === 'true';
                editUser(username, isAdmin);
            });
        });

        usersList.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', () => {
                const username = button.getAttribute('data-username');
                deleteUser(username);
            });
        });
    }

    // Function to reset the user form (for adding a new user)
    function resetUserForm() {
        userFormMode.value = 'create';
        userFormTitle.textContent = 'Add New User';
        userFormTitle.setAttribute('data-i18n', 'users.add_user_title');
        userFormUsernameInput.value = '';
        userFormUsernameInput.disabled = false;
        passwordInput.value = '';
        passwordHelp.style.display = 'none';
        passwordInput.required = true;
        userIsAdminCheckbox.checked = false;
        saveUserBtn.textContent = 'Add User';
        saveUserBtn.setAttribute('data-i18n', 'users.add_button');

        // Change button text to "Clear" in add mode
        cancelUserBtn.textContent = 'Clear';
        cancelUserBtn.setAttribute('data-i18n', 'users.clear_button');

        // Apply translations if i18n is available
        if (window.i18n) {
            window.i18n.translateElement(userFormTitle);
            window.i18n.translateElement(saveUserBtn);
            window.i18n.translateElement(cancelUserBtn);
        }
    }

    // Function to set up the form for editing a user
    function editUser(username, isAdmin) {
        userFormMode.value = 'update';
        userFormTitle.removeAttribute('data-i18n'); // Remove data-i18n as we're using a dynamic title
        userFormTitle.textContent = `Edit User: ${username}`;
        userFormUsernameInput.value = username;
        userFormUsernameInput.disabled = true;
        passwordInput.value = '';
        passwordHelp.style.display = 'block';
        passwordInput.required = false;
        userIsAdminCheckbox.checked = isAdmin;
        saveUserBtn.textContent = 'Update User';
        saveUserBtn.setAttribute('data-i18n', 'users.update_button');

        // Use "Clear" for consistency with add mode, since the outcome is similar
        cancelUserBtn.textContent = 'Clear';
        cancelUserBtn.setAttribute('data-i18n', 'users.clear_button');

        // Apply translations if i18n is available
        if (window.i18n) {
            window.i18n.translateElement(saveUserBtn);
            window.i18n.translateElement(cancelUserBtn);

            // For the title, we need to use a different approach since it includes the username
            if (window.i18n.t) {
                const editUserTitle = window.i18n.t('users.edit_user_title');
                userFormTitle.textContent = `${editUserTitle}: ${username}`;
            }
        }
    }

    // Function to handle form submission (create or update user)
    async function handleUserFormSubmit(e) {
        e.preventDefault();

        const mode = userFormMode.value;
        const username = userFormUsernameInput.value.trim();
        const password = passwordInput.value;
        const isAdmin = userIsAdminCheckbox.checked;

        if (!username) {
            showMessageDialog("Form Error", "Username is required");
            return;
        }

        if (mode === 'create' && !password) {
            showMessageDialog("Form Error", "Password is required for new users");
            return;
        }

        try {
            let response;

            if (mode === 'create') {
                // Create new user
                response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        is_admin: isAdmin
                    })
                });
            } else {
                // Update existing user
                response = await fetch('/api/users', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        new_password: password || undefined,
                        is_admin: isAdmin
                    })
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Failed to ${mode} user`);
            }

            // Reload users and reset form
            loadUsers();
            resetUserForm();

            // Check if default password is still in use after user creation/update
            checkDefaultPassword();
        } catch (error) {
            console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} user:`, error);
            showMessageDialog(
                "User Operation Failed",
                error.message || `Failed to ${mode} user`
            );
        }
    }

    // Function to delete a user
    async function deleteUser(username) {
        const title = window.i18n ? window.i18n.t('delete_user.title') : "Delete User";
        const message = window.i18n ?
            window.i18n.t('delete_user.confirm_message').replace('{0}', username) :
            `Are you sure you want to delete user "${username}"? This action cannot be undone.`;

        window.DialogSystem.showConfirmDialog(
            title,
            message,
            async (confirmed) => {
                if (!confirmed) {
                    return;
                }

                try {
                    const response = await fetch(`/api/users?username=${encodeURIComponent(username)}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        throw new Error(errorData?.message || 'Failed to delete user');
                    }

                    // Reload users list
                    loadUsers();
                    // Reset form in case the deleted user was being edited
                    resetUserForm();
                    // Check if default password is still in use after user deletion
                    checkDefaultPassword();
                } catch (error) {
                    console.error('Error deleting user:', error);
                    window.DialogSystem.showMessageDialog("Delete Failed", error.message || 'Failed to delete user');
                }
            }
        );
    }

    // Handle form submission
    if (settingsForm) {
        settingsForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get form values
            const wikiSettings = {
                title: document.getElementById('wikiTitle').value.trim(),
                owner: document.getElementById('wikiOwner').value.trim(),
                notice: document.getElementById('wikiNotice').value.trim(),
                timezone: document.getElementById('wikiTimezone').value.trim(),
                private: document.getElementById('wikiPrivate').checked,
                disable_comments: document.getElementById('wikiDisableComments').checked,
                max_versions: parseInt(document.getElementById('wikiMaxVersions').value, 10) || 0,
                max_upload_size: parseInt(document.getElementById('wikiMaxUploadSize').value, 10) || 20,
                language: document.getElementById('wikiLanguage').value
            };

            // Capture current language for comparison
            const currentLanguage = document.documentElement.lang;
            const newLanguage = wikiSettings.language;
            const languageChanged = currentLanguage !== newLanguage;

            // Validate
            if (!wikiSettings.title || !wikiSettings.owner || !wikiSettings.notice || !wikiSettings.timezone) {
                settingsErrorMessage.textContent = 'All fields are required';
                settingsErrorMessage.style.display = 'block';
                return;
            }

            // Validate max_versions
            if (isNaN(wikiSettings.max_versions) || wikiSettings.max_versions < 0) {
                settingsErrorMessage.textContent = 'Document versions must be a non-negative number';
                settingsErrorMessage.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('/api/settings/wiki', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(wikiSettings)
                });

                if (response.ok) {
                    // If language changed, close settings and reload the page
                    if (languageChanged) {
                        // Close settings dialog
                        hideSettingsDialog();

                        // Reload the page to apply language changes
                        window.location.reload();
                    } else {
                        // Reload the page to show updated settings
                        window.location.reload();
                    }
                } else {
                    const errorData = await response.json().catch(() => null);
                    if (errorData && errorData.message) {
                        settingsErrorMessage.textContent = errorData.message;
                    } else {
                        settingsErrorMessage.textContent = 'Failed to save settings';
                    }
                    settingsErrorMessage.style.display = 'block';
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                settingsErrorMessage.textContent = 'An error occurred while saving settings';
                settingsErrorMessage.style.display = 'block';
            }
        });
    }

    // Function to load settings from the server
    async function loadSettings() {
        try {
            const response = await fetch('/api/settings/wiki');
            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const settings = await response.json();

            // Populate form fields
            document.getElementById('wikiTitle').value = settings.title || '';
            document.getElementById('wikiOwner').value = settings.owner || '';
            document.getElementById('wikiNotice').value = settings.notice || '';
            document.getElementById('wikiTimezone').value = settings.timezone || '';
            document.getElementById('wikiPrivate').checked = settings.private || false;
            document.getElementById('wikiDisableComments').checked = settings.disable_comments || false;

            // Handle max_versions specifically to account for 0 value
            document.getElementById('wikiMaxVersions').value = settings.max_versions !== undefined ? settings.max_versions : 10;

            // Handle max_upload_size
            document.getElementById('wikiMaxUploadSize').value = settings.max_upload_size !== undefined ? settings.max_upload_size : 20;

            // Update global variables for max file size
            maxFileUploadSizeMB = settings.max_upload_size || 20;
            maxFileUploadSizeBytes = maxFileUploadSizeMB * 1024 * 1024;

            // Load users for the users tab
            loadUsers();

            // Show dialog
            settingsDialog.classList.add('active');
            settingsErrorMessage.style.display = 'none';

            // Ensure the first tab is active by default
            const firstTabButton = document.querySelector('.settings-tabs .tab-button[data-tab="wiki-tab"]');
            const firstTabPane = document.getElementById('wiki-tab');

            if (firstTabButton && firstTabPane) {
                // Reset all tabs first
                document.querySelectorAll('.settings-tabs .tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.settings-dialog .tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });

                // Activate the first tab
                firstTabButton.classList.add('active');
                firstTabPane.classList.add('active');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            alert('Failed to load settings');
        }
    }

    // Function to hide settings dialog
    function hideSettingsDialog() {
        settingsDialog.classList.remove('active');
    }

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
        fetchMaxUploadSize();

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

    // Function to load document files - moved to file-utilities.js

    // Function to render the files list - moved to file-utilities.js

    // Function to handle file insertion into the editor - moved to file-utilities.js

    // Function to delete a file - moved to file-utilities.js

    // Handle file upload form submission
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Ensure we have the latest max upload size
            await fetchMaxUploadSize();

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

    // Function to load settings from the server
    async function loadSettings() {
        try {
            const response = await fetch('/api/settings/wiki');
            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const settings = await response.json();

            // Populate form fields
            document.getElementById('wikiTitle').value = settings.title || '';
            document.getElementById('wikiOwner').value = settings.owner || '';
            document.getElementById('wikiNotice').value = settings.notice || '';
            document.getElementById('wikiTimezone').value = settings.timezone || '';
            document.getElementById('wikiPrivate').checked = settings.private || false;
            document.getElementById('wikiDisableComments').checked = settings.disable_comments || false;

            // Handle max_versions specifically to account for 0 value
            document.getElementById('wikiMaxVersions').value = settings.max_versions !== undefined ? settings.max_versions : 10;

            // Handle max_upload_size
            document.getElementById('wikiMaxUploadSize').value = settings.max_upload_size !== undefined ? settings.max_upload_size : 20;

            // Update global variables for max file size
            maxFileUploadSizeMB = settings.max_upload_size || 20;
            maxFileUploadSizeBytes = maxFileUploadSizeMB * 1024 * 1024;

            // Load users for the users tab
            loadUsers();

            // Show dialog
            settingsDialog.classList.add('active');
            settingsErrorMessage.style.display = 'none';

            // Ensure the first tab is active by default
            const firstTabButton = document.querySelector('.settings-tabs .tab-button[data-tab="wiki-tab"]');
            const firstTabPane = document.getElementById('wiki-tab');

            if (firstTabButton && firstTabPane) {
                // Reset all tabs first
                document.querySelectorAll('.settings-tabs .tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.settings-dialog .tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });

                // Activate the first tab
                firstTabButton.classList.add('active');
                firstTabPane.classList.add('active');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            alert('Failed to load settings');
        }
    }

    // Function to hide settings dialog
    function hideSettingsDialog() {
        settingsDialog.classList.remove('active');
    }

    // Version History functionality has been moved to version-history.js

    // Function to update toolbar buttons based on authentication status
    async function updateToolbarButtons() {
        try {
            // Check authentication status
            const authResponse = await fetch('/api/check-auth');

            if (authResponse.status === 401) {
                // User is not authenticated
                // Hide all admin-only buttons
                document.querySelectorAll('.admin-only-button').forEach(btn => {
                    btn.style.display = 'none';
                });

                // Show login button, hide logout button
                document.querySelector('.toolbar-button.auth-button.primary').style.cssText = 'display: inline-flex !important';
                document.querySelector('.logout-button').style.cssText = 'display: none !important';
                return;
            }

            // User is authenticated, check if admin
            const authData = await authResponse.json();
            const isAdmin = authData.is_admin === true;

            if (isAdmin) {
                // Admin user - show all admin buttons
                document.querySelectorAll('.admin-only-button').forEach(btn => {
                    btn.style.cssText = 'display: inline-flex !important';
                });

                // Special case for rename button (only show if not on homepage)
                const renameBtn = document.querySelector('.rename-document');
                if (renameBtn && (window.location.pathname === '/' || window.location.pathname === '/homepage')) {
                    renameBtn.style.cssText = 'display: none !important';
                }

                // Show logout button, hide login button
                document.querySelector('.toolbar-button.auth-button.primary').style.cssText = 'display: none !important';
                document.querySelector('.logout-button').style.cssText = 'display: inline-flex !important';
            } else {
                // Regular authenticated user - hide admin buttons
                document.querySelectorAll('.admin-only-button').forEach(btn => {
                    btn.style.display = 'none';
                });

                // Show logout button, hide login button
                document.querySelector('.toolbar-button.auth-button.primary').style.cssText = 'display: none !important';
                document.querySelector('.logout-button').style.cssText = 'display: inline-flex !important';
            }
        } catch (error) {
            console.error('Error checking authentication status:', error);
        }
    }

    // Call updateToolbarButtons on page load
    updateToolbarButtons();

    // Add click handler for login button
    const loginButton = document.querySelector('.toolbar-button.auth-button.primary');
    if (loginButton) {
        loginButton.addEventListener('click', function() {
            // Get the login dialog element
            const loginDialog = document.querySelector('.login-dialog');
            if (!loginDialog) {
                console.error('Login dialog not found');
                return;
            }

            // Show the login dialog
            loginDialog.classList.add('active');

            // Reset form and clear error messages
            const loginForm = document.getElementById('loginForm');
            const errorMessage = loginDialog.querySelector('.error-message');
            if (loginForm) loginForm.reset();
            if (errorMessage) errorMessage.style.display = 'none';

            // Focus on username field
            setTimeout(() => {
                const usernameInput = document.getElementById('username');
                if (usernameInput) usernameInput.focus();
            }, 100);

            // Set callback for after successful login
            window.loginCallback = function() {
                updateToolbarButtons();
            };
        });
    }

    // Add click handler for logout button
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function() {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST'
                });

                if (response.ok) {
                    // Update toolbar buttons after logout
                    updateToolbarButtons();
                } else {
                    window.DialogSystem.showMessageDialog('Error', 'Failed to logout');
                }
            } catch (error) {
                console.error('Error during logout:', error);
                window.DialogSystem.showMessageDialog('Error', 'Failed to logout');
            }
        });
    }

    // Add keyboard shortcut for login dialog (Escape to close)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const loginDialog = document.querySelector('.login-dialog');
            if (loginDialog && loginDialog.classList.contains('active')) {
                hideLoginDialog();
            }
        }
    });

    // Add click handler for login dialog close button
    document.addEventListener('click', function(e) {
        if (e.target.closest('.login-dialog .close-dialog')) {
            hideLoginDialog();
        }
    });

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
            checkIfUserIsAdmin().then(isAdmin => {
                if (!isAdmin) {
                    showAdminOnlyError();
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

    // Function to check if the default password is in use
    async function checkDefaultPassword() {
        try {
            const response = await fetch('/api/check-default-password');
            const data = await response.json();

            const banner = document.getElementById('password-warning-banner');
            if (!banner) return;

            if (data.defaultPasswordInUse) {
                banner.style.display = 'block';
                document.body.classList.add('has-password-warning');
            } else {
                banner.style.display = 'none';
                document.body.classList.remove('has-password-warning');
            }
        } catch (error) {
            console.error('Error checking default password:', error);
        }
    }

    // Function to fetch max upload size from server
    async function fetchMaxUploadSize() {
        try {
            const response = await fetch('/api/settings/wiki');
            if (response.ok) {
                const settings = await response.json();
                if (settings && settings.max_upload_size) {
                    maxFileUploadSizeMB = settings.max_upload_size;
                    maxFileUploadSizeBytes = maxFileUploadSizeMB * 1024 * 1024;
                    console.log(`Max upload size updated to ${maxFileUploadSizeMB}MB`);
                }
            } else if (response.status === 401) {
                // User is not authenticated or not an admin, use the default value
                console.log(`Using default max upload size of ${maxFileUploadSizeMB}MB`);
            }
        } catch (error) {
            console.error('Error fetching max upload size:', error);
        }
    }

    // Add this code near the beginning of the DOMContentLoaded event handler
    // Check for pending actions from previous login
    function checkPendingActions() {
        const pendingAction = localStorage.getItem('pendingAction');
        if (pendingAction) {
            // Clear the pending action first to prevent loops
            localStorage.removeItem('pendingAction');

            if (pendingAction === 'editPage') {
                // Check if the user is an admin then load the editor
                checkIfUserIsAdmin().then(isAdmin => {
                    if (isAdmin && editPageButton) {
                        // Small delay to ensure the page is fully loaded
                        setTimeout(() => loadEditor(), 100);
                    }
                });
            } else if (pendingAction === 'loginCallback') {
                updateToolbarButtons();
            }
        }
    }

    // Execute pending actions check after page is fully loaded
    setTimeout(checkPendingActions, 500);
});
