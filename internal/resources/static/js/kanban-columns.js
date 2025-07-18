// kanban-columns.js - Column management
class KanbanColumnManager {
  constructor(core) {
    this.core = core;
    this.docPath = core.docPath;

    // Track renamed columns to avoid duplicates
    this.renamedColumns = new Map();

    // Track column names per board (not globally)
    // Structure: Map<boardId, Map<columnName, count>>
    this.boardColumnCounts = new Map();

    // Dialog elements for adding new columns
    this.addColumnDialog = null;
    this.addColumnForm = null;
    this.columnNameInput = null;

    // Track which kanban container we're adding a column to
    this.targetKanbanContainer = null;
  }

  /**
   * Initialize column management
   */
  init() {
    console.log('Column manager initializing...');

    // Setup column rename functionality
    this.setupRenameColumnButtons();

    // Setup column delete functionality
    this.setupDeleteColumnButtons();

    // Setup add column functionality
    this.setupAddColumnButton();

    // Initialize dialog elements
    this.initializeDialogElements();

    console.log('Column manager initialized');
  }

  /**
   * Setup rename column buttons for all columns
   */
  setupRenameColumnButtons() {
    const renameButtons = document.querySelectorAll('.rename-column-btn');
    console.log('Rename column buttons found:', renameButtons.length);

    renameButtons.forEach(button => {
      // Remove any existing event listeners to prevent duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener('click', (e) => this.handleRenameColumnClick(e));
    });
  }

  /**
   * Setup delete column buttons for all columns
   */
  setupDeleteColumnButtons() {
    const deleteButtons = document.querySelectorAll('.delete-column-btn');
    console.log('Delete column buttons found:', deleteButtons.length);

    deleteButtons.forEach(button => {
      // Remove any existing event listeners to prevent duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener('click', (e) => this.handleDeleteColumnClick(e));
    });
  }

  /**
   * Handle rename column button click
   */
  handleRenameColumnClick(e) {
    e.preventDefault();

    // Find the column header and title
    const columnHeader = e.target.closest('.kanban-column-header');
    const columnTitle = columnHeader.querySelector('.column-title');

    if (!columnTitle) return;

    this.startColumnRename(columnHeader, columnTitle);
  }

  /**
   * Handle delete column button click
   */
  handleDeleteColumnClick(e) {
    e.preventDefault();

    // Find the column and its title
    const column = e.target.closest('.kanban-column');
    const columnHeader = column.querySelector('.kanban-column-header');
    const columnTitle = columnHeader.querySelector('.column-title');

    if (!column || !columnTitle) return;

    const columnName = columnTitle.textContent.trim();
    this.showDeleteColumnConfirmation(column, columnName);
  }

  /**
   * Show confirmation dialog for column deletion
   */
  showDeleteColumnConfirmation(column, columnName) {
    const taskCount = column.querySelectorAll('.task-list-item-container').length;
    let title = window.i18n ? window.i18n.t('kanban.delete_column_title') : 'Delete Column';
    let message = window.i18n ?
      window.i18n.t('kanban.delete_column_confirm').replace('{0}', columnName) :
      `Are you sure you want to delete the column "${columnName}"?`;

    if (taskCount > 0) {
      message += `\n\nThis column contains ${taskCount} task${taskCount === 1 ? '' : 's'} that will be permanently deleted.`;
    }

    // Use the DialogSystem for consistent UI
    if (window.DialogSystem && window.DialogSystem.showConfirmDialog) {
      window.DialogSystem.showConfirmDialog(title, message, (confirmed) => {
        if (confirmed) {
          this.deleteColumn(column, columnName);
        }
      });
    } else {
      // Fallback to browser confirm if DialogSystem is not available
      if (confirm(`${title}\n\n${message}`)) {
        this.deleteColumn(column, columnName);
      }
    }
  }

  /**
   * Delete the specified column
   */
  deleteColumn(column, columnName) {
    console.log(`Deleting column: ${columnName}`);

    // Remove the column from the DOM
    column.remove();

    // Save changes through the core
    const persistenceManager = this.core.getPersistenceManager();
    if (persistenceManager) {
      persistenceManager.saveKanbanChanges();
    }

    console.log(`Column "${columnName}" deleted successfully`);
  }

