// kanban-columns.js - Column management
class KanbanColumnManager {
  constructor(core) {
    this.core = core;
    this.docPath = core.docPath;

    // Track renamed columns to avoid duplicates
    this.renamedColumns = new Map();

    // Track board names per board (not globally)
    // Structure: Map<boardId, Map<columnName, count>>
    this.boardColumnCounts = new Map();

    // Dialog elements for adding new boards
    this.addBoardDialog = null;
    this.addBoardForm = null;
    this.boardNameInput = null;

    // Track which kanban container we're adding a board to
    this.targetKanbanContainer = null;
  }

  init() {
    console.log('Initializing KanbanColumnManager');

    // Setup rename column buttons
    this.setupRenameColumnButtons();

    // Setup delete column buttons
    this.setupDeleteColumnButtons();

    // Setup add board functionality
    this.setupAddBoardButton();

    // Initialize dialog elements
    this.initializeDialogElements();

    console.log('KanbanColumnManager initialized');
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
        console.log(`Board name "${newTitle}" already exists, but will be allowed as duplicate`);
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
   * Setup add board button functionality
   */
  setupAddBoardButton() {
    const addBoardButtons = document.querySelectorAll('.add-board-btn');
    if (addBoardButtons.length === 0) {
      console.log('No add board buttons found');
      return;
    }

    console.log('Add board buttons found:', addBoardButtons.length);

    addBoardButtons.forEach((addBoardBtn, index) => {
      // Remove any existing event listeners to prevent duplicates
      const newButton = addBoardBtn.cloneNode(true);
      addBoardBtn.parentNode.replaceChild(newButton, addBoardBtn);

      // Store reference to the kanban container this button belongs to
      const kanbanContainer = newButton.closest('.kanban-container');
      if (kanbanContainer) {
        newButton.setAttribute('data-kanban-container-index', index);
        console.log(`Add board button ${index + 1} associated with kanban container`);
      }

      // Show dialog when add board button is clicked
      newButton.addEventListener('click', (e) => this.handleAddBoardClick(e));
    });
  }

  /**
   * Handle add board button click
   */
  handleAddBoardClick(e) {
    e.preventDefault();

    if (!this.addBoardDialog) {
      console.error('Add board dialog not found');
      return;
    }

    // Store reference to which kanban container this button belongs to
    const clickedButton = e.target.closest('.add-board-btn');
    const kanbanContainer = clickedButton.closest('.kanban-container');

    if (kanbanContainer) {
      // Store the target container for when we create the new board
      this.targetKanbanContainer = kanbanContainer;
      console.log('Target kanban container stored for new board creation');
    } else {
      console.error('Could not find kanban container for add board button');
      return;
    }

    // Reset and show the dialog
    if (this.boardNameInput) {
      this.boardNameInput.value = '';
    }

    this.addBoardDialog.classList.add('active');

    // Focus the input field
    setTimeout(() => {
      if (this.boardNameInput) {
        this.boardNameInput.focus();
      }
    }, 100);
  }

  /**
   * Initialize dialog elements and their event handlers
   */
  initializeDialogElements() {
    // Get the add board dialog elements
    this.addBoardDialog = document.querySelector('.add-board-dialog');
    this.addBoardForm = document.querySelector('.add-board-form');
    this.boardNameInput = document.querySelector('#boardName');

    if (!this.addBoardDialog) {
      console.log('Add board dialog not found in DOM');
      return;
    }

    const closeDialogBtn = this.addBoardDialog.querySelector('.close-dialog');
    const cancelBtn = this.addBoardDialog.querySelector('.cancel-dialog');

    // Handle form submission
    if (this.addBoardForm) {
      this.addBoardForm.addEventListener('submit', (e) => this.handleAddBoardFormSubmit(e));
    }

    // Close dialog when close button is clicked
    if (closeDialogBtn) {
      closeDialogBtn.addEventListener('click', () => this.closeAddBoardDialog());
    }

    // Close dialog when cancel button is clicked
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeAddBoardDialog());
    }

