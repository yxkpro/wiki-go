// Kanban Drag and Drop Functionality
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Only initialize for admin and editor roles
    const role = document.querySelector('meta[name="user-role"]')?.content || 'viewer';
    const docPath = (document.querySelector('meta[name="doc-path"]')?.content || '').replace(/^\//, '');

    console.log('Kanban init - Role:', role, 'DocPath:', docPath);

    // Add role class to body
    document.body.classList.add(`role-${role}`);

    // Early exit conditions
    if (!(role === 'admin' || role === 'editor')) {
      console.log('Kanban: Not initializing - user role not admin/editor');
      return;
    }
    if (document.body.classList.contains('editing')) {
      console.log('Kanban: Not initializing - page in edit mode');
      return;
    }
    if (document.querySelector('.version-content')) {
      console.log('Kanban: Not initializing - viewing version preview');
      return;
    }

    // Find all kanban containers
    const kanbanContainers = document.querySelectorAll('.kanban-container');
    console.log('Kanban containers found:', kanbanContainers.length);

    if (kanbanContainers.length === 0) return;

    // Initialize kanban drag and drop
    initKanbanDragDrop(kanbanContainers, docPath);
  });

  /**
   * Initialize drag and drop functionality for kanban boards
   */
  function initKanbanDragDrop(kanbanContainers, docPath) {
    console.log('Initializing kanban drag and drop');

    // Add CSS class to indicate drag and drop is enabled
    document.body.classList.add('kanban-drag-enabled');

    // State variables for drag operations
    let draggedItem = null;
    let originalContainer = null;
    let originalNextSibling = null;
    let originalIndentLevel = 0;

    // Setup all task items for drag and drop
    setupTaskItems();

    // Setup all columns as drop targets
    setupColumnDropTargets();

    // Setup add task buttons
    setupAddTaskButtons();

    // Setup global dragend event
    document.addEventListener('dragend', cleanupDragVisuals);

    /**
     * Set up all task items to be draggable
     */
    function setupTaskItems() {
      const allTaskItems = document.querySelectorAll('.kanban-column-content .task-list-item-container');
      console.log('Task items found:', allTaskItems.length);

      // Fetch the original markdown to preserve formatting
      fetch(`/api/source/${docPath}`)
        .then(response => response.text())
        .then(markdown => {
          // Extract task content from the markdown
          const taskMap = extractTasksFromMarkdown(markdown);

          // Set up each task item
          allTaskItems.forEach((item, index) => {
            // Initialize indentation classes
            const indentLevel = parseInt(item.getAttribute('data-indent-level') || '0');
            item.classList.add(`indent-${indentLevel}`);

            // Remove any inline margin-left that might have been set by the server
            if (item.style.marginLeft) {
              item.style.removeProperty('margin-left');
            }

            // Make item draggable
            item.setAttribute('draggable', 'true');

            // Try to match with original markdown
            const taskTextElement = item.querySelector('.task-text');
            if (taskTextElement) {
              const displayedText = taskTextElement.textContent.trim();
              const originalMarkdown = taskMap.get(displayedText);

              if (originalMarkdown) {
                // Store the original markdown for later use
                item.setAttribute('data-original-markdown', originalMarkdown);
              }
            }

            // Add drag handle
            addDragHandle(item);

            // Add drag events
            setupDragEvents(item);

            if (index === 0) {
              console.log('First task setup complete:', item.outerHTML);
            }
          });
        })
        .catch(error => {
          console.error('Error fetching original markdown:', error);

          // Set up basic functionality even if we couldn't fetch the markdown
          allTaskItems.forEach((item, index) => {
            // Initialize indentation classes
            const indentLevel = parseInt(item.getAttribute('data-indent-level') || '0');
            item.classList.add(`indent-${indentLevel}`);

            // Remove any inline margin-left that might have been set by the server
            if (item.style.marginLeft) {
              item.style.removeProperty('margin-left');
            }

            // Make item draggable
            item.setAttribute('draggable', 'true');

            // Add drag handle
            addDragHandle(item);

            // Add drag events
            setupDragEvents(item);
          });
        });
    }

    /**
     * Extract tasks from markdown content
     */
    function extractTasksFromMarkdown(markdown) {
      const taskMap = new Map();
      const lines = markdown.split(/\r?\n/);

      // Regular expression to match task items
      const taskRegex = /^\s*([-*+])\s+\[([ xX])\]\s+(.+)$/;

      lines.forEach(line => {
        const match = line.match(taskRegex);
        if (match) {
          const taskContent = match[3]; // Original markdown content

          // Create a plain text version for matching with rendered HTML
          const plainText = taskContent
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/__([^_]+)__/g, '$1')     // Remove bold with underscore
            .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
            .replace(/_([^_]+)_/g, '$1')       // Remove italic with underscore
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .replace(/`([^`]+)`/g, '$1')       // Remove code
            .trim();

          // Store the mapping between plain text and original markdown
          taskMap.set(plainText, taskContent);
        }
      });

      return taskMap;
    }

    /**
     * Add a drag handle to a task item
     */
    function addDragHandle(item) {
      const taskItem = item.querySelector('.task-list-item');
      if (taskItem) {
        // Check if action buttons already exist
        if (taskItem.querySelector('.task-action-buttons')) {
          return;
        }

        // Create action buttons container
        const actionButtons = document.createElement('div');
        actionButtons.className = 'task-action-buttons editor-admin-only';

        // Add rename button
        const renameBtn = document.createElement('button');
        renameBtn.className = 'task-action-btn task-rename-btn';
        renameBtn.title = 'Rename task';
        renameBtn.innerHTML = '<i class="fa fa-pencil"></i>'; // Edit/pencil icon
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          renameTask(item);
        });

        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-action-btn task-delete-btn';
        deleteBtn.title = 'Delete task';
        deleteBtn.innerHTML = '<i class="fa fa-times"></i>'; // Times/cross icon
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteTask(item);
        });

        // Add drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'task-drag-handle';
        dragHandle.innerHTML = '<i class="fa fa-bars"></i>'; // Triple bar symbol

        // Add buttons to container
        actionButtons.appendChild(renameBtn);
        actionButtons.appendChild(deleteBtn);
        actionButtons.appendChild(dragHandle);

        // Add container to task item
        taskItem.appendChild(actionButtons);
      }
    }

    /**
     * Rename a task
     */
    function renameTask(taskItem) {
      const taskTextElement = taskItem.querySelector('.task-text');
      if (!taskTextElement) return;

      // Check if we have the original markdown stored as a data attribute
      let originalMarkdown = taskItem.getAttribute('data-original-markdown');

      // If no stored original markdown, fall back to the displayed text
      if (!originalMarkdown) {
        originalMarkdown = taskTextElement.textContent;
      }

      const taskListItem = taskItem.querySelector('.task-list-item');

      // Create input field
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'task-rename-input';
      input.value = originalMarkdown; // Use the original markdown for editing

      // Hide the task text and show input
      taskTextElement.style.display = 'none';
      taskListItem.insertBefore(input, taskTextElement.nextSibling);

      // Focus the input
      input.focus();
      input.select();

      // Handle input events
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const newText = input.value.trim();

          if (newText && newText !== originalMarkdown) {
            // Store the new markdown as a data attribute for reference
            taskItem.setAttribute('data-original-markdown', newText);

            // Update task text with processed markdown
            taskTextElement.innerHTML = processMarkdown(newText);

            // Save changes
            saveKanbanChanges(docPath);
          }

          // Restore display
          taskTextElement.style.display = '';
          input.remove();
        } else if (e.key === 'Escape') {
          // Cancel on escape
          taskTextElement.style.display = '';
          input.remove();
        }
      });

      // Also handle blur event to cancel
      input.addEventListener('blur', () => {
        // Small delay to allow for Enter key processing
        setTimeout(() => {
          if (input.parentNode) {
            taskTextElement.style.display = '';
            input.remove();
          }
        }, 200);
      });
    }

    /**
     * Delete a task
     */
    function deleteTask(taskItem) {
      // Ask for confirmation using the DialogSystem
      window.DialogSystem.showConfirmDialog(
        "Delete Task",
        "Are you sure you want to delete this task?",
        (confirmed) => {
          if (!confirmed) return;

          // Find all descendants
          const descendants = findAllDescendants(taskItem);

          // Remove descendants first
          descendants.forEach(descendant => {
            descendant.remove();
          });

          // Remove the task
          taskItem.remove();

          // Save changes
          saveKanbanChanges(docPath);
        }
      );
    }

    /**
     * Set up drag events for a task item
     */
    function setupDragEvents(item) {
      // Drag start
      item.addEventListener('dragstart', e => {
        console.log('Drag started', e);
        // Store original state
        draggedItem = item;
        originalContainer = item.parentNode;
        originalNextSibling = item.nextElementSibling;
        originalIndentLevel = parseInt(item.getAttribute('data-indent-level') || '0');

        // Add visual feedback
        item.classList.add('dragging');

        // Set up drag transfer data
        e.dataTransfer.effectAllowed = 'move';
        const taskText = item.querySelector('.task-text');
        e.dataTransfer.setData('text/plain', taskText ? taskText.innerHTML : item.textContent.trim());

        // Create drag image
        createDragImage(e, item);
      });

      // Drag end
      item.addEventListener('dragend', e => {
        console.log('Drag ended', e);
        if (draggedItem) {
          draggedItem.classList.remove('dragging');

          // If the item was moved, save the changes
          if (draggedItem.parentNode !== originalContainer || draggedItem.nextElementSibling !== originalNextSibling) {
            console.log('Item was moved, saving changes');
            console.log('Original container:', originalContainer);
            console.log('New container:', draggedItem.parentNode);
            console.log('Original next sibling:', originalNextSibling);
            console.log('New next sibling:', draggedItem.nextElementSibling);
            saveKanbanChanges(docPath);
          } else {
            console.log('Item was not moved, no changes to save');
          }

          // Reset state
          draggedItem = null;
          originalContainer = null;
          originalNextSibling = null;
        }
      });
    }

    /**
     * Create a drag image for the dragged item
     */
    function createDragImage(e, item) {
      const dragImage = item.cloneNode(true);
      dragImage.style.opacity = '0.7';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 10, 10);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }

    /**
     * Set up all columns as drop targets
     */
    function setupColumnDropTargets() {
      const columnContents = document.querySelectorAll('.kanban-column-content ul');
      console.log('Column contents found:', columnContents.length);

      columnContents.forEach(column => {
        // Dragover - needed to allow dropping
        column.addEventListener('dragover', e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          // Remove existing highlights
          removeDropHighlights();

          // Find the closest task and position the drop indicator
          positionDropIndicator(column, e.clientY);
        });

        // Dragenter - add visual feedback
        column.addEventListener('dragenter', e => {
          e.preventDefault();
          column.classList.add('drag-over');
        });

        // Dragleave - remove visual feedback
        column.addEventListener('dragleave', e => {
          if (!column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
          }
        });

        // Drop - handle the actual drop
        column.addEventListener('drop', e => {
          e.preventDefault();
          column.classList.remove('drag-over');

          if (!draggedItem) return;

          // Handle dropping on a task or between tasks
          handleDrop(column);

          // Clean up
          removeDropIndicator();
        });

        // Also handle the column content div for empty columns
        const columnContentDiv = column.parentNode;
        if (columnContentDiv && columnContentDiv.classList.contains('kanban-column-content')) {
          setupEmptyColumnDropTarget(columnContentDiv, column);
        }
      });
    }

    /**
     * Set up drop handling for empty column areas
     */
    function setupEmptyColumnDropTarget(contentDiv, columnUl) {
      // Dragover
      contentDiv.addEventListener('dragover', e => {
        // Only process if directly over the content div, not its children
        if (e.target === contentDiv || e.target === columnUl) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          // Remove existing highlights
          removeDropHighlights();

          // Add visual feedback
          contentDiv.classList.add('drag-over');

          // If column is empty or we're below all tasks, add indicator at the end
          const dropIndicator = getOrCreateDropIndicator();

          // Make the indicator more visible in empty columns
          dropIndicator.classList.add('empty-column-indicator');

          columnUl.appendChild(dropIndicator);
        }
      });

      // Dragenter
      contentDiv.addEventListener('dragenter', e => {
        if (e.target === contentDiv || e.target === columnUl) {
          e.preventDefault();
          columnUl.classList.add('drag-over');
          contentDiv.classList.add('drag-over');
        }
      });

      // Dragleave
      contentDiv.addEventListener('dragleave', e => {
        if (!contentDiv.contains(e.relatedTarget)) {
          columnUl.classList.remove('drag-over');
          contentDiv.classList.remove('drag-over');
        }
      });

      // Drop
      contentDiv.addEventListener('drop', e => {
        if (e.target === contentDiv || e.target === columnUl) {
          e.preventDefault();
          columnUl.classList.remove('drag-over');
          contentDiv.classList.remove('drag-over');

          if (!draggedItem) return;

          // Move item to the end of the column with its descendants
          moveItemWithDescendants(draggedItem, columnUl, null, 0);

          // Save changes
          saveKanbanChanges(docPath);

          // Clean up
          removeDropIndicator();
        }
      });
    }

    /**
     * Find the closest task to the given y-coordinate and position the drop indicator
     */
    function positionDropIndicator(column, y) {
      const tasks = [...column.querySelectorAll('.task-list-item-container')];
      if (tasks.length === 0) {
        // Empty column, append indicator at the end
        const dropIndicator = getOrCreateDropIndicator();
        column.appendChild(dropIndicator);
        return;
      }

      // Find the closest task
      const closestTask = findClosestTask(tasks, y);
      if (!closestTask) return;

      const rect = closestTask.getBoundingClientRect();
      const taskCenterY = rect.top + rect.height / 2;
      const taskTopThird = rect.top + rect.height / 3;
      const taskBottomThird = rect.top + (rect.height * 2) / 3;

      const dropIndicator = getOrCreateDropIndicator();

      // Create a more stable drop experience by dividing the task into three zones:
      // Top third: Drop above the task
      // Middle third: Make it a child of the task
      // Bottom third: Drop below the task

      if (y >= taskTopThird && y <= taskBottomThird && closestTask !== draggedItem) {
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
    function handleDrop(column) {
      // Check if we have a highlighted task (direct drop target)
      const dropTarget = document.querySelector('.task-drop-target');

      if (dropTarget) {
        console.log('Dropping onto task:', dropTarget);
        // We're dropping directly onto a task - make it a child
        const parentIndentLevel = parseInt(dropTarget.getAttribute('data-indent-level') || '0');
        const childIndentLevel = parentIndentLevel + 1;

        // Insert after the drop target
        const insertPosition = dropTarget.nextElementSibling;

        // Move the dragged item and its descendants
        moveItemWithDescendants(draggedItem, column, insertPosition, childIndentLevel);

        // Remove the highlight
        dropTarget.classList.remove('task-drop-target');

        // Force save even if the parent node appears to be the same
        // This is needed for making tasks children of other tasks on the same board
        saveKanbanChanges(docPath);
      } else {
        // We're dropping on a line indicator
        const dropIndicator = document.querySelector('.drop-indicator');
        if (dropIndicator) {
          console.log('Dropping at indicator position');
          // Get the position where we're dropping
          const dropPosition = dropIndicator.nextElementSibling;

          // Move the dragged item and its descendants
          moveItemWithDescendants(draggedItem, column, dropPosition, 0);

          // Force save for reordering on same board
          saveKanbanChanges(docPath);
        }
      }
    }

    /**
     * Move an item and all its descendants to a new position
     */
    function moveItemWithDescendants(item, targetColumn, insertBefore, newIndentLevel) {
      console.log(`Moving item with descendants. New indent level: ${newIndentLevel}`);

      // Store the original position for comparison
      const originalParent = item.parentNode;
      const originalNextSibling = item.nextElementSibling;
      const originalIndentLevel = parseInt(item.getAttribute('data-indent-level') || '0');

      // Find all descendants before modifying the DOM
      const descendants = findAllDescendants(item);
      console.log(`Found ${descendants.length} descendants to move with the item`);

      // Calculate the level difference for descendants
      const levelDifference = newIndentLevel - originalIndentLevel;

      // Update the dragged item's indent level
      updateIndentLevel(item, newIndentLevel);

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

        console.log(`Moving descendant ${index + 1}/${descendants.length} from level ${descendantOriginalLevel} to ${newDescendantLevel}`);

        // Update the indent level
        updateIndentLevel(descendant, newDescendantLevel);

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
        descendantsMoved: descendants.length
      });
    }

    /**
     * Update the indent level of an item
     */
    function updateIndentLevel(item, newLevel) {
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
    function findAllDescendants(task) {
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
    function findClosestTask(tasks, y) {
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
    function getOrCreateDropIndicator() {
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
        indicator.parentNode?.removeChild(indicator);
      }

      return indicator;
    }

    /**
     * Remove all drop highlights
     */
    function removeDropHighlights() {
      document.querySelectorAll('.task-drop-target').forEach(el => {
        el.classList.remove('task-drop-target');
      });
    }

    /**
     * Remove the drop indicator
     */
    function removeDropIndicator() {
      const dropIndicator = document.querySelector('.drop-indicator');
      if (dropIndicator && dropIndicator.parentNode) {
        dropIndicator.parentNode.removeChild(dropIndicator);
      }
    }

    /**
     * Clean up all visual feedback from dragging
     */
    function cleanupDragVisuals() {
      // Remove all drag-over indicators
      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      // Remove drop indicator
      removeDropIndicator();
    }

    /**
     * Save the kanban changes to the server
     */
    async function saveKanbanChanges(docPath) {
      // Show saving indicators on all columns
      showColumnStatus('saving', '(Saving...)');

      try {
        // 1. Fetch current markdown
        const srcResp = await fetch(`/api/source/${docPath}`);
        if (!srcResp.ok) throw new Error('source fetch failed');
        const markdown = await srcResp.text();

        // 2. Build updated markdown based on the current DOM structure
        const updatedMarkdown = buildUpdatedMarkdown(markdown);

        // 3. Save updated markdown
        const saveResp = await fetch(`/api/save/${docPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/markdown' },
          body: updatedMarkdown,
        });

        if (!saveResp.ok) throw new Error('save failed');

        // Show success indicator
        showColumnStatus('saved', '(Saved)', 2000);
      } catch (err) {
        console.error('Error saving kanban changes:', err);

        // Show error indicator
        showColumnStatus('error', '(Error saving)', 3000);
      }
    }

    /**
     * Show status indicators on all kanban columns
     */
    function showColumnStatus(statusClass, statusText, removeAfter = 0) {
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
     * Build updated markdown based on the current DOM structure
     */
    function buildUpdatedMarkdown(originalMarkdown) {
      console.log('Building updated markdown');

      // Split the original markdown into lines
      const lines = originalMarkdown.split(/\r?\n/);

      // Extract frontmatter and content before the first kanban section
      const frontmatterEndIndex = lines.findIndex((line, index) =>
        index > 0 && line.trim() === '---' && lines[0].trim() === '---'
      );

      // Maps to store original formatting
      const originalSectionHeaders = new Map();
      const originalTaskFormatting = new Map();

      // Track processed headers to avoid duplicates
      const processedHeaders = new Set();

      // First pass: collect original section headers and task formatting
      collectOriginalFormatting(lines, frontmatterEndIndex, originalSectionHeaders, originalTaskFormatting);

      // Now build the updated markdown
      let currentIndex = frontmatterEndIndex + 1;

      // Skip non-kanban content at the beginning
      while (currentIndex < lines.length && !lines[currentIndex].match(/^##\s+/)) {
        currentIndex++;
      }

      // Prepare the updated markdown
      const updatedLines = lines.slice(0, currentIndex);

      // Process each kanban container
      kanbanContainers.forEach((container, containerIndex) => {
        console.log(`Processing kanban container ${containerIndex + 1}`);

        // Process each column in this container
        const columns = container.querySelectorAll('.kanban-column');
        columns.forEach((column, columnIndex) => {
          // Get the column header text without status indicators
          const header = column.querySelector('.kanban-column-header');
          if (!header) return;

          // Extract the column title from the title span
          const titleSpan = header.querySelector('.column-title');
          let headerText = titleSpan ? titleSpan.textContent.trim() : header.textContent.trim();

          // Clean up any status indicators
          headerText = headerText
            .replace(/\s*\(Saving\.\.\.\)\s*/g, '')
            .replace(/\s*\(Saved\)\s*/g, '')
            .replace(/\s*\(Error saving\)\s*/g, '')
            .replace(/\+/g, ''); // Remove + signs from add button

          console.log(`Processing column: ${headerText}`);

          // Skip if already processed
          const headerKey = headerText.toLowerCase();
          if (processedHeaders.has(headerKey)) {
            console.log(`Column ${headerText} already processed, skipping`);
            return;
          }

          // Mark as processed
          processedHeaders.add(headerKey);

          // Use original header if available
          const originalHeader = originalSectionHeaders.get(headerKey) || headerText;
          updatedLines.push(`## ${originalHeader}`);

          // Process each task in this column
          processColumnTasks(column, updatedLines, originalTaskFormatting);

          // Add empty line after each column
          updatedLines.push('');
        });
      });

      // Add any sections from the original that weren't processed
      addRemainingOriginalSections(lines, currentIndex, updatedLines, processedHeaders);

      // Log the first few lines of the updated markdown for debugging
      console.log('Updated markdown first few lines:', updatedLines.slice(0, Math.min(10, updatedLines.length)).join('\n'));

      return updatedLines.join('\n');
    }

    /**
     * Process all tasks in a column and add them to the updated markdown
     */
    function processColumnTasks(column, updatedLines, originalTaskFormatting) {
      const tasks = column.querySelectorAll('.task-list-item-container');
      console.log(`Processing ${tasks.length} tasks in column`);

      if (tasks.length === 0) return;

      // Create a map to track task hierarchy
      const taskHierarchy = new Map();

      // First pass: build hierarchy map
      tasks.forEach((task, index) => {
        const indentLevel = parseInt(task.getAttribute('data-indent-level') || '0');
        if (!taskHierarchy.has(indentLevel)) {
          taskHierarchy.set(indentLevel, []);
        }
        taskHierarchy.get(indentLevel).push({
          task,
          index,
          processed: false
        });
      });

      // Log the hierarchy for debugging
      console.log('Task hierarchy:');
      taskHierarchy.forEach((tasks, level) => {
        console.log(`  Level ${level}: ${tasks.length} tasks`);
      });

      // Simply process tasks in the exact DOM order they appear
      // This preserves the hierarchy and ordering after drag and drop
      tasks.forEach((task, index) => {
        const taskTextElement = task.querySelector('.task-text');
        if (!taskTextElement) return;

        // Get the displayed text content
        const taskText = taskTextElement.textContent.trim();

        // Check if we have the original markdown stored as a data attribute
        // This is crucial for preserving formatting
        const originalMarkdown = task.getAttribute('data-original-markdown');

        const checkbox = task.querySelector('.task-checkbox');
        const isChecked = checkbox && checkbox.checked;
        const indentLevel = parseInt(task.getAttribute('data-indent-level') || '0');
        const indent = '  '.repeat(indentLevel);

        // Try to find original formatting from the markdown file
        const plainTextKey = taskText.replace(/\s+/g, ' ').trim();
        const originalFormat = originalTaskFormatting.get(plainTextKey);

        // Log task info for debugging
        if (index === 0 || index === tasks.length - 1 || indentLevel > 1) {
          console.log(`Task ${index + 1}/${tasks.length}: "${taskText}" (indent: ${indentLevel}, checked: ${isChecked})`);
        }

        // Priority for saving:
        // 1. Use data-original-markdown if available (user edited or created)
        // 2. Use original formatting from the markdown file
        // 3. Fallback to plain text
        if (originalMarkdown) {
          // Use the stored original markdown - this preserves user edits
          updatedLines.push(`${indent}- [${isChecked ? 'x' : ' '}] ${originalMarkdown}`);
        } else if (originalFormat) {
          // Use original formatting but update check status and indentation
          updatedLines.push(`${indent}${originalFormat.listMarker} [${isChecked ? 'x' : ' '}] ${originalFormat.taskContent}`);
        } else {
          // Fallback to basic formatting
          updatedLines.push(`${indent}- [${isChecked ? 'x' : ' '}] ${taskText}`);
        }

        if (index === tasks.length - 1) {
          console.log(`Processed all ${tasks.length} tasks in column`);
        }
      });
    }

    /**
     * Collect original formatting from the markdown
     */
    function collectOriginalFormatting(lines, startIndex, sectionHeaders, taskFormatting) {
      let i = startIndex + 1;
      while (i < lines.length) {
        const headerMatch = lines[i].match(/^##\s+(.+)$/);
        if (headerMatch) {
          const sectionTitle = headerMatch[1].trim();
          // Clean the title of any status indicators and + signs
          const cleanTitle = sectionTitle.replace(/\s*\(Saving\.\.\.\)\s*/g, '')
                                        .replace(/\s*\(Saved\)\s*/g, '')
                                        .replace(/\s*\(Error saving\)\s*/g, '')
                                        .replace(/\+/g, ''); // Remove + signs

          // Check if the next lines contain task items
          let hasTaskItems = false;
          let j = i + 1;
          while (j < lines.length && !lines[j].match(/^##\s+/)) {
            const taskMatch = lines[j].match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.+)$/);
            if (taskMatch) {
              hasTaskItems = true;
              // Store original formatting
              const indent = taskMatch[1];
              const listMarker = taskMatch[2];
              const checkStatus = taskMatch[3];
              const taskContent = taskMatch[4]; // This is the raw markdown

              // Store the raw markdown content with its formatting intact
              taskFormatting.set(taskContent, {
                indent,
                listMarker,
                checkStatus,
                taskContent,
                raw: taskMatch[4] // Store the raw markdown
              });

              // Also store a plain text version for better matching
              // This helps match the rendered HTML text back to the original markdown
              const plainTextKey = taskContent
                .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
                .replace(/__([^_]+)__/g, '$1')     // Remove bold with underscore
                .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
                .replace(/_([^_]+)_/g, '$1')       // Remove italic with underscore
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
                .replace(/`([^`]+)`/g, '$1')       // Remove code
                .trim();

              if (plainTextKey !== taskContent) {
                taskFormatting.set(plainTextKey, {
                  indent,
                  listMarker,
                  checkStatus,
                  taskContent,
                  raw: taskMatch[4] // Store the raw markdown
                });
              }
            }
            j++;
          }

          if (hasTaskItems) {
            // This is a kanban section, store the original header
            sectionHeaders.set(cleanTitle.toLowerCase(), sectionTitle);
          }
        }
        i++;
      }
    }

    /**
     * Add remaining original sections that weren't processed
     */
    function addRemainingOriginalSections(lines, startIndex, updatedLines, processedHeaders) {
      let skipSection = false;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];

        // Check if this is a header
        const headerMatch = line.match(/^##\s+(.+)$/);

        if (headerMatch) {
          // Get clean header text
          const headerText = headerMatch[1].trim();
          const cleanHeader = headerText.replace(/\s*\(Saving\.\.\.\)\s*/g, '')
                                       .replace(/\s*\(Saved\)\s*/g, '')
                                       .replace(/\s*\(Error saving\)\s*/g, '')
                                       .replace(/\+/g, ''); // Remove + signs

          // Check if already processed
          if (processedHeaders.has(cleanHeader.toLowerCase())) {
            skipSection = true;
            continue;
          } else {
            skipSection = false;
          }
        }

        // Add line if not skipping
        if (!skipSection) {
          updatedLines.push(line);
        }
      }
    }

    /**
     * Set up add task buttons for each column
     */
    function setupAddTaskButtons() {
      const addTaskButtons = document.querySelectorAll('.add-task-btn');
      console.log('Add task buttons found:', addTaskButtons.length);

      addTaskButtons.forEach(button => {
        button.addEventListener('click', e => {
          e.preventDefault();

          // Find the column content where we need to add the task
          const column = button.closest('.kanban-column');
          const columnContent = column.querySelector('.kanban-column-content');
          const taskList = columnContent.querySelector('.task-list');

          // Check if there's already an input field
          if (columnContent.querySelector('.new-task-input-container')) {
            return; // Don't add another input if one already exists
          }

          // Create input container
          const inputContainer = document.createElement('div');
          inputContainer.className = 'new-task-input-container';

          // Create input field
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'new-task-input';
          input.placeholder = 'Type task and press Enter';

          // Add input to container
          inputContainer.appendChild(input);

          // Insert at the top of the column
          columnContent.insertBefore(inputContainer, columnContent.firstChild);

          // Focus the input
          input.focus();

          // Handle input events
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const taskText = input.value.trim();

              if (taskText) {
                // Create new task
                createNewTask(taskText, taskList);

                // Save changes
                saveKanbanChanges(docPath);

                // Remove input
                inputContainer.remove();
              }
            } else if (e.key === 'Escape') {
              // Cancel on escape
              inputContainer.remove();
            }
          });

          // Also handle blur event to cancel
          input.addEventListener('blur', () => {
            // Small delay to allow for Enter key processing
            setTimeout(() => {
              if (inputContainer.parentNode) {
                inputContainer.remove();
              }
            }, 200);
          });
        });
      });
    }

    /**
     * Create a new task with the given text
     */
    function createNewTask(taskText, taskList) {
      // Create task container
      const taskContainer = document.createElement('li');
      taskContainer.className = 'task-list-item-container indent-0';
      taskContainer.setAttribute('data-indent-level', '0');
      taskContainer.style.listStyleType = 'none';
      taskContainer.setAttribute('draggable', 'true');

      // Store the original markdown text as a data attribute
      taskContainer.setAttribute('data-original-markdown', taskText);

      // Process markdown in task text
      const processedText = processMarkdown(taskText);

      // Create task content
      taskContainer.innerHTML = `
        <span class="task-list-item">
          <input type="checkbox" class="task-checkbox" disabled>
          <span class="task-text">${processedText}</span>
          <span class="save-state"></span>
        </span>
      `;

      // Add drag handle and action buttons
      addDragHandle(taskContainer);

      // Add drag events
      setupDragEvents(taskContainer);

      // Add to the beginning of the list
      if (taskList.firstChild) {
        taskList.insertBefore(taskContainer, taskList.firstChild);
      } else {
        taskList.appendChild(taskContainer);
      }

      console.log('New task created:', taskText);
    }

    /**
     * Process markdown formatting in text
     */
    function processMarkdown(text) {
      // Escape HTML first to prevent XSS
      let processed = escapeHtml(text);

      // Process bold text (**text** or __text__)
      processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');

      // Process italic text (*text* or _text_)
      processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      processed = processed.replace(/_([^_]+)_/g, '<em>$1</em>');

      // Process links [text](url)
      processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

      // Process inline code (`code`)
      processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

      return processed;
    }

    /**
     * Escape HTML special characters to prevent XSS
     */
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }
})();