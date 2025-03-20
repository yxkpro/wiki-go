/**
 * Mermaid diagram rendering initialization
 * Handles both main document and version preview rendering
 */

// Create a global namespace for all mermaid functionality
window.MermaidHandler = {
  // Initialize mermaid for the main document
  initMain: function() {
    if (typeof mermaid === 'undefined') {
      console.error('Mermaid library not loaded');
      return;
    }

    try {
      // Get current theme
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

      // Configure mermaid for main document
      mermaid.initialize({
        startOnLoad: true,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'strict',
        maxTextSize: 15000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      });

      console.log('Mermaid initialized for main document');

      // Set up theme change listeners
      this._setupThemeChangeListeners();
    } catch (error) {
      console.error('Failed to initialize Mermaid:', error);
    }
  },

  // Special handling for version preview
  initVersionPreview: function(container) {
    if (!container || typeof mermaid === 'undefined') {
      console.error('Invalid container or Mermaid not loaded');
      return;
    }

    try {
      console.log('Initializing Mermaid for version preview');

      // Use the exact same initialization as the main document
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

      // Initialize with same settings as main document
      mermaid.initialize({
        startOnLoad: false, // Don't start on load - we'll process diagrams manually
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'strict',
        maxTextSize: 15000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      });

      // Find all mermaid diagrams in the container
      const diagrams = container.querySelectorAll('.mermaid');
      if (diagrams.length === 0) {
        console.log('No mermaid diagrams found in preview');
        return;
      }

      // Process each diagram
      diagrams.forEach((diagram, index) => {
        // Create a unique ID for this rendering
        const id = `mermaid-preview-${index}-${Date.now()}`;

        try {
          // Get content and run mermaid renderer
          const source = diagram.textContent || diagram.innerText;
          if (!source || source.trim() === '') {
            console.warn('Empty diagram source found');
            return;
          }

          // Render this specific diagram
          mermaid.render(id, source)
            .then(result => {
              // Insert the rendered SVG
              diagram.innerHTML = result.svg;
              console.log(`Diagram ${index} rendered successfully`);
            })
            .catch(err => {
              console.error(`Failed to render diagram ${index}:`, err);
              diagram.innerHTML = `<div style="color:red;border:1px solid red;padding:10px;">
                Diagram rendering error: ${err.message}
              </div>`;
            });
        } catch (err) {
          console.error(`Error processing diagram ${index}:`, err);
          diagram.innerHTML = `<div style="color:red;border:1px solid red;padding:10px;">
            Error: ${err.message}
          </div>`;
        }
      });
    } catch (error) {
      console.error('Error initializing for version preview:', error);
    }
  },

  // Set up theme change listeners
  _setupThemeChangeListeners: function() {
    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        setTimeout(() => window.location.reload(), 50);
      });
    }

    // Custom theme changed event
    document.addEventListener('theme-changed', () => {
      setTimeout(() => window.location.reload(), 50);
    });
  }
};

// Initialize main document on page load
document.addEventListener('DOMContentLoaded', function() {
  window.MermaidHandler.initMain();
});
