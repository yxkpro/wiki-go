// Application Initialization Module

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Initialize editor controls
    if (window.WikiEditor && typeof window.WikiEditor.initializeEditControls === 'function') {
        window.WikiEditor.initializeEditControls();
    }
});
