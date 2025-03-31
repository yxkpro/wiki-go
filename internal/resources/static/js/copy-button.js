// Copy Button Module
// Adds copy buttons to code blocks and handles copying functionality
(function() {
    'use strict';

    // Initialize module when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('pre').forEach(pre => {
            const button = document.createElement('button');
            button.className = 'copy-button';
            button.innerHTML = `
                <i class="fa fa-copy"></i>
                <span>Copy</span>
            `;

            button.addEventListener('click', async () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent;
                const allowInsecure = document.documentElement.getAttribute('data-allow-insecure') === 'true';
                let success = false;

                // First try the modern Clipboard API (requires secure context)
                try {
                    await navigator.clipboard.writeText(code.trim());
                    success = true;
                } catch (err) {
                    console.warn('Clipboard API failed, trying fallback method:', err);

                    // If insecure operations are allowed, try the fallback method
                    if (allowInsecure) {
                        try {
                            // Create a temporary textarea element to copy from
                            const textarea = document.createElement('textarea');
                            textarea.value = code.trim();
                            textarea.setAttribute('readonly', '');
                            textarea.style.position = 'absolute';
                            textarea.style.left = '-9999px';
                            document.body.appendChild(textarea);

                            // Select the text and copy it
                            textarea.select();
                            success = document.execCommand('copy');

                            // Clean up
                            document.body.removeChild(textarea);
                        } catch (fallbackErr) {
                            console.error('Fallback clipboard method failed:', fallbackErr);
                        }
                    }
                }

                // Update button UI based on success
                if (success) {
                    button.classList.add('copied');
                    button.innerHTML = `
                        <i class="fa fa-check"></i>
                        <span>Copied!</span>
                    `;
                    setTimeout(() => {
                        button.classList.remove('copied');
                        button.innerHTML = `
                            <i class="fa fa-copy"></i>
                            <span>Copy</span>
                        `;
                    }, 2000);
                } else {
                    // Provide feedback if copying failed
                    button.classList.add('copy-failed');
                    button.innerHTML = `
                        <i class="fa fa-times"></i>
                        <span>Failed</span>
                    `;
                    setTimeout(() => {
                        button.classList.remove('copy-failed');
                        button.innerHTML = `
                            <i class="fa fa-copy"></i>
                            <span>Copy</span>
                        `;
                    }, 2000);
                }
            });

            pre.appendChild(button);
        });
    });
})();