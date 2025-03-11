// debug-toggle.js
// Set to false for production, true for development
const DEBUG_MODE = false;

if (!DEBUG_MODE) {
  // Store original console for potential restoration if needed
  window._originalConsole = window.console;

  // Replace console methods with empty functions
  window.console = {
    log: function() {},
    error: function() {},
    warn: function() {},
    info: function() {},
    debug: function() {}
    // Keep trace, table, etc. as they're less commonly used
  };
}