  /**
   * Start the column rename process
   */
  startColumnRename(columnHeader, columnTitle) {
    // Store the original title text
    const originalTitle = columnTitle.textContent;

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'column-rename-input';
    input.value = originalTitle;
    input.style.width = '100%';
    input.style.padding = '4px';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = '4px';
    input.style.backgroundColor = 'var(--bg-color)';
    input.style.color = 'var(--text-color)';

    // Hide the title and show input
    columnTitle.style.display = 'none';
    columnHeader.insertBefore(input, columnTitle);

    // Focus the input
    input.focus();
    input.select();

    // Store the original column title as a data attribute to prevent duplication
    columnHeader.setAttribute('data-original-title', originalTitle);

    // Setup input event handlers
    this.setupRenameInputHandlers(input, columnHeader, columnTitle, originalTitle);
  }

  /**
   * Setup event handlers for the rename input field
   */
  setupRenameInputHandlers(input, columnHeader, columnTitle, originalTitle) {
    // Handle input events
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.finishColumnRename(input, columnHeader, columnTitle, originalTitle, true);
      } else if (e.key === 'Escape') {
        // Cancel on escape
        this.finishColumnRename(input, columnHeader, columnTitle, originalTitle, false);
      }
    });

    // Also handle blur event to cancel
    input.addEventListener('blur', () => {
      // Small delay to allow for Enter key processing
      setTimeout(() => {
        if (input.parentNode) {
          this.finishColumnRename(input, columnHeader, columnTitle, originalTitle, false);
        }
      }, 200);
    });
  }

  /**
   * Finish the column rename process
   */
  finishColumnRename(input, columnHeader, columnTitle, originalTitle, shouldSave) {
    const newTitle = input.value.trim();

    if (shouldSave && newTitle && newTitle !== originalTitle) {
      // Check if the new name already exists
      const isDuplicate = this.checkForDuplicateColumnName(newTitle, columnTitle);

      // If this is a duplicate, mark it as such for internal tracking
      if (isDuplicate) {
        columnHeader.setAttribute('data-is-duplicate', 'true');
        console.log(`Column name "${newTitle}" already exists, but will be allowed as duplicate`);
      } else {
        columnHeader.removeAttribute('data-is-duplicate');
      }

      // Update the column title
      columnTitle.textContent = newTitle;

      // Track the rename for markdown generation
      this.renamedColumns.set(originalTitle.toLowerCase(), newTitle);

      // Save changes through the core
      const persistenceManager = this.core.getPersistenceManager();
      if (persistenceManager) {
        persistenceManager.saveKanbanChanges();
      }

      console.log(`Column renamed from "${originalTitle}" to "${newTitle}"`);
    }

    // Restore display
    columnTitle.style.display = '';
    if (input.parentNode) {
      input.remove();
    }
  }

  /**
   * Check if a column name already exists
   */
  checkForDuplicateColumnName(newTitle, excludeColumn) {
    const existingColumns = document.querySelectorAll('.kanban-column-header .column-title');
    let isDuplicate = false;

    existingColumns.forEach(col => {
      if (col !== excludeColumn && col.textContent.trim().toLowerCase() === newTitle.toLowerCase()) {
        isDuplicate = true;
      }
    });

    return isDuplicate;
  }

  /**
   * Setup add column button functionality
   */
  setupAddColumnButton() {
    const addColumnButtons = document.querySelectorAll('.add-column-btn');
    if (addColumnButtons.length === 0) {
      console.log('No add column buttons found');
      return;
    }

    console.log('Add column buttons found:', addColumnButtons.length);

    addColumnButtons.forEach((addColumnBtn, index) => {
      // Remove any existing event listeners to prevent duplicates
      const newButton = addColumnBtn.cloneNode(true);
      addColumnBtn.parentNode.replaceChild(newButton, addColumnBtn);

      // Store reference to the kanban container this button belongs to
      const kanbanContainer = newButton.closest('.kanban-container');
      if (kanbanContainer) {
        newButton.setAttribute('data-kanban-container-index', index);
        console.log(`Add column button ${index + 1} associated with kanban container`);
      }

      // Show dialog when add column button is clicked
      newButton.addEventListener('click', (e) => this.handleAddColumnClick(e));
    });
  }

  /**
   * Handle add column button click
   */
  handleAddColumnClick(e) {
    e.preventDefault();

    if (!this.addColumnDialog) {
      console.error('Add column dialog not found');
      return;
    }

    // Store reference to which kanban container this button belongs to
    const clickedButton = e.target.closest('.add-column-btn');
    const kanbanContainer = clickedButton.closest('.kanban-container');

    if (kanbanContainer) {
      // Store the target container for when we create the new column
      this.targetKanbanContainer = kanbanContainer;
      console.log('Target kanban container stored for new column creation');
    } else {
      console.error('Could not find kanban container for add column button');
      return;
    }

    // Reset and show the dialog
    if (this.columnNameInput) {
      this.columnNameInput.value = '';
    }

    this.addColumnDialog.classList.add('active');

    // Focus the input field
    setTimeout(() => {
      if (this.columnNameInput) {
        this.columnNameInput.focus();
      }
    }, 100);
  }

  /**
   * Initialize dialog elements and their event handlers
   */
  initializeDialogElements() {
    // Get the add column dialog elements
    this.addColumnDialog = document.querySelector('.add-column-dialog');
    this.addColumnForm = document.querySelector('.add-column-form');
    this.columnNameInput = document.querySelector('#columnName');

    if (!this.addColumnDialog) {
      console.log('Add column dialog not found in DOM');
      return;
    }

    const closeDialogBtn = this.addColumnDialog.querySelector('.close-dialog');
    const cancelBtn = this.addColumnDialog.querySelector('.cancel-dialog');

    // Handle form submission
    if (this.addColumnForm) {
      this.addColumnForm.addEventListener('submit', (e) => this.handleAddColumnFormSubmit(e));
    }

    // Close dialog when close button is clicked
    if (closeDialogBtn) {
      closeDialogBtn.addEventListener('click', () => this.closeAddColumnDialog());
    }

    // Close dialog when cancel button is clicked
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeAddColumnDialog());
    }

    // Close dialog when Escape key is pressed
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.addColumnDialog.classList.contains('active')) {
        this.closeAddColumnDialog();
      }
    });
  }

  /**
   * Handle add column form submission
   */
  async handleAddColumnFormSubmit(e) {
    e.preventDefault();

    if (!this.columnNameInput) return;

    const columnName = this.columnNameInput.value.trim();
    if (columnName) {
      // Hide dialog
      this.closeAddColumnDialog();

      // Create new column
      await this.addNewColumn(columnName);
    }
  }

  /**
   * Close the add column dialog
   */
  closeAddColumnDialog() {
    if (this.addColumnDialog) {
      this.addColumnDialog.classList.remove('active');
    }
  }

  /**
   * Add a new column to the kanban
   */
  async addNewColumn(columnName) {
    console.log(`Adding new column: ${columnName}`);

    // Check if the column name already exists
    const isDuplicate = this.checkForDuplicateColumnName(columnName, null);

    // Create the new column
    const newColumn = this.createNewColumnElement(columnName, isDuplicate);

    // Add column to the correct kanban board
    let kanbanBoard = null;

    if (this.targetKanbanContainer) {
      // Use the specific kanban container that was clicked
      kanbanBoard = this.targetKanbanContainer.querySelector('.kanban-board');
      console.log('Using target kanban container for new column');
    } else {
      // Fallback to first kanban board (for backwards compatibility)
      kanbanBoard = document.querySelector('.kanban-board');
      console.log('Using fallback kanban board selection');
    }

    if (kanbanBoard) {
      kanbanBoard.appendChild(newColumn);

      // Update board name counts for tracking
      const container = kanbanBoard.closest('.kanban-container');
      const boardId = this.getBoardId(container);
      const boardCounts = this.getBoardColumnCounts(boardId);
      const headerKey = columnName.toLowerCase();
      boardCounts.set(headerKey, (boardCounts.get(headerKey) || 0) + 1);

      // Setup the new column's functionality
      this.setupNewColumnFunctionality(newColumn);

      // Save changes through the core
      const persistenceManager = this.core.getPersistenceManager();
      if (persistenceManager) {
        await persistenceManager.saveKanbanChanges();
      }

      console.log('New column added:', columnName);

      // Clear the target container reference
      this.targetKanbanContainer = null;
    } else {
      console.error('Kanban board container not found');
    }
  }

  /**
   * Create a new column element
   */
  createNewColumnElement(columnName, isDuplicate) {
    // Create the new column
    const newColumn = document.createElement('div');
    newColumn.className = 'kanban-column';

    // Create column header
    const columnHeader = this.createColumnHeader(columnName, isDuplicate);

    // Create column content
    const columnContent = this.createColumnContent();

    // Add header and content to column
    newColumn.appendChild(columnHeader);
    newColumn.appendChild(columnContent);

    return newColumn;
  }

  /**
   * Create column header with all necessary elements
   */
  createColumnHeader(columnName, isDuplicate) {
    const columnHeader = document.createElement('div');
    columnHeader.className = 'kanban-column-header';

    // If this is a duplicate, mark it as such for internal tracking
    if (isDuplicate) {
      columnHeader.setAttribute('data-is-duplicate', 'true');
      console.log(`Column name "${columnName}" already exists, but will be allowed as duplicate`);
    }

    // Create column title
    const columnTitle = document.createElement('span');
    columnTitle.className = 'column-title';
    columnTitle.textContent = columnName;

    // Create status indicator
    const statusIndicator = document.createElement('span');
    statusIndicator.className = 'kanban-status';

    // Create rename button
    const renameBtn = this.createRenameButton();

    // Create add task button
    const addTaskBtn = this.createAddTaskButton();

    // Create delete button
    const deleteBtn = this.createDeleteButton();

    // Assemble column header
    columnHeader.appendChild(columnTitle);
    columnHeader.appendChild(statusIndicator);
    columnHeader.appendChild(renameBtn);
    columnHeader.appendChild(addTaskBtn);
    columnHeader.appendChild(deleteBtn);

    return columnHeader;
  }

  /**
   * Create rename button for a column
   */
  createRenameButton() {
    const renameBtn = document.createElement('button');
    renameBtn.className = 'rename-column-btn editor-admin-only';
    renameBtn.title = window.i18n ? window.i18n.t('kanban.rename_column') : 'Rename column';
    renameBtn.innerHTML = '<i class="fa fa-pencil"></i>';

    renameBtn.addEventListener('click', (e) => this.handleRenameColumnClick(e));

    return renameBtn;
  }

  /**
   * Create add task button for a column
   */
  createAddTaskButton() {
    const addTaskBtn = document.createElement('button');
    addTaskBtn.className = 'add-task-btn';
    addTaskBtn.title = window.i18n ? window.i18n.t('kanban.add_task') : 'Add task';
    addTaskBtn.innerHTML = '<i class="fa fa-plus"></i>';

    addTaskBtn.addEventListener('click', (e) => this.handleAddTaskClick(e));

    return addTaskBtn;
  }

  /**
   * Create delete button for a column
   */
  createDeleteButton() {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-column-btn editor-admin-only';
    deleteBtn.title = window.i18n ? window.i18n.t('kanban.delete_column') : 'Delete column';
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';

    deleteBtn.addEventListener('click', (e) => this.handleDeleteColumnClick(e));

    return deleteBtn;
  }

  /**
   * Handle add task button click
   */
  handleAddTaskClick(e) {
    e.preventDefault();

    const column = e.target.closest('.kanban-column');
    if (column && this.core.taskManager) {
      this.core.taskManager.showNewTaskInput(
        column.querySelector('.kanban-column-content'),
        column.querySelector('.task-list')
      );
    }
  }

  /**
   * Create column content with task list
   */
  createColumnContent() {
    const columnContent = document.createElement('div');
    columnContent.className = 'kanban-column-content';

    // Create task list
    const taskList = document.createElement('ul');
    taskList.className = 'task-list';

    // Add task list to column content
    columnContent.appendChild(taskList);

    return columnContent;
  }

  /**
   * Setup functionality for a newly created column
   */
  setupNewColumnFunctionality(newColumn) {
    // Setup drop targets for the new column
    if (this.core.dragHandler) {
      this.core.dragHandler.setupColumnDropTarget(newColumn);
    }

    // Setup any additional column-specific functionality
    // This can be extended as needed
  }

  /**
   * Show error status on all kanban columns
   */
  showColumnStatus(cssClass, text, duration = 3000) {
    // Only show error states
    if (cssClass !== 'error') return;
    
    document.querySelectorAll('.kanban-status').forEach(statusElement => {
      statusElement.textContent = text;
      statusElement.classList.remove('saving', 'saved', 'error');
      statusElement.classList.add(cssClass);

      // Auto-hide after duration - CSS handles the 0.3s fade transition
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.classList.remove('saving', 'saved', 'error');
      }, duration);
    });
  }

  /**
   * Get all column headers and their information
   */
  getAllColumns() {
    const columns = [];
    const columnElements = document.querySelectorAll('.kanban-column');

    columnElements.forEach((column, index) => {
      const header = column.querySelector('.kanban-column-header');
      const titleElement = header?.querySelector('.column-title');

      if (titleElement) {
        const title = titleElement.textContent.trim();
        const originalTitle = header.getAttribute('data-original-title');
        const isDuplicate = header.hasAttribute('data-is-duplicate');

        columns.push({
          index,
          element: column,
          header,
          titleElement,
          title,
          originalTitle,
          isDuplicate,
          tasks: column.querySelectorAll('.task-list-item-container')
        });
      }
    });

    return columns;
  }

  /**
   * Get renamed columns mapping
   */
  getRenamedColumns() {
    return new Map(this.renamedColumns);
  }

  /**
   * Clear renamed columns tracking
   */
  clearRenamedColumns() {
    this.renamedColumns.clear();
  }

  /**
   * Get board name counts for duplicate handling
   */
  getBoardColumnCounts(boardId) {
    if (!this.boardColumnCounts.has(boardId)) {
      this.boardColumnCounts.set(boardId, new Map());
    }
    return this.boardColumnCounts.get(boardId);
  }

  /**
   * Update column count for a specific board
   */
  updateColumnCount(boardId, columnName) {
    const boardCounts = this.getBoardColumnCounts(boardId);
    const currentCount = boardCounts.get(columnName.toLowerCase()) || 0;
    boardCounts.set(columnName.toLowerCase(), currentCount + 1);
    return currentCount + 1;
  }

  /**
   * Get all board column counts (for persistence manager)
   */
  getAllBoardColumnCounts() {
    return new Map(this.boardColumnCounts);
  }

  /**
   * Get or create board ID for a kanban container
   */
  getBoardId(container) {
    let boardId = container.getAttribute('data-board-id');
    if (!boardId) {
      const boardTitle = container.querySelector('.kanban-board-title');
      const title = boardTitle ? boardTitle.textContent.trim() : '';
      boardId = title || `board-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      container.setAttribute('data-board-id', boardId);
    }
    return boardId;
  }

  /**
   * Refresh all column functionality after DOM changes
   */
  refresh() {
    console.log('Refreshing column functionality');

    // Re-setup rename buttons for any new columns
    this.setupRenameColumnButtons();

    // Re-setup delete buttons for any new columns
    this.setupDeleteColumnButtons();

    // Re-setup add column button
    this.setupAddColumnButton();
  }

  /**
   * Cleanup and destroy the column manager
   */
  destroy() {
    console.log('Destroying KanbanColumnManager');

    // Clear tracking maps
    this.renamedColumns.clear();
    this.boardColumnCounts.clear();

    // Remove dialog references
    this.addColumnDialog = null;
    this.addColumnForm = null;
    this.columnNameInput = null;

    // Clear core reference
    this.core = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KanbanColumnManager;
}