    // Close dialog when Escape key is pressed
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.addBoardDialog.classList.contains('active')) {
        this.closeAddBoardDialog();
      }
    });
  }

  /**
   * Handle add board form submission
   */
  async handleAddBoardFormSubmit(e) {
    e.preventDefault();

    if (!this.boardNameInput) return;

    const boardName = this.boardNameInput.value.trim();
    if (boardName) {
      // Hide dialog
      this.closeAddBoardDialog();

      // Create new board
      await this.addNewBoard(boardName);
    }
  }

  /**
   * Close the add board dialog
   */
  closeAddBoardDialog() {
    if (this.addBoardDialog) {
      this.addBoardDialog.classList.remove('active');
    }
  }

  /**
   * Add a new board to the kanban
   */
  async addNewBoard(boardName) {
    console.log(`Adding new board: ${boardName}`);

    // Check if the board name already exists
    const isDuplicate = this.checkForDuplicateColumnName(boardName, null);

    // Create the new column
    const newColumn = this.createNewColumnElement(boardName, isDuplicate);

    // Add column to the correct kanban board
    let kanbanBoard = null;

    if (this.targetKanbanContainer) {
      // Use the specific kanban container that was clicked
      kanbanBoard = this.targetKanbanContainer.querySelector('.kanban-board');
      console.log('Using target kanban container for new board');
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
      const headerKey = boardName.toLowerCase();
      boardCounts.set(headerKey, (boardCounts.get(headerKey) || 0) + 1);

      // Setup the new column's functionality
      this.setupNewColumnFunctionality(newColumn);

      // Save changes through the core
      const persistenceManager = this.core.getPersistenceManager();
      if (persistenceManager) {
        await persistenceManager.saveKanbanChanges();
      }

      console.log('New board added:', boardName);

      // Clear the target container reference
      this.targetKanbanContainer = null;
    } else {
      console.error('Kanban board container not found');
    }
  }

  /**
   * Create a new column element
   */
  createNewColumnElement(boardName, isDuplicate) {
    // Create the new column
    const newColumn = document.createElement('div');
    newColumn.className = 'kanban-column';

    // Create column header
    const columnHeader = this.createColumnHeader(boardName, isDuplicate);

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
  createColumnHeader(boardName, isDuplicate) {
    const columnHeader = document.createElement('div');
    columnHeader.className = 'kanban-column-header';

    // If this is a duplicate, mark it as such for internal tracking
    if (isDuplicate) {
      columnHeader.setAttribute('data-is-duplicate', 'true');
      console.log(`Board name "${boardName}" already exists, but will be allowed as duplicate`);
    }

    // Create column title
    const columnTitle = document.createElement('span');
    columnTitle.className = 'column-title';
    columnTitle.textContent = boardName;

    // Create status container
    const statusContainer = document.createElement('span');
    statusContainer.className = 'kanban-status-container';

    // Create rename button
    const renameBtn = this.createRenameButton();

    // Create add task button
    const addTaskBtn = this.createAddTaskButton();

    // Create delete button
    const deleteBtn = this.createDeleteButton();

    // Assemble column header
    columnHeader.appendChild(columnTitle);
    columnHeader.appendChild(statusContainer);
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
   * Show status indicators on all kanban columns
   */
  showColumnStatus(statusClass, statusText, removeAfter = 0) {
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach(column => {
      const header = column.querySelector('.kanban-column-header');
      if (!header) return;

      // Find the status container
      const statusContainer = header.querySelector('.kanban-status-container');
      if (!statusContainer) return;

      // Check if a status indicator already exists
      let statusIndicator = statusContainer.querySelector('.kanban-status');
      if (!statusIndicator) {
        statusIndicator = document.createElement('span');
        statusIndicator.className = `kanban-status ${statusClass}`;
        statusIndicator.textContent = statusText;
        statusContainer.appendChild(statusIndicator);
      } else {
        statusIndicator.className = `kanban-status ${statusClass}`;
        statusIndicator.textContent = statusText;
      }

      // Remove the indicator after a delay if specified
      if (removeAfter > 0) {
        setTimeout(() => {
          if (statusIndicator.parentNode) {
            statusIndicator.parentNode.removeChild(statusIndicator);
          }
        }, removeAfter);
      }
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

    // Re-setup add board button
    this.setupAddBoardButton();
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
    this.addBoardDialog = null;
    this.addBoardForm = null;
    this.boardNameInput = null;

    // Clear core reference
    this.core = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KanbanColumnManager;
}