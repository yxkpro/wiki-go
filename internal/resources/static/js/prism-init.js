/**
 * Prism.js initialization script
 * Ensures that code blocks are properly highlighted when the page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Prism !== 'undefined') {
        // Initialize Prism syntax highlighting
        Prism.highlightAll();

        // Add observer for dynamic content
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // Check if we need to highlight any new code blocks
                    let hasCodeBlocks = false;
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'PRE' || node.querySelector('pre')) {
                                hasCodeBlocks = true;
                            }
                        }
                    });

                    if (hasCodeBlocks) {
                        Prism.highlightAll();
                    }
                }
            });
        });

        // Start observing the document for added nodes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
});