// Application Initialization Module

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Initialize Wiki configuration
    window.WikiConfig = {
        // Get config values from meta tags
        enableLinkEmbedding: document.querySelector('meta[name="enable-link-embedding"]')?.getAttribute('content') === 'true'
    };

    // Initialize editor controls
    if (window.WikiEditor && typeof window.WikiEditor.initializeEditControls === 'function') {
        window.WikiEditor.initializeEditControls();
    }
});
