// Kanban Drag & Drop Logic
class KanbanDragHandler {
  constructor(core) {
    this.core = core;
    this.draggedItem = null;
    this.originalContainer = null;
    this.originalNextSibling = null;
    this.originalIndentLevel = 0;
    this.initialized = false;
  }

  /**
   * Initialize drag and drop functionality
   */
  init() {
    if (this.initialized) {
      console.log('Drag handler already initialized');
      return;
    }

    console.log('Initializing drag handler');

    // Setup drag events for all existing task items
    this.setupTaskDragEvents();

    // Setup drop targets for all columns
    this.setupColumnDropTargets();

    this.initialized = true;
    console.log('Drag handler initialized');
  }

  /**
   * Setup drag events for all task items
   */
  setupTaskDragEvents() {
    const taskItems = document.querySelectorAll('.kanban-column-content .task-list-item-container');
    console.log(`Setting up drag events for ${taskItems.length} task items`);

    taskItems.forEach(item => {
      this.setupDragEventsForItem(item);
    });
  }

  /**
   * Setup drag events for a specific task item
   */
  setupDragEventsForItem(item) {
    // Make item draggable
    item.setAttribute('draggable', 'true');

    // Drag start event
    item.addEventListener('dragstart', (e) => {
      console.log('Drag started', e);
      this.onDragStart(e, item);
    });

    // Drag end event
    item.addEventListener('dragend', (e) => {
      console.log('Drag ended', e);
      this.onDragEnd(e, item);
    });
  }

  /**
   * Handle drag start
   */
  onDragStart(e, item) {
    // Store original state
    this.draggedItem = item;
    this.originalContainer = item.parentNode;
    this.originalNextSibling = item.nextElementSibling;
    this.originalIndentLevel = parseInt(item.getAttribute('data-indent-level') || '0');

    // Add visual feedback
    item.classList.add('dragging');

    // Set up drag transfer data
    e.dataTransfer.effectAllowed = 'move';
    const taskText = item.querySelector('.task-text');
    e.dataTransfer.setData('text/plain', taskText ? taskText.innerHTML : item.textContent.trim());

    // Create drag image
    this.createDragImage(e, item);
  }

