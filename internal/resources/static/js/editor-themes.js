/**
 * Editor Themes Module
 * Handles theme management and mobile responsive behavior
 */

// Theme management functions
function ensureCMThemeLink() {
    return document.getElementById('cm-theme') ||
           Object.assign(document.head.appendChild(document.createElement('link')),
                         { id:'cm-theme', rel:'stylesheet' });
}

function updateCodeMirrorTheme(theme) {
    ensureCMThemeLink().href =
        (theme === 'dark' ? '/static/css/cm-dark.css' : '/static/css/cm-light.css');
}

// Initialize theme on load
function initializeTheme() {
    updateCodeMirrorTheme(document.documentElement.getAttribute('data-theme'));
    
    // Listen for theme changes
    document.documentElement.addEventListener('data-theme-change', e =>
        updateCodeMirrorTheme(e.detail));

    // Listen for theme changes via mutation observer
    const themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                updateCodeMirrorTheme(mutation.target.getAttribute('data-theme'));

                // Refresh editor to apply new theme styles
                const editor = window.EditorCore.getEditor();
                if (editor) {
                    editor.refresh();
                }
            }
        });
    });

    // Start observing theme changes
    themeObserver.observe(document.documentElement, { attributes: true });
}

// Handle mobile sidebar state for editor
function setupMobileSidebarEffect() {
    // Only needed for mobile view
    if (window.innerWidth > 768) return;

    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');

    if (!hamburger || !sidebar) return;

    const handleSidebarToggle = () => {
        const isActive = sidebar.classList.contains('active');
        const editorContainer = document.querySelector('.editor-container');
        const editorLayout = document.querySelector('.editor-layout');
        const editorArea = document.querySelector('.editor-area');
        const previewElement = document.querySelector('.editor-preview');

        if (isActive && editorContainer) {
            // Ensure editor elements get sidebar-blur class when sidebar is open
            const editor = window.EditorCore.getEditor();
            if (editor && document.body.classList.contains('sidebar-active')) {
                // Add sidebar-blur class to editor elements
                editorContainer.classList.add('sidebar-blur');
                if (editorLayout) editorLayout.classList.add('sidebar-blur');
                if (editorArea) editorArea.classList.add('sidebar-blur');
                if (previewElement) previewElement.classList.add('sidebar-blur');
            }
        } else {
            // Remove sidebar-blur class when sidebar is closed
            if (editorContainer) editorContainer.classList.remove('sidebar-blur');
            if (editorLayout) editorLayout.classList.remove('sidebar-blur');
            if (editorArea) editorArea.classList.remove('sidebar-blur');
            if (previewElement) previewElement.classList.remove('sidebar-blur');

            // Ensure editor gets focus back when needed
            const editor = window.EditorCore.getEditor();
            if (editor && document.querySelector('.CodeMirror')) {
                setTimeout(() => {
                    editor.refresh();
                }, 300);
            }
        }
    };

    // Listen for sidebar toggle events
    hamburger.addEventListener('click', handleSidebarToggle);

    // Also observe body class changes to detect sidebar state
    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                if (document.body.classList.contains('sidebar-active')) {
                    // Sidebar is open
                    handleSidebarToggle();
                } else {
                    // Sidebar is closed
                    handleSidebarToggle();
                }
            }
        });
    });

    bodyObserver.observe(document.body, { attributes: true });
}

// Handle responsive editor adjustments
function handleResponsiveChanges() {
    setupMobileSidebarEffect();

    // Adjust active line styling based on viewport width
    const editor = window.EditorCore.getEditor();
    if (editor) {
        const isMobile = window.innerWidth <= 768;
        // Get the current editor options
        const editorOptions = editor.getOption('styleActiveLine');

        // Only change the option if it's different from the current setting
        if ((isMobile && editorOptions !== false) ||
            (!isMobile && JSON.stringify(editorOptions) !== JSON.stringify({nonEmpty: true}))) {

            editor.setOption('styleActiveLine', isMobile ? false : { nonEmpty: true });

            // Force a refresh to apply changes
            setTimeout(() => editor.refresh(), 10);
        }
    }
}

// Initialize mobile effects and responsive handling
function initializeMobileEffects() {
    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', setupMobileSidebarEffect);

    // Also call when window resizes between mobile and desktop views
    window.addEventListener('resize', handleResponsiveChanges);
}

// Add a more aggressive event capture for Ctrl+Shift+P at document level
function setupPreviewShortcut() {
    document.addEventListener('keydown', function(e) {
        // Handle Ctrl+Shift+P for preview toggle (capture it before browser handling)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
            // Prevent default browser action first
            e.preventDefault();
            e.stopPropagation();

            // Only process if we're in edit mode
            const mainContent = document.querySelector('.content');
            if (mainContent && mainContent.classList.contains('editing')) {
                if (window.EditorPreview && typeof window.EditorPreview.togglePreview === 'function') {
                    window.EditorPreview.togglePreview();
                }
            }

            // Return false to ensure the event is completely handled
            return false;
        }
    });
}

// Initialize all theme and mobile functionality
function initialize() {
    initializeTheme();
    initializeMobileEffects();
    setupPreviewShortcut();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);

// Export the module
window.EditorThemes = {
    // Theme functions
    updateCodeMirrorTheme,
    ensureCMThemeLink,
    
    // Mobile functions
    setupMobileSidebarEffect,
    handleResponsiveChanges,
    
    // Initialization
    initialize
};