// Kanban Core - Main orchestrator and initialization
class KanbanCore {
  constructor() {
    this.kanbanContainers = null;
    this.docPath = '';
    this.role = '';
    this.dragHandler = null;
    this.taskManager = null;
    this.columnManager = null;
    this.persistenceManager = null;
    this.uiManager = null;
    this.initialized = false;
  }

  /**
   * Initialize the kanban system
   */
  init() {
    if (this.initialized) {
      console.log('Kanban already initialized');
      return;
    }

    console.log('Starting kanban initialization');

    // Get user role and document path
    this.role = document.querySelector('meta[name="user-role"]')?.content || 'viewer';
    this.docPath = (document.querySelector('meta[name="doc-path"]')?.content || '').replace(/^\//, '');

    console.log('Kanban init - Role:', this.role, 'DocPath:', this.docPath);

    // Add role class to body
    document.body.classList.add(`role-${this.role}`);

    // Check if initialization should proceed
    if (!this.shouldInitialize()) {
      return;
    }

    // Find kanban containers
    this.kanbanContainers = document.querySelectorAll('.kanban-container');
    console.log('Kanban containers found:', this.kanbanContainers.length);

    if (this.kanbanContainers.length === 0) {
      console.log('No kanban containers found');
      return;
    }

    // Initialize all components
    this.initializeComponents();

    // Mark as initialized
    this.initialized = true;
    console.log('Kanban initialization complete');
  }

  /**
   * Check if kanban should be initialized
   */
  shouldInitialize() {
    // Only initialize for admin and editor roles
    if (!(this.role === 'admin' || this.role === 'editor')) {
      console.log('Kanban: Not initializing - user role not admin/editor');
      return false;
    }

    // Don't initialize if page is in edit mode
    if (document.body.classList.contains('editing')) {
      console.log('Kanban: Not initializing - page in edit mode');
      return false;
    }

    // Don't initialize if viewing version preview
    if (document.querySelector('.version-content')) {
      console.log('Kanban: Not initializing - viewing version preview');
      return false;
    }

    return true;
  }

  /**
   * Initialize all kanban components
   */
  initializeComponents() {
    console.log('Initializing kanban components');

    // Initialize UI manager first as other components may depend on it
    this.uiManager = new KanbanUIManager(this);
    this.uiManager.init();

    // Initialize drag handler
    this.dragHandler = new KanbanDragHandler(this);
    this.dragHandler.init();

    // Initialize task manager
    this.taskManager = new KanbanTaskManager(this);
    this.taskManager.init();

    // Initialize column manager
    this.columnManager = new KanbanColumnManager(this);
    this.columnManager.init();

    // Initialize persistence manager
    this.persistenceManager = new KanbanPersistenceManager(this);
    this.persistenceManager.init();

    // Setup global event listeners
    this.setupGlobalEventListeners();
  }

  /**
   * Setup global event listeners
   */
  setupGlobalEventListeners() {
    // Global dragend event cleanup
    document.addEventListener('dragend', () => {
      this.cleanupDragVisuals();
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onPageHidden();
      } else {
        this.onPageVisible();
      }
    });
  }

  /**
   * Clean up drag visuals
   */
  cleanupDragVisuals() {
    if (this.uiManager && this.uiManager.cleanupDragVisuals) {
      this.uiManager.cleanupDragVisuals();
    } else {
      // Fallback cleanup
      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      const dropIndicator = document.querySelector('.drop-indicator');
      if (dropIndicator && dropIndicator.parentNode) {
        dropIndicator.parentNode.removeChild(dropIndicator);
      }

      document.querySelectorAll('.task-drop-target').forEach(el => {
        el.classList.remove('task-drop-target');
      });
    }
  }

  /**
   * Handle page becoming hidden
   */
  onPageHidden() {
    console.log('Page hidden - pausing kanban operations');
    // Could pause auto-save or other operations here
  }

  /**
   * Handle page becoming visible
   */
  onPageVisible() {
    console.log('Page visible - resuming kanban operations');
    // Could resume operations or refresh state here
  }

  /**
   * Get the current kanban containers
   */
  getContainers() {
    return this.kanbanContainers;
  }

  /**
   * Get the document path
   */
  getDocPath() {
    return this.docPath;
  }

  /**
   * Get the user role
   */
  getRole() {
    return this.role;
  }

  /**
   * Get a specific component by name
   */
  getComponent(name) {
    switch (name) {
      case 'drag':
      case 'dragHandler':
        return this.dragHandler;
      case 'task':
      case 'taskManager':
        return this.taskManager;
      case 'column':
      case 'columnManager':
        return this.columnManager;
      case 'persistence':
      case 'persistenceManager':
        return this.persistenceManager;
      case 'ui':
      case 'uiManager':
        return this.uiManager;
      default:
        return null;
    }
  }

  /**
   * Get the drag handler
   */
  getDragHandler() {
    return this.dragHandler;
  }

  /**
   * Get the task manager
   */
  getTaskManager() {
    return this.taskManager;
  }

  /**
   * Get the column manager
   */
  getColumnManager() {
    return this.columnManager;
  }

  /**
   * Get the persistence manager
   */
  getPersistenceManager() {
    return this.persistenceManager;
  }

  /**
   * Get the UI manager
   */
  getUIManager() {
    return this.uiManager;
  }

  /**
   * Cleanup and destroy the kanban system
   */
  destroy() {
    if (!this.initialized) {
      return;
    }

    console.log('Destroying kanban system');

    // Destroy all components
    if (this.dragHandler && this.dragHandler.destroy) {
      this.dragHandler.destroy();
    }
    if (this.taskManager && this.taskManager.destroy) {
      this.taskManager.destroy();
    }
    if (this.columnManager && this.columnManager.destroy) {
      this.columnManager.destroy();
    }
    if (this.persistenceManager && this.persistenceManager.destroy) {
      this.persistenceManager.destroy();
    }
    if (this.uiManager && this.uiManager.destroy) {
      this.uiManager.destroy();
    }

    // Remove CSS classes
    document.body.classList.remove('kanban-drag-enabled');
    document.body.classList.remove(`role-${this.role}`);

    // Clear references
    this.dragHandler = null;
    this.taskManager = null;
    this.columnManager = null;
    this.persistenceManager = null;
    this.uiManager = null;
    this.kanbanContainers = null;

    this.initialized = false;
    console.log('Kanban system destroyed');
  }
}

// Global kanban instance
window.kanbanCore = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Create global kanban instance
  window.kanbanCore = new KanbanCore();
  window.kanbanCore.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KanbanCore;
}