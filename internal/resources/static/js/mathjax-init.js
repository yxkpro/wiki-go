// MathJax Configuration
window.MathJax = {
    tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
        processEscapes: true,
        processEnvironments: true
    },
    options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
    }
};

// Reprocess math when content changes (e.g., after editing)
document.addEventListener('DOMContentLoaded', function() {
    // Listen for custom event that indicates content has been updated
    document.addEventListener('content-updated', function(e) {
        if (typeof MathJax !== 'undefined' && e.detail && e.detail.element) {
            try {
                MathJax.typesetPromise([e.detail.element]);
            } catch (error) {
                console.error('MathJax processing error:', error);
            }
        }
    });
});