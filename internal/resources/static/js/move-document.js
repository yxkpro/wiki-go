/**
 * Move Document Module
 * Contains functionality for moving and renaming documents
 */

// Show the move document dialog
function showMoveDocDialog() {
    const moveDocDialog = document.querySelector('.move-document-dialog');
    const moveDocErrorMessage = moveDocDialog.querySelector('.error-message');
    const moveDocForm = document.getElementById('moveDocumentForm');
    const moveSourcePathInput = document.getElementById('moveSourcePath');
    const moveTargetPathInput = document.getElementById('moveTargetPath');

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

// Hide the move document dialog
function hideMoveDocDialog() {
    const moveDocDialog = document.querySelector('.move-document-dialog');
    moveDocDialog.classList.remove('active');
}

// Handle form submission for moving a document
async function handleMoveDocumentSubmit(e) {
    e.preventDefault();

    const moveDocDialog = document.querySelector('.move-document-dialog');
    const moveDocErrorMessage = moveDocDialog.querySelector('.error-message');
    const moveSourcePathInput = document.getElementById('moveSourcePath');
    const moveTargetPathInput = document.getElementById('moveTargetPath');

    // Get values
    const sourcePath = moveSourcePathInput.value.trim();
    const targetPath = moveTargetPathInput.value.trim();

    // Validate
    if (!sourcePath) {
        moveDocErrorMessage.textContent = window.i18n ? window.i18n.t('move.source_required') : 'Source path is required';
        moveDocErrorMessage.style.display = 'block';
        return;
    }

    if (!targetPath) {
        moveDocErrorMessage.textContent = window.i18n ? window.i18n.t('move.target_required') : 'New path is required';
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
                moveDocErrorMessage.textContent = result.message || (window.i18n ? window.i18n.t('move.failed') : 'Failed to move document');
                moveDocErrorMessage.style.display = 'block';
            }
        } else {
            const errorData = await response.json().catch(() => null);
            if (errorData && errorData.message) {
                // Check for specific error messages
                if (errorData.message.includes("already exists")) {
                    moveDocErrorMessage.textContent = window.i18n ? window.i18n.t('move.target_exists') : 'Target already exists';
                } else {
                    moveDocErrorMessage.textContent = errorData.message;
                }
            } else {
                moveDocErrorMessage.textContent = window.i18n ? window.i18n.t('move.failed') : 'Failed to move document';
            }
            moveDocErrorMessage.style.display = 'block';
            console.error('Document move error:', errorData);
        }
    } catch (error) {
        console.error('Error moving document:', error);
        moveDocErrorMessage.textContent = window.i18n ? window.i18n.t('move.error') : 'An error occurred. Please try again.';
        moveDocErrorMessage.style.display = 'block';
    }
}

// Update move button visibility based on current document
function updateMoveButtonVisibility() {
    const moveDocButton = document.querySelector('.move-document');
    if (!moveDocButton) return;

    const currentPath = getCurrentDocPath();
    if (currentPath === '' || currentPath === '/' || currentPath.toLowerCase() === 'homepage') {
        moveDocButton.style.display = 'none';
    } else {
        // Ensure it is visible (inline-flex) so it overrides the admin-only-button default
        moveDocButton.style.cssText = 'display: inline-flex !important';
    }
}

// Initialize move document functionality
function initMoveDocument() {
    const moveDocButton = document.querySelector('.move-document');
    const moveDocDialog = document.querySelector('.move-document-dialog');

    if (!moveDocButton || !moveDocDialog) return;

    const moveDocForm = document.getElementById('moveDocumentForm');
    const closeMoveDocDialog = moveDocDialog.querySelector('.close-dialog');
    const cancelMoveDocButton = moveDocDialog.querySelector('.cancel-dialog');

    // Hide move button for homepage
    updateMoveButtonVisibility();

    // Update visibility when editor is loaded
    document.addEventListener('editor-loaded', updateMoveButtonVisibility);

    // Show dialog when clicking Move Document button
    moveDocButton.addEventListener('click', function() {
        showMoveDocDialog();
    });

    // Close dialog when clicking close button or cancel
    if (closeMoveDocDialog) {
        closeMoveDocDialog.addEventListener('click', hideMoveDocDialog);
    }

    if (cancelMoveDocButton) {
        cancelMoveDocButton.addEventListener('click', hideMoveDocDialog);
    }

    // Handle form submission
    if (moveDocForm) {
        moveDocForm.addEventListener('submit', handleMoveDocumentSubmit);
    }
}

// Export module functions
window.MoveDocument = {
    init: initMoveDocument,
    showMoveDocDialog,
    hideMoveDocDialog,
    updateMoveButtonVisibility
};

// Initialize the module when DOM is loaded
document.addEventListener('DOMContentLoaded', initMoveDocument);