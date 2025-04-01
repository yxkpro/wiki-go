// Application Initialization Module

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Prevent toolbar flashing on page load
    document.body.classList.add('page-loaded');

    // Initialize editor controls
    if (window.WikiEditor && typeof window.WikiEditor.initializeEditControls === 'function') {
        window.WikiEditor.initializeEditControls();
    }
});
