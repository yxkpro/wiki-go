// Authentication Module for Wiki-Go
// Handles login, logout, and authentication-related functionality
(function() {
    'use strict';

    // Module state
    let loginDialog;
    let closeDialog;
    let loginForm;
    let errorMessage;
    let loginUsernameInput;
    let editCallback = null;

    // Initialize module when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Login Dialog Elements
        loginDialog = document.querySelector('.login-dialog');
        closeDialog = document.querySelector('.login-dialog .close-dialog');
        loginForm = document.getElementById('loginForm');
        errorMessage = document.querySelector('.login-dialog .error-message');
        loginUsernameInput = document.getElementById('username');

        // Set up event listeners
        if (closeDialog) {
            closeDialog.addEventListener('click', hideLoginDialog);
        }

        if (loginForm) {
            loginForm.addEventListener('submit', handleLoginSubmit);
        }

        // Add click handler for login button
        const loginButton = document.querySelector('.toolbar-button.auth-button.primary');
        if (loginButton) {
            loginButton.addEventListener('click', function() {
                // Show the login dialog
                loginDialog.classList.add('active');

                // Reset form and clear error messages
                loginForm.reset();
                errorMessage.style.display = 'none';

                // Focus on username field
                setTimeout(() => {
                    loginUsernameInput.focus();
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
            logoutButton.addEventListener('click', handleLogout);
        }

        // Escape key is now handled by keyboard-shortcuts.js

        // Add click handler for login dialog close button
        document.addEventListener('click', function(e) {
            if (e.target.closest('.login-dialog .close-dialog')) {
                hideLoginDialog();
            }
        });

        // Check if default password is in use
        checkDefaultPassword();

        // Check for pending actions from previous login - remove the delay
        checkPendingActions();
    });

    // Function to show login dialog
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

    // Function to hide login dialog
    function hideLoginDialog() {
        if (loginDialog) {
            loginDialog.classList.remove('active');
        }
    }

    // Function to handle login form submission
    async function handleLoginSubmit(e) {
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
    }

    // Function to handle logout
    async function handleLogout() {
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
    }

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

    // Function to check for pending actions from previous login
    function checkPendingActions() {
        const pendingAction = localStorage.getItem('pendingAction');
        if (pendingAction) {
            // Clear the pending action first to prevent loops
            localStorage.removeItem('pendingAction');

            if (pendingAction === 'editPage') {
                // Check if the user is an admin then load the editor
                checkIfUserIsAdmin().then(isAdmin => {
                    if (isAdmin && document.querySelector('.edit-page')) {
                        // Load editor immediately without delay
                        if (typeof WikiEditor !== 'undefined' && WikiEditor.loadEditor) {
                            const mainContent = document.querySelector('.content');
                            const editorContainer = document.querySelector('.editor-container');
                            const viewToolbar = document.querySelector('.view-toolbar');
                            const editToolbar = document.querySelector('.edit-toolbar');

                            WikiEditor.loadEditor(mainContent, editorContainer, viewToolbar, editToolbar);
                        }
                    }
                });
            } else if (pendingAction === 'loginCallback') {
                updateToolbarButtons();
            }
        }
    }

    // Expose public API
    window.Auth = {
        showLoginDialog: showLoginDialog,
        hideLoginDialog: hideLoginDialog,
        checkIfUserIsAdmin: checkIfUserIsAdmin,
        showAdminOnlyError: showAdminOnlyError,
        updateToolbarButtons: updateToolbarButtons,
        checkDefaultPassword: checkDefaultPassword
    };
})();