  /**
   * Handle drag end
   */
  onDragEnd(e, item) {
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');

      // Check if the item was moved
      const wasMoved = this.draggedItem.parentNode !== this.originalContainer ||
                       this.draggedItem.nextElementSibling !== this.originalNextSibling;

      if (wasMoved) {
        console.log('Item was moved, saving changes');
        console.log('Original container:', this.originalContainer);
        console.log('New container:', this.draggedItem.parentNode);
        console.log('Original next sibling:', this.originalNextSibling);
        console.log('New next sibling:', this.draggedItem.nextElementSibling);

        // Save changes through the persistence manager
        const persistenceManager = this.core.getComponent('persistence');
        if (persistenceManager && persistenceManager.saveKanbanChanges) {
          console.log('Saving kanban changes after drag and drop');
          persistenceManager.saveKanbanChanges().catch(err => {
            console.error('Error saving kanban changes after drag and drop:', err);
          });
        } else {
          console.warn('Persistence manager not available or saveKanbanChanges method missing');
        }
      } else {
        console.log('Item was not moved, no changes to save');
      }

      // Reset drag state
      this.resetDragState();
    }
  }

  /**
   * Create a drag image for the dragged item
   */
  createDragImage(e, item) {
    const dragImage = item.cloneNode(true);
    // Copy computed size from original item
    const style = window.getComputedStyle(item);
    dragImage.style.width = style.width;
    dragImage.style.height = style.height;
    dragImage.style.maxWidth = style.maxWidth;
    dragImage.style.maxHeight = style.maxHeight;
    dragImage.style.boxSizing = style.boxSizing;
    dragImage.style.overflow = 'hidden';
    dragImage.style.opacity = '0.7';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    // Constrain images inside the clone
    dragImage.querySelectorAll('img').forEach(img => {
      img.style.maxWidth = '100%';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.display = 'block';
    });
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 10, 10);
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  }

  /**
   * Setup drop targets for all columns
   */
  setupColumnDropTargets() {
    const columnContents = document.querySelectorAll('.kanban-column-content ul');
    console.log('Setting up drop targets for', columnContents.length, 'columns');

    columnContents.forEach(column => {
      this.setupColumnDropEvents(column);

      // Also setup empty column drop target
      const columnContentDiv = column.parentNode;
      if (columnContentDiv && columnContentDiv.classList.contains('kanban-column-content')) {
        this.setupEmptyColumnDropTarget(columnContentDiv, column);
      }
    });
  }

  /**
   * Setup drop target for a single new column
   */
  setupColumnDropTarget(newColumn) {
    console.log('Setting up drop target for new column');

    // Find the task list (ul) within the new column
    const columnUl = newColumn.querySelector('.kanban-column-content ul');
    if (!columnUl) {
      console.error('Could not find task list in new column');
      return;
    }

    // Setup drop events for the column
    this.setupColumnDropEvents(columnUl);

    // Setup empty column drop target
    const columnContentDiv = columnUl.parentNode;
    if (columnContentDiv && columnContentDiv.classList.contains('kanban-column-content')) {
      this.setupEmptyColumnDropTarget(columnContentDiv, columnUl);
    }

    console.log('Drop target setup complete for new column');
  }

  /**
   * Setup drop events for a column
   */
  setupColumnDropEvents(column) {
    // Dragover - needed to allow dropping
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Remove existing highlights
      this.removeDropHighlights();

      // Find the closest task and position the drop indicator
      this.positionDropIndicator(column, e.clientY);
    });

    // Dragenter - add visual feedback
    column.addEventListener('dragenter', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    // Dragleave - remove visual feedback
    column.addEventListener('dragleave', (e) => {
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over');
      }
    });

    // Drop - handle the actual drop
    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');

      if (!this.draggedItem) return;

      // Handle dropping on a task or between tasks
      this.handleDrop(column);

      // Clean up
      this.removeDropIndicator();
    });
  }

  /**
   * Setup drop handling for empty column areas
   */
  setupEmptyColumnDropTarget(contentDiv, columnUl) {
    // Dragover
    contentDiv.addEventListener('dragover', (e) => {
      // Only process if directly over the content div, not its children
      if (e.target === contentDiv || e.target === columnUl) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Remove existing highlights
        this.removeDropHighlights();

        // Add visual feedback
        contentDiv.classList.add('drag-over');

        // If column is empty or we're below all tasks, add indicator at the end
        const dropIndicator = this.getOrCreateDropIndicator();
        dropIndicator.classList.add('empty-column-indicator');
        columnUl.appendChild(dropIndicator);
      }
    });

    // Dragenter
    contentDiv.addEventListener('dragenter', (e) => {
      if (e.target === contentDiv || e.target === columnUl) {
        e.preventDefault();
        columnUl.classList.add('drag-over');
        contentDiv.classList.add('drag-over');
      }
    });

    // Dragleave
    contentDiv.addEventListener('dragleave', (e) => {
      if (!contentDiv.contains(e.relatedTarget)) {
        columnUl.classList.remove('drag-over');
        contentDiv.classList.remove('drag-over');
      }
    });

    // Drop
    contentDiv.addEventListener('drop', (e) => {
      if (e.target === contentDiv || e.target === columnUl) {
        e.preventDefault();
        columnUl.classList.remove('drag-over');
        contentDiv.classList.remove('drag-over');

        if (!this.draggedItem) return;

        // Move item to the end of the column with its descendants
        this.moveItemWithDescendants(this.draggedItem, columnUl, null, 0);

        // Clean up
        this.removeDropIndicator();
      }
    });
  }

  /**
   * Position the drop indicator based on mouse position
   */
  positionDropIndicator(column, y) {
    const tasks = [...column.querySelectorAll('.task-list-item-container')];
    if (tasks.length === 0) {
      // Empty column, append indicator at the end
      const dropIndicator = this.getOrCreateDropIndicator();
      column.appendChild(dropIndicator);
      return;
    }

    // Find the closest task
    const closestTask = this.findClosestTask(tasks, y);
    if (!closestTask) return;

    const rect = closestTask.getBoundingClientRect();
    const taskCenterY = rect.top + rect.height / 2;
    const taskTopThird = rect.top + rect.height / 3;
    const taskBottomThird = rect.top + (rect.height * 2) / 3;

    const dropIndicator = this.getOrCreateDropIndicator();

    // Create a more stable drop experience by dividing the task into three zones:
    // Top third: Drop above the task
    // Middle third: Make it a child of the task
    // Bottom third: Drop below the task

    if (y >= taskTopThird && y <= taskBottomThird && closestTask !== this.draggedItem) {
      // We're hovering over the middle third of a task - highlight it to indicate it will become a child
      closestTask.classList.add('task-drop-target');

      // Hide the line indicator
      if (dropIndicator.parentNode) {
        dropIndicator.parentNode.removeChild(dropIndicator);
      }
    } else {
      // We're hovering in the top or bottom third - show line indicator
      const dropBefore = y < taskCenterY;

      if (dropBefore) {
        column.insertBefore(dropIndicator, closestTask);
      } else {
        column.insertBefore(dropIndicator, closestTask.nextElementSibling);
      }

      // Add a class to the indicator to show whether it's above or below
      dropIndicator.classList.remove('drop-above', 'drop-below');
      dropIndicator.classList.add(dropBefore ? 'drop-above' : 'drop-below');
    }
  }

  /**
   * Handle the drop operation
   */
  handleDrop(column) {
    // Check if we have a highlighted task (direct drop target)
    const dropTarget = document.querySelector('.task-drop-target');

    if (dropTarget) {
      console.log('Dropping onto task:', dropTarget);
      // We're dropping directly onto a task - make it a child
      const parentIndentLevel = parseInt(dropTarget.getAttribute('data-indent-level') || '0');
      const childIndentLevel = parentIndentLevel + 1;

      // Get the parent task ID for debugging
      const parentTaskId = dropTarget.getAttribute('data-task-id');
      console.log(`Parent task ID: ${parentTaskId}, indent level: ${parentIndentLevel}`);
      console.log(`Child will have indent level: ${childIndentLevel}`);

      // Insert after the drop target
      const insertPosition = dropTarget.nextElementSibling;

      // Move the dragged item and its descendants
      this.moveItemWithDescendants(this.draggedItem, column, insertPosition, childIndentLevel);

      // Remove the highlight
      dropTarget.classList.remove('task-drop-target');
    } else {
      // We're dropping on a line indicator
      const dropIndicator = document.querySelector('.drop-indicator');
      if (dropIndicator) {
        console.log('Dropping at indicator position');
        // Get the position where we're dropping
        const dropPosition = dropIndicator.nextElementSibling;

        // Move the dragged item and its descendants
        this.moveItemWithDescendants(this.draggedItem, column, dropPosition, 0);
      }
    }

    // Save changes through the persistence manager
    const persistenceManager = this.core.getComponent('persistence');
    if (persistenceManager && persistenceManager.saveKanbanChanges) {
      console.log('Saving kanban changes after drag and drop');
      persistenceManager.saveKanbanChanges().catch(err => {
        console.error('Error saving kanban changes after drag and drop:', err);
      });
    } else {
      console.warn('Persistence manager not available or saveKanbanChanges method missing');
    }
  }

  /**
   * Move an item and all its descendants to a new position
   */
  moveItemWithDescendants(item, targetColumn, insertBefore, newIndentLevel) {
    console.log(`Moving item with descendants. New indent level: ${newIndentLevel}`);

    // Store the original position for comparison
    const originalParent = item.parentNode;
    const originalNextSibling = item.nextElementSibling;
    const originalIndentLevel = parseInt(item.getAttribute('data-indent-level') || '0');
    const taskId = item.getAttribute('data-task-id');
    const taskText = item.querySelector('.task-text')?.textContent || '';

    // Find all descendants before modifying the DOM
    const descendants = this.findAllDescendants(item);
    console.log(`Found ${descendants.length} descendants to move with the item`);

    // Calculate the level difference for descendants
    const levelDifference = newIndentLevel - originalIndentLevel;

    // Update the dragged item's indent level
    this.updateIndentLevel(item, newIndentLevel);

    // Mark the item as moved
    item.setAttribute('data-was-moved', 'true');
    item.setAttribute('data-move-time', Date.now().toString());

    // Log the task ID for debugging
    if (taskId) {
      console.log(`Moving task "${taskText}" with ID: ${taskId} from level ${originalIndentLevel} to ${newIndentLevel}`);
    } else {
      console.warn('Moving task without an ID');
      // Generate a new ID if needed
      const taskManager = this.core.getComponent('tasks');
      if (taskManager && taskManager.generateTaskId) {
        const newId = taskManager.generateTaskId();
        item.setAttribute('data-task-id', newId);
        console.log(`Generated new ID ${newId} for moved task "${taskText}"`);
      }
    }

    // Insert the dragged item at the target position
    if (insertBefore) {
      targetColumn.insertBefore(item, insertBefore);
    } else {
      targetColumn.appendChild(item);
    }

    // Keep track of the last inserted element
    let lastInserted = item;

    // Move all descendants after the dragged item
    descendants.forEach((descendant, index) => {
      // Calculate new indent level for this descendant
      const descendantOriginalLevel = parseInt(descendant.getAttribute('data-indent-level') || '0');
      const newDescendantLevel = Math.max(1, descendantOriginalLevel + levelDifference);
      const descendantTaskId = descendant.getAttribute('data-task-id');
      const descendantText = descendant.querySelector('.task-text')?.textContent || '';

      console.log(`Moving descendant ${index + 1}/${descendants.length} "${descendantText}" from level ${descendantOriginalLevel} to ${newDescendantLevel}`);

      // Update the indent level
      this.updateIndentLevel(descendant, newDescendantLevel);

      // Mark the descendant as moved
      descendant.setAttribute('data-was-moved', 'true');
      descendant.setAttribute('data-move-time', Date.now().toString());

      // Log the descendant task ID for debugging
      if (descendantTaskId) {
        console.log(`Moving descendant with ID: ${descendantTaskId}`);
      } else {
        console.warn('Moving descendant without an ID');
        // Generate a new ID if needed
        const taskManager = this.core.getComponent('tasks');
        if (taskManager && taskManager.generateTaskId) {
          const newId = taskManager.generateTaskId();
          descendant.setAttribute('data-task-id', newId);
          console.log(`Generated new ID ${newId} for moved descendant "${descendantText}"`);
        }
      }

      // Insert after the last inserted element
      if (lastInserted.nextElementSibling) {
        targetColumn.insertBefore(descendant, lastInserted.nextElementSibling);
      } else {
        targetColumn.appendChild(descendant);
      }
      lastInserted = descendant;
    });

    // Log the change for debugging
    console.log('Move completed:', {
      originalParent,
      newParent: item.parentNode,
      originalNextSibling,
      newNextSibling: item.nextElementSibling,
      originalIndentLevel,
      newIndentLevel,
      descendantsMoved: descendants.length,
      taskId
    });

    // Ensure all checkboxes are properly set up after moving
    const taskManager = this.core.getComponent('tasks');
    if (taskManager && taskManager.setupCheckboxForTask) {
      taskManager.setupCheckboxForTask(item);
      descendants.forEach(descendant => {
        taskManager.setupCheckboxForTask(descendant);
      });
    }
  }

  /**
   * Update the indent level of an item
   */
  updateIndentLevel(item, newLevel) {
    // Set the indent level attribute
    item.setAttribute('data-indent-level', newLevel.toString());

    // Clear any existing inline styles
    item.style.removeProperty('margin-left');

    // Update indentation class
    item.classList.remove('indent-0', 'indent-1', 'indent-2', 'indent-3', 'indent-4', 'indent-5');
    item.classList.add(`indent-${newLevel}`);
  }

  /**
   * Find all descendants of a task
   */
  findAllDescendants(task) {
    const descendants = [];
    const taskIndentLevel = parseInt(task.getAttribute('data-indent-level') || '0');

    let nextElement = task.nextElementSibling;
    let count = 0;
    const maxCount = 100; // Safety limit to prevent infinite loops

    while (nextElement && count < maxCount) {
      count++;
      const nextIndentLevel = parseInt(nextElement.getAttribute('data-indent-level') || '0');

      // If the next element has a higher indent level, it's a descendant
      if (nextIndentLevel > taskIndentLevel) {
        descendants.push(nextElement);
        nextElement = nextElement.nextElementSibling;
      } else {
        // Stop when we reach an element with the same or lower indent level
        break;
      }
    }

    // Log for debugging
    if (descendants.length > 0) {
      console.log(`Found ${descendants.length} descendants for task with indent level ${taskIndentLevel}`);
      descendants.forEach((d, i) => {
        const level = d.getAttribute('data-indent-level');
        const text = d.querySelector('.task-text')?.textContent || 'unknown';
        console.log(`  Descendant ${i + 1}: Level ${level}, Text: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
      });
    }

    return descendants;
  }

  /**
   * Find the closest task to the given y-coordinate
   */
  findClosestTask(tasks, y) {
    if (tasks.length === 0) return null;

    return tasks.reduce((closest, task) => {
      const box = task.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (closest === null || Math.abs(offset) < Math.abs(closest.offset)) {
        return { offset, element: task };
      } else {
        return closest;
      }
    }, null).element;
  }

  /**
   * Get or create the drop indicator element
   */
  getOrCreateDropIndicator() {
    let indicator = document.querySelector('.drop-indicator');

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'drop-indicator';

      // Add a visual cue to make the drop position more obvious
      const arrowDiv = document.createElement('div');
      arrowDiv.className = 'drop-indicator-arrow';
      indicator.appendChild(arrowDiv);
    } else {
      // Remove from current position
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }

    return indicator;
  }

  /**
   * Remove all drop highlights
   */
  removeDropHighlights() {
    document.querySelectorAll('.task-drop-target').forEach(el => {
      el.classList.remove('task-drop-target');
    });
  }

  /**
   * Remove the drop indicator
   */
  removeDropIndicator() {
    const dropIndicator = document.querySelector('.drop-indicator');
    if (dropIndicator && dropIndicator.parentNode) {
      dropIndicator.parentNode.removeChild(dropIndicator);
    }
  }

  /**
   * Clean up all drag visuals
   */
  cleanupDragVisuals() {
    // Remove all drag-over indicators
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    // Remove drop indicator
    this.removeDropIndicator();

    // Remove task drop targets
    this.removeDropHighlights();
  }

  /**
   * Reset drag state
   */
  resetDragState() {
    this.draggedItem = null;
    this.originalContainer = null;
    this.originalNextSibling = null;
    this.originalIndentLevel = 0;
  }

  /**
   * Get the currently dragged item
   */
  getDraggedItem() {
    return this.draggedItem;
  }

  /**
   * Check if an item is currently being dragged
   */
  isDragging() {
    return this.draggedItem !== null;
  }

  /**
   * Setup drag events for a new task item
   */
  setupDragForNewTask(item) {
    this.setupDragEventsForItem(item);
  }

  /**
   * Destroy the drag handler
   */
  destroy() {
    if (!this.initialized) {
      return;
    }

    console.log('Destroying drag handler');

    // Clean up any active drag operations
    this.cleanupDragVisuals();
    this.resetDragState();

    // Remove drag attributes from all task items
    const taskItems = document.querySelectorAll('.kanban-column-content .task-list-item-container');
    taskItems.forEach(item => {
      item.removeAttribute('draggable');
      item.classList.remove('dragging');
    });

    this.initialized = false;
    console.log('Drag handler destroyed');
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KanbanDragHandler;
}