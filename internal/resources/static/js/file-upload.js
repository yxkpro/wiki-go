/**
 * File Upload Module
 * Contains functionality for file upload dialog and form handling
 */

// Show file upload dialog
function showFileUploadDialog() {
    const fileUploadDialog = document.querySelector('.file-upload-dialog');
    const fileUploadErrorMessage = fileUploadDialog.querySelector('.error-message');
    const fileUploadForm = document.getElementById('fileUploadForm');

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
    const fileUploadDialog = document.querySelector('.file-upload-dialog');
    fileUploadDialog.classList.remove('active');
}

// Handle file upload form submission
async function handleFileUpload(e) {
    e.preventDefault();

    const fileUploadForm = document.getElementById('fileUploadForm');
    const fileUploadErrorMessage = document.querySelector('.file-upload-dialog .error-message');

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

        // Switch to the files tab and refresh the files list
        const filesTabBtn = Array.from(document.querySelectorAll('.file-upload-tabs .tab-button')).find(btn => btn.getAttribute('data-tab') === 'files-tab');
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
}

// Initialize file upload module
function initFileUpload() {
    const uploadFileButton = document.querySelector('.upload-file');
    const fileUploadDialog = document.querySelector('.file-upload-dialog');

    if (!fileUploadDialog) return;

    const closeFileUploadDialog = fileUploadDialog.querySelector('.close-dialog');
    const fileUploadForm = document.getElementById('fileUploadForm');
    const fileUploadTabButtons = document.querySelectorAll('.file-upload-tabs .tab-button');
    const fileUploadTabPanes = fileUploadDialog.querySelectorAll('.tab-pane');
    const fileInput = document.getElementById('fileToUpload');
    const fileUploadErrorMessage = fileUploadDialog.querySelector('.error-message');

    // Add event listeners for showing/hiding dialog
    if (uploadFileButton) {
        uploadFileButton.addEventListener('click', showFileUploadDialog);
    }

    if (closeFileUploadDialog) {
        closeFileUploadDialog.addEventListener('click', hideFileUploadDialog);
    }

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
                window.FileUtilities.loadDocumentFiles();
            }
        });
    });

    // Handle form submission
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', handleFileUpload);

        // Reset error message when a new file is selected
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                // Clear any existing error messages when a new file is selected
                if (fileUploadErrorMessage) {
                    fileUploadErrorMessage.style.display = 'none';
                }
            });
        }
    }

    // Load files for file attachments if we're on a document page
    const fileAttachmentsSection = document.querySelector('.file-attachments-section');
    if (fileAttachmentsSection && document.querySelector('.markdown-content')) {
        window.FileUtilities.loadDocumentFiles();
    }
}

// Export module
window.FileUpload = {
    init: initFileUpload,
    showFileUploadDialog,
    hideFileUploadDialog
};

// Initialize the module when DOM is loaded
document.addEventListener('DOMContentLoaded', initFileUpload);