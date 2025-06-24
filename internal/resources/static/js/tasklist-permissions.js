// Task List Permissions
// Shared utility for managing task list permissions and checkbox states
// Used by both tasklist-live.js and kanban-tasks.js
(function () {
  'use strict';

  // Create global TaskListPermissions object
  window.TaskListPermissions = {
    /**
     * Check if the current user has task editing permissions
     */
    hasTaskEditPermissions() {
      const role = document.querySelector('meta[name="user-role"]')?.content || 'viewer';
      return role === 'admin' || role === 'editor';
    },

    /**
     * Check if we're in a context where task editing should be disabled
     */
    isTaskEditingDisabled() {
      // Disable in edit mode
      if (document.body.classList.contains('editing')) return true;

      // Disable in version preview
      if (document.querySelector('.version-content')) return true;

      return false;
    },

    /**
     * Check if task editing is allowed in the current context
     */
    isTaskEditingAllowed() {
      return this.hasTaskEditPermissions() && !this.isTaskEditingDisabled();
    },

    /**
     * Enable all checkboxes in the document (both regular and kanban)
     * This should be called once on page load by the first script that loads
     */
    enableAllCheckboxes() {
      if (!this.isTaskEditingAllowed()) {
        console.log('TaskListPermissions: Task editing not allowed, checkboxes remain disabled');
        return;
      }

      const container = document.querySelector('.markdown-content');
      if (!container) return;

      const allCheckboxes = [...container.querySelectorAll('input[type="checkbox"]')];
      let enabledCount = 0;

      allCheckboxes.forEach(cb => {
        if (cb.disabled) {
          cb.disabled = false;
          enabledCount++;
        }
      });

      console.log(`TaskListPermissions: Enabled ${enabledCount} checkboxes for editing`);
    },

    /**
     * Get the document path from meta tag
     */
    getDocPath() {
      return (document.querySelector('meta[name="doc-path"]')?.content || '').replace(/^\//, '');
    },

    /**
     * Get the user role
     */
    getUserRole() {
      return document.querySelector('meta[name="user-role"]')?.content || 'viewer';
    }
  };

  // Auto-enable checkboxes when the DOM is ready
  // This ensures checkboxes are enabled regardless of which script loads first
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.TaskListPermissions.enableAllCheckboxes();
    });
  } else {
    // DOM is already ready
    window.TaskListPermissions.enableAllCheckboxes();
  }

})();