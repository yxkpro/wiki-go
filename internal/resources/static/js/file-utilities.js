/**
 * File Utilities Module
 * Contains functions for handling file operations in Wiki-Go
 */

// Format file size in human-readable form
function formatFileSize(bytes) {
    if (bytes === undefined || bytes === null) {
        return 'Unknown size';
    }

    if (bytes < 1024) {
        return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// Get file icon based on type
function getFileIcon(fileType) {
    let icon = '';

    // Default icon if fileType is undefined
    if (!fileType) {
        return '<i class="fa fa-file-o"></i>';
    }

    if (fileType.startsWith('image/')) {
        icon = '<i class="fa fa-file-image-o"></i>';
    } else if (fileType === 'application/pdf') {
        icon = '<i class="fa fa-file-pdf-o"></i>';
    } else if (fileType === 'application/zip') {
        icon = '<i class="fa fa-file-archive-o"></i>';
    } else if (fileType === 'text/plain') {
        icon = '<i class="fa fa-file-text-o"></i>';
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        icon = '<i class="fa fa-file-word-o"></i>';
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        icon = '<i class="fa fa-file-excel-o"></i>';
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        icon = '<i class="fa fa-file-powerpoint-o"></i>';
    } else if (fileType === 'video/mp4' || fileType === 'video/quicktime' || fileType === 'video/webm' || fileType === 'video/avi') {
        icon = '<i class="fa fa-file-video-o"></i>';
    } else {
        icon = '<i class="fa fa-file-o"></i>';
    }

    return icon;
}

// Render files list HTML
function renderFilesList(files) {
    // Get filesList element first to prevent reference errors
    const filesList = document.querySelector('.files-list');
    if (!filesList) {
        console.error('Files list element not found');
        return;
    }

    console.log("Rendering files list:", files);

    if (!files || files.length === 0) {
        filesList.innerHTML = '<div class="empty-message">' + (window.i18n ? window.i18n.t('attachments.no_files') : 'No files found for this document.') + '</div>';
        return;
    }

    const html = files.map(file => {
        // Debug each file in the console
        console.log("Processing file:", file);

        // Check if file is a string (just filename) or object
        let safeFile;
        if (typeof file === 'string') {
            // If file is just a string (filename), create object with defaults
            const filename = file;
            const fileExt = filename.split('.').pop().toLowerCase();

            // Use the globally defined FILE_EXTENSION_MIME_TYPES from base.html template
            let fileType = FILE_EXTENSION_MIME_TYPES[fileExt] || '';

            safeFile = {
                URL: `/api/files/${getCurrentDocPath()}/${filename}`,
                Type: fileType,
                Name: filename,
                Size: 0
            };
        } else {
            // Ensure all properties exist with defaults for missing ones
            safeFile = {
                URL: file.URL || `/api/files/${getCurrentDocPath()}/${file.Name || file.name || 'unknown'}`,
                Type: file.Type || file.type || '',
                Name: file.Name || file.name || 'Unknown file',
                Size: file.Size || file.size || 0
            };
        }

        console.log("Safe file object:", safeFile);

        // Prepare file path for deletion - extract just the filename
        const filename = safeFile.Name;
        const deletePath = `${getCurrentDocPath()}/${filename}`;

        // Determine if file is an image
        const isImage = safeFile.Type && safeFile.Type.startsWith('image/');

        return `
            <div class="file-item" data-file-url="${safeFile.URL}">
                <div class="file-info">
                    <div class="file-icon">${getFileIcon(safeFile.Type)}</div>
                    <div class="file-name">${safeFile.Name}</div>
                    <div class="file-size">${formatFileSize(safeFile.Size)}</div>
                </div>
                <div class="file-actions">
                    <button class="insert-file-btn" title="${window.i18n ? window.i18n.t('common.insert') : 'Insert into editor'}" data-url="${safeFile.URL}" data-is-image="${isImage}" data-name="${safeFile.Name}" data-i18n-title="common.insert">
                        <i class="fa fa-plus"></i>
                        <span data-i18n="common.insert">${window.i18n ? window.i18n.t('common.insert') : 'Insert'}</span>
                    </button>
                    <button class="delete-file-btn" title="${window.i18n ? window.i18n.t('common.delete') : 'Delete file'}" data-path="${deletePath}" data-i18n-title="common.delete">
                        <i class="fa fa-trash"></i>
                        <span data-i18n="common.delete">${window.i18n ? window.i18n.t('common.delete') : 'Delete'}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    filesList.innerHTML = html;

    // Add event listeners for file actions
    filesList.querySelectorAll('.delete-file-btn').forEach(button => {
        button.addEventListener('click', () => {
            const path = button.getAttribute('data-path');
            deleteFile(path);
        });
    });

    // Add event listeners for insert buttons
    filesList.querySelectorAll('.insert-file-btn').forEach(button => {
        button.addEventListener('click', () => {
            const url = button.getAttribute('data-url');
            const isImage = button.getAttribute('data-is-image') === 'true';
            const name = button.getAttribute('data-name');
            handleFileInsertion(url, isImage, name);
        });
    });

    // Add click event for file items (open file in new tab)
    filesList.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Only open file if clicking on the item itself, not on action buttons
            if (!e.target.closest('.file-actions')) {
                const url = item.getAttribute('data-file-url');
                window.open(url, '_blank');
            }
        });
    });
}

// Load document files from API
async function loadDocumentFiles() {
    // Get filesList element first
    const filesList = document.querySelector('.files-list');
    if (!filesList) {
        console.error('Files list element not found');
        return;
    }

    try {
        const docPath = getCurrentDocPath();
        console.log("Loading files for document path:", docPath);
        const response = await fetch(`/api/files/list/${docPath}`);

        if (!response.ok) {
            throw new Error('Failed to fetch files');
        }

        const data = await response.json();
        console.log("API response for files:", data);

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch files');
        }

        renderFilesList(data.files || []);

        // Also update the file attachments section if it exists
        updateFileAttachments(data.files || []);
    } catch (error) {
        console.error('Error loading files:', error);
        if (filesList) {
            filesList.innerHTML = `<div class="empty-message">Error: ${error.message || 'Failed to load files'}</div>`;
        }
    }
}

// Helper function to update file attachments section
function updateFileAttachments(files) {
    const fileAttachmentsSection = document.querySelector('.file-attachments-section');
    const fileAttachmentsList = document.querySelector('.file-attachments-list');

    if (!fileAttachmentsSection || !fileAttachmentsList) return;

    console.log("Updating file attachments section:", files);

    if (!files || files.length === 0) {
        fileAttachmentsSection.style.display = 'none';
        return;
    }

    // Show the section since we have files
    fileAttachmentsSection.style.display = 'block';

    const html = files.map(file => {
        // Process file similar to the files list
        let safeFile;
        if (typeof file === 'string') {
            // If file is just a string (filename), create object with defaults
            const filename = file;
            const fileExt = filename.split('.').pop().toLowerCase();

            // Use the globally defined FILE_EXTENSION_MIME_TYPES from base.html template
            let fileType = FILE_EXTENSION_MIME_TYPES[fileExt] || '';

            safeFile = {
                URL: `/api/files/${getCurrentDocPath()}/${filename}`,
                Type: fileType,
                Name: filename,
                Size: 0
            };
        } else {
            // Ensure all properties exist with defaults for missing ones
            safeFile = {
                URL: file.URL || `/api/files/${getCurrentDocPath()}/${file.Name || file.name || 'unknown'}`,
                Type: file.Type || file.type || '',
                Name: file.Name || file.name || 'Unknown file',
                Size: file.Size || file.size || 0
            };
        }

        return `
            <a href="${safeFile.URL}" class="attachment-item" target="_blank" title="Open ${safeFile.Name}">
                <div class="attachment-icon">${getFileIcon(safeFile.Type)}</div>
                <div class="attachment-info">
                    <div class="attachment-name">${safeFile.Name}</div>
                    <div class="attachment-size">${formatFileSize(safeFile.Size)}</div>
                </div>
            </a>
        `;
    }).join('');

    fileAttachmentsList.innerHTML = html;
}

// Delete a file
async function deleteFile(path) {
    console.log("Attempting to delete file at path:", path);

    showConfirmDialog(
        window.i18n ? window.i18n.t('delete_file.title') : "Delete File",
        window.i18n ? window.i18n.t('delete_file.confirm_message') : "Are you sure you want to delete this file? This action cannot be undone.",
        async (confirmed) => {
            if (!confirmed) {
                return;
            }

            try {
                // Log the full delete URL for debugging
                const deleteUrl = `/api/files/delete/${path}`;
                console.log("DELETE request to:", deleteUrl);

                const response = await fetch(deleteUrl, {
                    method: 'DELETE'
                });

                console.log("Delete response status:", response.status);

                // Try to parse the response as JSON
                let data;
                try {
                    data = await response.json();
                    console.log("Delete response data:", data);
                } catch (jsonError) {
                    console.error("Error parsing JSON response:", jsonError);
                    // If we can't parse JSON, check if the response is OK
                    if (response.ok) {
                        // The request was successful even if we couldn't parse the JSON
                        loadDocumentFiles();
                        showMessageDialog("File Deleted", "The file was successfully deleted.");
                        return;
                    } else {
                        // Response wasn't OK and we couldn't parse the JSON
                        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
                    }
                }

                if (!data.success) {
                    throw new Error(data.message || 'Failed to delete file');
                }

                // Reload files list after successful deletion
                loadDocumentFiles();
                showMessageDialog("File Deleted", "The file was successfully deleted.");
            } catch (error) {
                console.error('Error deleting file:', error);
                showMessageDialog("Delete Failed", `Error: ${error.message || 'Failed to delete file'}. Please check the console for more details.`);
            }
        }
    );
}

// Handle file insertion into the editor
function handleFileInsertion(url, isImage, name) {
    // Use the WikiEditor module from editor.js
    if (window.WikiEditor && window.WikiEditor.insertIntoEditor) {
        // Extract just the filename from the URL if it's a full path
        // The insertIntoEditor function now expects just the filename
        const filename = name;

        if (!window.WikiEditor.insertIntoEditor(url, isImage, filename)) {
            showMessageDialog("Error", "Cannot insert file - editor is not active. Try opening the editor first.");
            return;
        }
    } else {
        showMessageDialog("Error", "Cannot insert file - editor interface not available.");
        return;
    }

    // Hide file upload dialog
    hideFileUploadDialog();

    // Determine message type
    const isVideo = name.toLowerCase().endsWith('.mp4');
    let messageType = isImage ? "Image" : (isVideo ? "Video" : "Link");

    // Show success message
    showMessageDialog("File Inserted", `${messageType} has been inserted into the editor.`);
}

// Use the global getCurrentDocPath function from utilities.js

// Export functions
window.FileUtilities = {
    formatFileSize,
    getFileIcon,
    renderFilesList,
    loadDocumentFiles,
    deleteFile,
    handleFileInsertion,
    updateFileAttachments
};