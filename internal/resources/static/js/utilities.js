/**
 * Utility functions for the Wiki-Go application
 */

/**
 * Get the current document path from the URL
 * @returns {string} The standardized document path
 */
function getCurrentDocPath() {
    // Log the raw path for debugging
    console.log("Raw pathname for path processing:", window.location.pathname);

    const isHomepage = window.location.pathname === '/';
    if (isHomepage) {
        console.log("Using homepage path");
        return 'pages/home';
    }

    // For versions, we need to keep the full path structure
    let path = window.location.pathname;

    // Remove leading slash
    if (path.startsWith('/')) {
        path = path.substring(1);
    }

    // Remove trailing slash if it exists
    if (path.endsWith('/')) {
        path = path.substring(0, path.length - 1);
    }

    // If .md exists in the path, remove it (some implementations add .md to URLs)
    if (path.endsWith('.md')) {
        path = path.substring(0, path.length - 3);
    }

    console.log("Processed document path:", path);
    return path || 'pages/home';
}

// Make function available globally
window.getCurrentDocPath = getCurrentDocPath;