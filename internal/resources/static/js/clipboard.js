/**
 * Clipboard handling module for Wiki-Go
 * Enables pasting images from clipboard directly into the editor
 */

// Main initialization function for clipboard handling
function initClipboardHandling() {
    console.log('Initializing clipboard handler at document level');

    // Instead of attaching to CodeMirror directly, attach to document and filter
    document.addEventListener('paste', documentPasteHandler);
}

/**
 * Document-level paste event handler
 * @param {ClipboardEvent} event - The paste event
 */
async function documentPasteHandler(event) {
    // Check if editor is active
    if (!window.WikiEditor || !window.WikiEditor.isEditorActive()) {
        return;
    }

    // Check if the paste event is inside the editor
    const target = event.target;
    const isInEditor = target.classList.contains('CodeMirror') ||
                      target.closest('.CodeMirror') !== null;

    if (!isInEditor) {
        return; // Not pasting in the editor, allow default behavior
    }

    console.log('Paste event detected in editor');

    // Handle paste event
    await handlePaste(event);
}

/**
 * Handle paste events in the editor
 * @param {ClipboardEvent} event - The paste event
 */
async function handlePaste(event) {
    // Check if there are any clipboard items
    if (!event.clipboardData || !event.clipboardData.items) {
        return;
    }

    // Look for images in clipboard data
    const items = event.clipboardData.items;
    let imageFile = null;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            // Found an image, get the file
            imageFile = items[i].getAsFile();
            console.log('Found image in clipboard:', items[i].type);
            break;
        }
    }

    // If no image was found, allow default paste behavior
    if (!imageFile) {
        console.log('No image found in clipboard, allowing default paste behavior');
        return;
    }

    // Prevent default paste behavior for images
    event.preventDefault();
    console.log('Handling image paste, prevented default behavior');

    try {
        // Get the current document path
        const docPath = getCurrentDocPath();
        console.log('Current document path:', docPath);

        // Generate a timestamp-based filename with the correct extension
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = imageFile.type.split('/')[1] || 'png';
        const filename = `image-${timestamp}.${extension}`;
        console.log('Generated filename:', filename);

        // Create FormData to upload the image
        const formData = new FormData();
        formData.append('file', imageFile, filename);
        formData.append('docPath', docPath);

        // Get the editor instance - make sure we find the most current one
        const cmElement = document.querySelector('.CodeMirror');
        if (!cmElement) {
            throw new Error('CodeMirror editor not found');
        }
        const editor = cmElement.CodeMirror;
        if (!editor) {
            throw new Error('CodeMirror instance not available');
        }

        // Show a temporary loading message at cursor
        const loadingPlaceholder = `![Uploading ${filename}...]()`;
        const cursor = editor.getCursor();
        editor.replaceRange(loadingPlaceholder, cursor);
        console.log('Added loading placeholder at cursor');

        // Upload the image
        console.log('Uploading image to server...');
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        // Process the response
        const data = await response.json();
        console.log('Upload response:', data);

        // Find the position of the loading placeholder
        const text = editor.getValue();
        const placeholderPos = text.indexOf(loadingPlaceholder);

        if (data.success) {
            // Success - replace the placeholder with the actual image markdown
            const imageMarkdown = `![](${filename})`;

            if (placeholderPos >= 0) {
                const placeholderStart = editor.posFromIndex(placeholderPos);
                const placeholderEnd = editor.posFromIndex(placeholderPos + loadingPlaceholder.length);
                editor.replaceRange(imageMarkdown, placeholderStart, placeholderEnd);
            } else {
                // If placeholder can't be found for some reason, insert at current cursor
                editor.replaceSelection(imageMarkdown);
            }

            console.log('Image uploaded successfully:', filename);
        } else {
            // Error - replace the placeholder with an error message
            const errorMessage = `<!-- Failed to upload image: ${data.message || 'Unknown error'} -->`;

            if (placeholderPos >= 0) {
                const placeholderStart = editor.posFromIndex(placeholderPos);
                const placeholderEnd = editor.posFromIndex(placeholderPos + loadingPlaceholder.length);
                editor.replaceRange(errorMessage, placeholderStart, placeholderEnd);
            } else {
                // If placeholder can't be found, insert at current cursor
                editor.replaceSelection(errorMessage);
            }

            console.error('Failed to upload image:', data.message);
        }
    } catch (error) {
        console.error('Error handling clipboard paste:', error);
        // Try to get the editor instance again for error handling
        try {
            const cmElement = document.querySelector('.CodeMirror');
            if (cmElement && cmElement.CodeMirror) {
                cmElement.CodeMirror.replaceSelection(`<!-- Error uploading pasted image: ${error.message} -->`);
            }
        } catch (e) {
            console.error('Could not insert error message into editor:', e);
        }
    }
}

// Initialize clipboard handling just once when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Setup clipboard handling at the document level
    initClipboardHandling();
});

// Expose functions globally if needed
window.ClipboardHandler = {
    init: initClipboardHandling,
    handlePaste: handlePaste
};