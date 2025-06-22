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

    // Create a task checkbox handler similar to tasklist-live.js
    const taskCheckboxHandler = createTaskCheckboxHandler(docPath);

    // Map to store task IDs and their corresponding tasks
    const taskIdMap = new Map();

    // Setup all task items for drag and drop
    setupTaskItems();

    // Setup all columns as drop targets
    setupColumnDropTargets();

    // Setup add task buttons
    setupAddTaskButtons();

    // Setup rename column buttons
    setupRenameColumnButtons();

    // Setup add board button
    setupAddBoardButton();

    // Setup global dragend event
    document.addEventListener('dragend', cleanupDragVisuals);

    // Override tasklist-live.js for kanban tasks
    overrideTasklistLive();

    /**
     * Override tasklist-live.js for kanban tasks
     */
    function overrideTasklistLive() {
      // Add a mutation observer to watch for changes to checkboxes
      // This ensures our handler is used even if tasklist-live.js tries to take over
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' &&
              mutation.attributeName === 'data-cb-index' &&
              mutation.target.closest('.kanban-column-content')) {
            // Remove the data-cb-index attribute
            mutation.target.removeAttribute('data-cb-index');

            // Ensure our handler is attached
            const taskContainer = mutation.target.closest('.task-list-item-container');
            if (taskContainer) {
              setupCheckboxForTask(taskContainer);
            }
          }
        });
      });

      // Observe all checkboxes in kanban columns
      const kanbanCheckboxes = document.querySelectorAll('.kanban-column-content input[type="checkbox"]');
      kanbanCheckboxes.forEach(checkbox => {
        observer.observe(checkbox, { attributes: true });
      });

      // Also periodically check for new checkboxes that might have been added
      setInterval(() => {
        disableTasklistLiveForKanban();
      }, 2000);
    }

    /**
     * Generate a unique ID for a task
     */
    function generateTaskId() {
      return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create a handler for task checkboxes that works like tasklist-live.js
     */
    function createTaskCheckboxHandler(docPath) {
      // This function creates a checkbox handler similar to tasklist-live.js
      // but specifically for kanban tasks

      // Helper to show state in the save-state span
      const showState = (li, text, cssClass) => {
        const s = li.querySelector('.save-state');
        if (!s) return;
        s.textContent = text;
        s.classList.remove('saved','error');
        if(cssClass) s.classList.add(cssClass); else s.classList.remove('saved','error');
      };

      // Helper to hide state after a delay
      const hideStateAfter = (li, delay=3000) => {
        const s = li.querySelector('.save-state');
        if (!s) return;
        setTimeout(()=>{ s.textContent=''; }, delay);
      };

      // Return the handler function
      return async function(e) {
        const target = e.target;
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;

        // Always prevent default to ensure we handle it ourselves
        e.preventDefault();
        e.stopPropagation();

        const li = target.closest('li');
        if (!li) return;

        // Get the task ID
        const taskId = li.getAttribute('data-task-id');
        if (!taskId) {
          console.error('Task has no ID, cannot toggle');
          return;
        }

        // Get the indentation level
        const indentLevel = parseInt(li.getAttribute('data-indent-level') || '0');
        console.log(`Handling checkbox click for task ID ${taskId} at indent level ${indentLevel}`);

        showState(li, 'saving…');

        // Disable all checkboxes during save
        const allCheckboxes = document.querySelectorAll('.task-checkbox');
        allCheckboxes.forEach(cb => cb.disabled = true);

        try {
          // 1. Fetch current markdown
          const srcResp = await fetch(`/api/source/${docPath}`);
          if (!srcResp.ok) throw new Error('source fetch failed');
          const markdown = await srcResp.text();

          // 2. Build updated markdown
          const updatedMarkdown = toggleTaskInMarkdown(markdown, li, taskId);

          // 3. Save updated markdown
          const saveResp = await fetch(`/api/save/${docPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/markdown' },
            body: updatedMarkdown,
          });

          if (!saveResp.ok) throw new Error('save failed');

          // 4. Update UI checkbox state
          target.checked = !target.checked;
          showState(li, 'saved', 'saved');
          hideStateAfter(li, 3000);

          // 5. Clear the moved flag since we've successfully saved the task
          if (li.hasAttribute('data-was-moved')) {
            li.removeAttribute('data-was-moved');
            console.log(`Cleared 'was-moved' flag for task ${taskId}`);
          }

          // 6. If this was a new task, clear the new flag
          if (li.hasAttribute('data-is-new')) {
            li.removeAttribute('data-is-new');
            console.log(`Cleared 'is-new' flag for task ${taskId}`);
          }
        } catch (err) {
          console.error('Error toggling task checkbox:', err);
          showState(li, 'error', 'error');
        } finally {
          // Re-enable all checkboxes
          allCheckboxes.forEach(cb => cb.disabled = false);
        }
      };
    }

    /**
     * Toggle a task checkbox in the markdown content using task ID
     */
    function toggleTaskInMarkdown(markdown, taskItem, taskId) {
      const lines = markdown.split(/\r?\n/);
      const desiredChecked = !taskItem.querySelector('.task-checkbox').checked;

      // Get the task text and indentation level
      const taskText = taskItem.querySelector('.task-text').textContent.trim();
      const indentLevel = parseInt(taskItem.getAttribute('data-indent-level') || '0');

      console.log(`Toggling task: "${taskText}" (ID: ${taskId}, indent: ${indentLevel}, desired state: ${desiredChecked ? 'checked' : 'unchecked'})`);

      // Check if this is a newly created task that hasn't been saved yet
      const isNewTask = taskItem.hasAttribute('data-is-new') && taskItem.getAttribute('data-is-new') === 'true';

      // For new tasks, we need to find them by content since they don't have IDs in the markdown yet
      if (isNewTask) {
        console.log('This is a new task, finding by content');

        // Find and toggle the task by content
        let found = false;
        const updatedLines = lines.map(line => {
          if (found) return line;

          const match = line.match(/^(\s*)([-*+])\s+\[(.| )\]\s+(.*)$/);
          if (!match) return line;

          const [, indent, listMarker, currentCheck, content] = match;
          const lineIndentLevel = Math.floor(indent.length / 2);

          // Extract content without comments
          const contentWithoutComments = content.split('<!--')[0].trim();

          // Normalize content for comparison
          const normalizedContent = contentWithoutComments
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .trim();

          const normalizedTaskText = taskText
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .trim();

          // For new tasks, we need to match both content and indentation level
          if (normalizedContent === normalizedTaskText && lineIndentLevel === indentLevel) {
            found = true;
            const newMark = desiredChecked ? 'x' : ' ';

            console.log(`Found new task to toggle at indent level ${lineIndentLevel}`);

            // Add task ID comment for future reference
            return `${indent}${listMarker} [${newMark}] ${contentWithoutComments} <!-- task-id: ${taskId} -->`;
          }

          return line;
        });

        if (!found) {
          console.warn('Could not find new task to toggle');
        }

        return updatedLines.join('\n');
      }

      // For existing tasks, try to find them by ID comment
      console.log('Looking for task by ID in markdown');

      // Check if this task was recently moved
      const wasTaskMoved = taskItem.hasAttribute('data-was-moved') && taskItem.getAttribute('data-was-moved') === 'true';

      // If the task was moved, we need to be more careful
      if (wasTaskMoved) {
        console.log('Task was moved, using extra care when toggling');
      }

      // Try different patterns for finding the task ID in the markdown
      const idPatterns = [
        `<!-- task-id: ${taskId} -->`,
        `<!--task-id: ${taskId}-->`,
        `<!-- task-id:${taskId} -->`,
        `<!--task-id:${taskId}-->`
      ];

      // First, try to find the exact task by ID and indentation level
      let foundExact = false;
      let foundAny = false;
      let exactMatchLine = -1;
      let anyMatchLine = -1;

      // First pass: find all potential matches
      lines.forEach((line, index) => {
        if (foundExact) return;

        // Check if this line contains our task ID in any format
        const hasTaskId = idPatterns.some(pattern => line.includes(pattern));

        if (hasTaskId) {
          foundAny = true;
          anyMatchLine = index;

          // Extract the task parts
          const match = line.match(/^(\s*)([-*+])\s+\[(.| )\]\s+(.*)$/);
          if (!match) return;

          const [, indent, listMarker, currentCheck, content] = match;

          // Calculate the line's indentation level
          const lineIndentLevel = Math.floor(indent.length / 2);

          // If indentation level matches, this is our exact match
          if (lineIndentLevel === indentLevel) {
            foundExact = true;
            exactMatchLine = index;
            console.log(`Found exact match for task ID ${taskId} at line ${index} with indent level ${lineIndentLevel}`);
          }
        }
      });

      // Now update the appropriate line
      if (foundExact || foundAny) {
        const lineIndex = foundExact ? exactMatchLine : anyMatchLine;
        const line = lines[lineIndex];

        // Extract the task parts
        const match = line.match(/^(\s*)([-*+])\s+\[(.| )\]\s+(.*)$/);
        if (!match) {
          console.warn('Found task ID but line format is unexpected:', line);
          return lines.join('\n');
        }

        const [, indent, listMarker, currentCheck, content] = match;

        // Calculate the line's indentation level
        const lineIndentLevel = Math.floor(indent.length / 2);

        // Split content and comment
        const parts = content.split('<!--');
        const mainContent = parts[0].trim();
        const comment = parts.length > 1 ? '<!--' + parts.slice(1).join('<!--') : '';

        // Toggle the checkbox
        const newMark = desiredChecked ? 'x' : ' ';

        // Log the change with indentation info
        console.log(`Toggling task by ID at line ${lineIndex}, indent level ${lineIndentLevel}, from [${currentCheck}] to [${newMark}]`);

        // Update the line
        lines[lineIndex] = `${indent}${listMarker} [${newMark}] ${mainContent} ${comment}`;

        return lines.join('\n');
      }

      console.warn('Could not find task by ID, falling back to content matching');

      // Fall back to content matching with indentation level
      return fallbackToggleByContent(lines, taskText, indentLevel, desiredChecked, taskId, wasTaskMoved);
    }

    /**
     * Fallback method to toggle a task by content and indentation level
     */
    function fallbackToggleByContent(lines, taskText, indentLevel, desiredChecked, taskId, wasTaskMoved) {
      console.log(`Fallback: toggling task by content: "${taskText}" at indent level ${indentLevel}, desired state: ${desiredChecked ? 'checked' : 'unchecked'}`);

      // Normalize the task text
      const normalizedTaskText = taskText
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();

      // Collect all potential matches
      const potentialMatches = [];

      lines.forEach((line, index) => {
        const match = line.match(/^(\s*)([-*+])\s+\[(.| )\]\s+(.*)$/);
        if (!match) return;

        const [, indent, listMarker, currentCheck, content] = match;
        const lineIndentLevel = Math.floor(indent.length / 2);

        // Extract content without comments
        const contentWithoutComments = content.split('<!--')[0].trim();

        // Normalize content
        const normalizedContent = contentWithoutComments
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/__([^_]+)__/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/_([^_]+)_/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .trim();

        // If the task was moved, we need to be more strict about matching
        let isMatch;

        if (wasTaskMoved) {
          // For moved tasks, require exact text match and correct indentation
          isMatch = normalizedContent === normalizedTaskText && lineIndentLevel === indentLevel;
        } else {
          // For non-moved tasks, be more flexible with content but strict with indentation
          isMatch = (normalizedContent === normalizedTaskText ||
                    normalizedContent.includes(normalizedTaskText) ||
                    normalizedTaskText.includes(normalizedContent)) &&
                    lineIndentLevel === indentLevel;
        }

        if (isMatch) {
          potentialMatches.push({
            index,
            line,
            indentLevel: lineIndentLevel,
            content,
            contentWithoutComments,
            indent,
            listMarker,
            exactMatch: normalizedContent === normalizedTaskText && lineIndentLevel === indentLevel,
            currentCheck
          });
        }
      });

      // Log all potential matches for debugging
      console.log(`Found ${potentialMatches.length} potential matches`);
      potentialMatches.forEach((match, i) => {
        console.log(`Match ${i+1}: "${match.contentWithoutComments}" (indent: ${match.indentLevel}, exact: ${match.exactMatch}, current: [${match.currentCheck}])`);
      });

      // If we have matches, use the one with the correct indentation level
      if (potentialMatches.length > 0) {
        // First try exact match with both content and indent level
        const exactMatches = potentialMatches.filter(match => match.exactMatch);

        let matchToUse;

        if (exactMatches.length > 0) {
          console.log('Using exact content and indent match');
          matchToUse = exactMatches[0];
        } else {
          // Next try to find a match with the correct indent level
          const indentMatches = potentialMatches.filter(match => match.indentLevel === indentLevel);

          if (indentMatches.length > 0) {
            console.log('Using indent-level match');
            matchToUse = indentMatches[0];
          } else {
            // Use closest match by indentation
            console.log('No exact matches, using closest match by indent');
            potentialMatches.sort((a, b) =>
              Math.abs(a.indentLevel - indentLevel) - Math.abs(b.indentLevel - indentLevel)
            );
            matchToUse = potentialMatches[0];
          }
        }

        // Create updated lines
        const updatedLines = [...lines];
        const index = matchToUse.index;

        // Extract content and comments
        const parts = matchToUse.content.split('<!--');
        const mainContent = parts[0].trim();
        const comment = parts.length > 1 ? '<!--' + parts.slice(1).join('<!--') : '';

        // Toggle the checkbox and add task ID if not present
        const newMark = desiredChecked ? 'x' : ' ';
        const hasTaskId = comment.includes('task-id:');

        console.log(`Toggling checkbox from [${matchToUse.currentCheck}] to [${newMark}] at indent level ${matchToUse.indentLevel}`);

        if (hasTaskId) {
          updatedLines[index] = `${matchToUse.indent}${matchToUse.listMarker} [${newMark}] ${mainContent} ${comment}`;
        } else {
          updatedLines[index] = `${matchToUse.indent}${matchToUse.listMarker} [${newMark}] ${mainContent} <!-- task-id: ${taskId} -->`;
        }

        console.log(`Updated line ${index}: ${updatedLines[index]}`);
        return updatedLines.join('\n');
      }

      console.warn('Could not find any matching task');
      return lines.join('\n');
    }

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
          // Extract task content and IDs from the markdown
          const taskInfo = extractTasksFromMarkdown(markdown);

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

            // Try to match with original markdown and assign task ID
            const taskTextElement = item.querySelector('.task-text');
            if (taskTextElement) {
              const displayedText = taskTextElement.textContent.trim();

              // Try to find a matching task in the markdown
              const matchingTask = findMatchingTask(taskInfo, displayedText, indentLevel);

              if (matchingTask) {
                // Use existing task ID if found
                item.setAttribute('data-task-id', matchingTask.id);
                item.setAttribute('data-original-markdown', matchingTask.content);

                // Store in the task ID map
                taskIdMap.set(matchingTask.id, item);

                console.log(`Assigned existing ID ${matchingTask.id} to task "${displayedText.substring(0, 20)}${displayedText.length > 20 ? '...' : ''}"`);
              } else {
                // Generate a new ID for this task
                const newId = generateTaskId();
                item.setAttribute('data-task-id', newId);

                // Store in the task ID map
                taskIdMap.set(newId, item);

                console.log(`Generated new ID ${newId} for task "${displayedText.substring(0, 20)}${displayedText.length > 20 ? '...' : ''}"`);
              }
            }

            // Add drag handle
            addDragHandle(item);

            // Add drag events
            setupDragEvents(item);

            // Setup checkbox click handler
            setupCheckboxForTask(item);

            if (index === 0) {
              console.log('First task setup complete:', item.outerHTML);
            }
          });

          // Disable tasklist-live.js for kanban tasks by removing data-cb-index from all checkboxes
          disableTasklistLiveForKanban();
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

            // Generate a new ID for this task
            const newId = generateTaskId();
            item.setAttribute('data-task-id', newId);

            // Store in the task ID map
            taskIdMap.set(newId, item);

            // Add drag handle
            addDragHandle(item);

            // Add drag events
            setupDragEvents(item);

            // Setup checkbox click handler
            setupCheckboxForTask(item);
          });

          // Disable tasklist-live.js for kanban tasks
          disableTasklistLiveForKanban();
        });
    }

    /**
     * Disable tasklist-live.js for kanban tasks
     */
    function disableTasklistLiveForKanban() {
      // Remove data-cb-index from all checkboxes in kanban columns
      const kanbanCheckboxes = document.querySelectorAll('.kanban-column-content input[type="checkbox"]');
      console.log(`Disabling tasklist-live.js for ${kanbanCheckboxes.length} kanban checkboxes`);

      kanbanCheckboxes.forEach(checkbox => {
        if (checkbox.hasAttribute('data-cb-index')) {
          checkbox.removeAttribute('data-cb-index');
        }
      });
    }

    /**
     * Find a matching task from the extracted task info
     */
    function findMatchingTask(taskInfo, displayedText, indentLevel) {
      // Normalize the displayed text
      const normalizedText = displayedText
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();

      // First try to find an exact match with the same indentation level
      const exactMatches = taskInfo.filter(task => {
        const normalizedTaskContent = task.normalizedContent;
        return normalizedTaskContent === normalizedText && task.indentLevel === indentLevel;
      });

      if (exactMatches.length > 0) {
        return exactMatches[0];
      }

      // If no exact match, try a more flexible match
      const flexibleMatches = taskInfo.filter(task => {
        const normalizedTaskContent = task.normalizedContent;
        return (normalizedTaskContent.includes(normalizedText) ||
                normalizedText.includes(normalizedTaskContent)) &&
               task.indentLevel === indentLevel;
      });

      if (flexibleMatches.length > 0) {
        return flexibleMatches[0];
      }

      // If still no match, try ignoring indentation
      const contentMatches = taskInfo.filter(task => {
        const normalizedTaskContent = task.normalizedContent;
        return normalizedTaskContent === normalizedText ||
               normalizedTaskContent.includes(normalizedText) ||
               normalizedText.includes(normalizedTaskContent);
      });

      if (contentMatches.length > 0) {
        // Sort by closest indentation level
        contentMatches.sort((a, b) =>
          Math.abs(a.indentLevel - indentLevel) - Math.abs(b.indentLevel - indentLevel)
        );
        return contentMatches[0];
      }

      return null;
    }

    /**
     * Extract tasks from markdown content with their IDs
     */
    function extractTasksFromMarkdown(markdown) {
      const tasks = [];
      const lines = markdown.split(/\r?\n/);

      // Regular expression to match task items with optional task ID comment
      // This regex is more robust to handle various comment formats
      const taskRegex = /^(\s*)([-*+])\s+\[([ xX])\]\s+(.+?)(?:\s+<!--\s*task-id:\s*([a-zA-Z0-9_]+)\s*-->)?$/;

      lines.forEach((line, index) => {
        const match = line.match(taskRegex);
        if (match) {
          const indent = match[1];
          const listMarker = match[2];
          const isChecked = match[3] !== ' ';
          const content = match[4];

          // Extract task ID if present, or generate a new one
          let taskId;

          // Check if there's a task ID in the comment
          if (match[5]) {
            taskId = match[5];
          } else {
            // Check if there's a task ID in a different format
            const idMatch = line.match(/<!--\s*task-id:\s*([a-zA-Z0-9_]+)\s*-->/);
            if (idMatch) {
              taskId = idMatch[1];
            } else {
              // Generate a new ID
              taskId = generateTaskId();
            }
          }

          // Calculate indentation level
          const indentLevel = Math.floor(indent.length / 2);

          // Create a normalized version of the content for comparison
          // Remove any HTML comments first
          const contentWithoutComments = content.split('<!--')[0].trim();

          const normalizedContent = contentWithoutComments
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/__([^_]+)__/g, '$1')     // Remove bold with underscore
            .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
            .replace(/_([^_]+)_/g, '$1')       // Remove italic with underscore
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .replace(/`([^`]+)`/g, '$1')       // Remove code
            .trim();

          tasks.push({
            index,
            indent,
            listMarker,
            isChecked,
            content: contentWithoutComments,
            rawContent: content,
            normalizedContent,
            id: taskId,
            indentLevel,
            line
          });

          // Log for debugging
          if (index < 5 || index > lines.length - 5) {
            console.log(`Extracted task: "${contentWithoutComments.substring(0, 30)}${contentWithoutComments.length > 30 ? '...' : ''}" (ID: ${taskId}, indent: ${indentLevel})`);
          }
        }
      });

      console.log(`Extracted ${tasks.length} tasks from markdown`);
      return tasks;
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

        // Get the parent task ID for debugging
        const parentTaskId = dropTarget.getAttribute('data-task-id');
        console.log(`Parent task ID: ${parentTaskId}, indent level: ${parentIndentLevel}`);
        console.log(`Child will have indent level: ${childIndentLevel}`);

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
      const taskId = item.getAttribute('data-task-id');
      const taskText = item.querySelector('.task-text')?.textContent || '';

      // Find all descendants before modifying the DOM
      const descendants = findAllDescendants(item);
      console.log(`Found ${descendants.length} descendants to move with the item`);

      // Calculate the level difference for descendants
      const levelDifference = newIndentLevel - originalIndentLevel;

      // Update the dragged item's indent level
      updateIndentLevel(item, newIndentLevel);

      // Mark the item as moved
      item.setAttribute('data-was-moved', 'true');
      item.setAttribute('data-move-time', Date.now().toString());

      // Log the task ID for debugging
      if (taskId) {
        console.log(`Moving task "${taskText}" with ID: ${taskId} from level ${originalIndentLevel} to ${newIndentLevel}`);
      } else {
        console.warn('Moving task without an ID');
        // Generate a new ID if needed
        const newId = generateTaskId();
        item.setAttribute('data-task-id', newId);
        taskIdMap.set(newId, item);
        console.log(`Generated new ID ${newId} for moved task "${taskText}"`);
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
        updateIndentLevel(descendant, newDescendantLevel);

        // Mark the descendant as moved
        descendant.setAttribute('data-was-moved', 'true');
        descendant.setAttribute('data-move-time', Date.now().toString());

        // Log the descendant task ID for debugging
        if (descendantTaskId) {
          console.log(`Moving descendant with ID: ${descendantTaskId}`);
        } else {
          console.warn('Moving descendant without an ID');
          // Generate a new ID if needed
          const newId = generateTaskId();
          descendant.setAttribute('data-task-id', newId);
          taskIdMap.set(newId, descendant);
          console.log(`Generated new ID ${newId} for moved descendant "${descendantText}"`);
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
      setupCheckboxForTask(item);
      descendants.forEach(descendant => {
        setupCheckboxForTask(descendant);
      });

      // Force immediate save after moving to ensure task IDs are preserved
      saveKanbanChanges(docPath);
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

        // 4. After successful save, update task tracking
        updateTaskTrackingAfterSave();

        // 5. Ensure all checkboxes are properly set up after save
        disableTasklistLiveForKanban();

        // Show success indicator
        showColumnStatus('saved', '(Saved)', 2000);
      } catch (err) {
        console.error('Error saving kanban changes:', err);

        // Show error indicator
        showColumnStatus('error', '(Error saving)', 3000);
      }
    }

    /**
     * Update task tracking after a successful save
     */
    function updateTaskTrackingAfterSave() {
      // Clear the "new" and "moved" flags from all tasks
      document.querySelectorAll('.task-list-item-container').forEach(task => {
        if (task.hasAttribute('data-is-new')) {
          task.removeAttribute('data-is-new');
        }
        if (task.hasAttribute('data-was-moved')) {
          task.removeAttribute('data-was-moved');
        }
      });

      console.log('Task tracking updated after save');
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

      // Track renamed columns to avoid duplicates
      const renamedColumns = new Map();

      // Track board names to handle duplicates
      const boardNameCounts = new Map();

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

          // Check if this column was renamed
          const originalTitle = header.getAttribute('data-original-title');
          if (originalTitle && originalTitle !== headerText) {
            console.log(`Column was renamed from "${originalTitle}" to "${headerText}"`);

            // Store the mapping between original and new title
            renamedColumns.set(originalTitle.toLowerCase(), headerText);

            // Mark the original title as processed to avoid duplication
            processedHeaders.add(originalTitle.toLowerCase());
          }

          // Handle duplicate board names
          const headerKey = headerText.toLowerCase();

          // Count occurrences of this board name
          boardNameCounts.set(headerKey, (boardNameCounts.get(headerKey) || 0) + 1);

          // If this is a duplicate, add a suffix to the markdown header (but not the displayed name)
          let markdownHeaderText = headerText;
          if (boardNameCounts.get(headerKey) > 1) {
            // Add a unique identifier for the markdown only
            markdownHeaderText = `${headerText} (${boardNameCounts.get(headerKey)})`;
            console.log(`Handling duplicate board name: "${headerText}" -> "${markdownHeaderText}"`);
          }

          // Skip if already processed (except for duplicates with different identifiers)
          const processedKey = `${headerKey}-${boardNameCounts.get(headerKey)}`;
          if (processedHeaders.has(processedKey)) {
            console.log(`Column ${headerText} already processed, skipping`);
            return;
          }

          // Mark as processed with the unique key
          processedHeaders.add(processedKey);

          // Use original header format if available, otherwise use our generated one
          const originalHeader = originalSectionHeaders.get(headerKey) || markdownHeaderText;
          updatedLines.push(`## ${originalHeader}`);

          // Process each task in this column
          processColumnTasks(column, updatedLines, originalTaskFormatting);

          // Add empty line after each column
          updatedLines.push('');
        });
      });

      // Add any sections from the original that weren't processed
      addRemainingOriginalSections(lines, currentIndex, updatedLines, processedHeaders, renamedColumns);

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

      // Simply process tasks in the exact DOM order they appear
      // This preserves the hierarchy and ordering after drag and drop
      tasks.forEach((task, index) => {
        const taskTextElement = task.querySelector('.task-text');
        if (!taskTextElement) return;

        // Get the displayed text content
        const taskText = taskTextElement.textContent.trim();

        // Get the task ID
        const taskId = task.getAttribute('data-task-id');

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
        if (index === 0 || index === tasks.length - 1 || indentLevel > 0) {
          console.log(`Task ${index + 1}/${tasks.length}: "${taskText}" (indent: ${indentLevel}, checked: ${isChecked}, id: ${taskId || 'none'})`);
        }

        // Priority for saving:
        // 1. Use data-original-markdown if available (user edited or created)
        // 2. Use original formatting from the markdown file
        // 3. Fallback to plain text
        let taskLine;

        if (originalMarkdown) {
          // Use the stored original markdown - this preserves user edits
          taskLine = `${indent}- [${isChecked ? 'x' : ' '}] ${originalMarkdown}`;
        } else if (originalFormat) {
          // Use original formatting but update check status and indentation
          taskLine = `${indent}${originalFormat.listMarker} [${isChecked ? 'x' : ' '}] ${originalFormat.taskContent}`;
        } else {
          // Fallback to basic formatting
          taskLine = `${indent}- [${isChecked ? 'x' : ' '}] ${taskText}`;
        }

        // Add task ID as a comment if available
        if (taskId) {
          // Check if the line already has a task ID comment
          if (!taskLine.includes('<!-- task-id:')) {
            taskLine += ` <!-- task-id: ${taskId} -->`;
          }
        }

        updatedLines.push(taskLine);

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

              // Check if there's a task ID in the content
              let taskId = null;
              const idMatch = taskContent.match(/<!--\s*task-id:\s*([a-zA-Z0-9_]+)\s*-->/);
              if (idMatch) {
                taskId = idMatch[1];
              }

              // Get content without comments
              const contentWithoutComments = taskContent.split('<!--')[0].trim();

              // Store the raw markdown content with its formatting intact
              taskFormatting.set(contentWithoutComments, {
                indent,
                listMarker,
                checkStatus,
                taskContent: contentWithoutComments,
                raw: taskContent, // Store the raw markdown
                taskId // Store the task ID if found
              });

              // Also store a plain text version for better matching
              // This helps match the rendered HTML text back to the original markdown
              const plainTextKey = contentWithoutComments
                .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
                .replace(/__([^_]+)__/g, '$1')     // Remove bold with underscore
                .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
                .replace(/_([^_]+)_/g, '$1')       // Remove italic with underscore
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
                .replace(/`([^`]+)`/g, '$1')       // Remove code
                .trim();

              if (plainTextKey !== contentWithoutComments) {
                taskFormatting.set(plainTextKey, {
                  indent,
                  listMarker,
                  checkStatus,
                  taskContent: contentWithoutComments,
                  raw: taskContent, // Store the raw markdown
                  taskId // Store the task ID if found
                });
              }

              // Log task IDs for debugging
              if (taskId && j < i + 5) {
                console.log(`Found task with ID: ${taskId}, content: "${contentWithoutComments.substring(0, 30)}${contentWithoutComments.length > 30 ? '...' : ''}", indent: ${indent.length / 2}`);
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
    function addRemainingOriginalSections(lines, startIndex, updatedLines, processedHeaders, renamedColumns) {
      let skipSection = false;
      // Track original board names to handle duplicates
      const originalBoardNameCounts = new Map();

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];

        // Check if this is a header
        const headerMatch = line.match(/^##\s+(.+)$/);

        if (headerMatch) {
          // Get clean header text
          const headerText = headerMatch[1].trim();
          const cleanHeader = headerText
            .replace(/\s*\(Saving\.\.\.\)\s*/g, '')
            .replace(/\s*\(Saved\)\s*/g, '')
            .replace(/\s*\(Error saving\)\s*/g, '')
            .replace(/\+/g, '') // Remove + signs
            .replace(/\s*\(\d+\)\s*$/, ''); // Remove any trailing (number) from duplicate boards

          const headerKey = cleanHeader.toLowerCase();

          // Count occurrences of this board name in the original markdown
          originalBoardNameCounts.set(headerKey, (originalBoardNameCounts.get(headerKey) || 0) + 1);

          // Create a unique key for this board instance
          const originalKey = `${headerKey}-${originalBoardNameCounts.get(headerKey)}`;

          // Check if already processed
          if (processedHeaders.has(originalKey)) {
            skipSection = true;
            continue;
          }

          // Check if this column was renamed
          if (renamedColumns.has(headerKey)) {
            console.log(`Skipping original column "${cleanHeader}" because it was renamed to "${renamedColumns.get(headerKey)}"`);
            skipSection = true;
            continue;
          } else {
            skipSection = false;
          }
        } else {
          // This is not a header line
          // If we're currently skipping a section, check if this line indicates the end of that section
          if (skipSection) {
            // Check if this line is a task line (part of the kanban section we're skipping)
            const isTaskLine = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+/);
            const isEmpty = line.trim() === '';

            // If it's not a task line and not empty, this is regular content after the kanban section
            if (!isTaskLine && !isEmpty) {
              skipSection = false; // Stop skipping, this is regular content
            }
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
      // Generate a unique ID for this task
      const taskId = generateTaskId();

      // Create task container
      const taskContainer = document.createElement('li');
      taskContainer.className = 'task-list-item-container indent-0';
      taskContainer.setAttribute('data-indent-level', '0');
      taskContainer.setAttribute('data-task-id', taskId);
      taskContainer.setAttribute('data-is-new', 'true');
      taskContainer.style.listStyleType = 'none';
      taskContainer.setAttribute('draggable', 'true');

      // Store the original markdown text as a data attribute
      taskContainer.setAttribute('data-original-markdown', taskText);

      // Process markdown in task text
      const processedText = processMarkdown(taskText);

      // Create task content
      taskContainer.innerHTML = `
        <span class="task-list-item">
          <input type="checkbox" class="task-checkbox">
          <span class="task-text">${processedText}</span>
          <span class="save-state"></span>
        </span>
      `;

      // Store in the task ID map
      taskIdMap.set(taskId, taskContainer);

      // Add drag handle and action buttons
      addDragHandle(taskContainer);

      // Add drag events
      setupDragEvents(taskContainer);

      // Setup checkbox for newly created task
      setupCheckboxForTask(taskContainer);

      // Add to the beginning of the list
      if (taskList.firstChild) {
        taskList.insertBefore(taskContainer, taskList.firstChild);
      } else {
        taskList.appendChild(taskContainer);
      }

      console.log('New task created:', taskText, 'with ID:', taskId);
    }

    /**
     * Update checkbox indexes to integrate with tasklist-live.js
     */
    function updateCheckboxIndexes() {
      // We no longer need to update checkbox indexes since we're handling all kanban checkboxes ourselves
      console.log('Skipping checkbox index update - using custom handler for all kanban tasks');

      // Instead, make sure all kanban checkboxes don't have data-cb-index
      disableTasklistLiveForKanban();
    }

    /**
     * Setup checkbox for a task
     */
    function setupCheckboxForTask(taskContainer) {
      const checkbox = taskContainer.querySelector('input[type="checkbox"]');
      if (!checkbox) return;

      // Remove any existing data-cb-index to prevent tasklist-live.js from handling it
      if (checkbox.hasAttribute('data-cb-index')) {
        checkbox.removeAttribute('data-cb-index');
      }

      // Add click handler for the checkbox
      checkbox.addEventListener('click', taskCheckboxHandler);
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

    /**
     * Set up rename column buttons
     */
    function setupRenameColumnButtons() {
      const renameButtons = document.querySelectorAll('.rename-column-btn');
      console.log('Rename column buttons found:', renameButtons.length);

      renameButtons.forEach(button => {
        button.addEventListener('click', e => {
          e.preventDefault();

          // Find the column header and title
          const columnHeader = button.closest('.kanban-column-header');
          const columnTitle = columnHeader.querySelector('.column-title');

          if (!columnTitle) return;

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

          // Handle input events
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const newTitle = input.value.trim();

              if (newTitle && newTitle !== originalTitle) {
                // Check if the new name already exists
                const existingColumns = document.querySelectorAll('.kanban-column-header .column-title');
                let isDuplicate = false;

                existingColumns.forEach(col => {
                  if (col !== columnTitle && col.textContent.trim().toLowerCase() === newTitle.toLowerCase()) {
                    isDuplicate = true;
                    console.log(`Board name "${newTitle}" already exists, but will be allowed as duplicate`);
                  }
                });

                // If this is a duplicate, mark it as such for internal tracking
                if (isDuplicate) {
                  columnHeader.setAttribute('data-is-duplicate', 'true');
                } else {
                  columnHeader.removeAttribute('data-is-duplicate');
                }

                // Update the column title
                columnTitle.textContent = newTitle;

                // Save changes
                saveKanbanChanges(docPath);
              }

              // Restore display
              columnTitle.style.display = '';
              input.remove();
            } else if (e.key === 'Escape') {
              // Cancel on escape
              columnTitle.style.display = '';
              input.remove();
            }
          });

          // Also handle blur event to cancel
          input.addEventListener('blur', () => {
            // Small delay to allow for Enter key processing
            setTimeout(() => {
              if (input.parentNode) {
                columnTitle.style.display = '';
                input.remove();
              }
            }, 200);
          });
        });
      });
    }

    /**
     * Set up add board button
     */
    function setupAddBoardButton() {
      const addBoardBtn = document.querySelector('.add-board-btn');
      if (!addBoardBtn) return;

      console.log('Add board button found');

      // Get the add board dialog elements
      const addBoardDialog = document.querySelector('.add-board-dialog');
      const addBoardForm = document.querySelector('.add-board-form');
      const boardNameInput = document.querySelector('#boardName');
      const closeDialogBtn = addBoardDialog.querySelector('.close-dialog');
      const cancelBtn = addBoardDialog.querySelector('.cancel-dialog');

      // Show dialog when add board button is clicked
      addBoardBtn.addEventListener('click', e => {
        e.preventDefault();

        // Reset and show the dialog
        boardNameInput.value = '';
        addBoardDialog.classList.add('active');

        // Focus the input field
        setTimeout(() => {
          boardNameInput.focus();
        }, 100);
      });

      // Handle form submission
      addBoardForm.addEventListener('submit', async e => {
        e.preventDefault();

        const boardName = boardNameInput.value.trim();
        if (boardName) {
          // Hide dialog
          addBoardDialog.classList.remove('active');

          // Create new board
          await addNewBoard(boardName, docPath);
        }
      });

      // Close dialog when close button is clicked
      if (closeDialogBtn) {
        closeDialogBtn.addEventListener('click', () => {
          addBoardDialog.classList.remove('active');
        });
      }

      // Close dialog when cancel button is clicked
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          addBoardDialog.classList.remove('active');
        });
      }

      // Close dialog when Escape key is pressed
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && addBoardDialog.classList.contains('active')) {
          addBoardDialog.classList.remove('active');
        }
      });
    }

    /**
     * Add a new board to the kanban
     */
    async function addNewBoard(boardName, docPath) {
      // Check if the board name already exists
      const existingColumns = document.querySelectorAll('.kanban-column-header .column-title');
      let isDuplicate = false;

      existingColumns.forEach(column => {
        if (column.textContent.trim().toLowerCase() === boardName.toLowerCase()) {
          isDuplicate = true;
          console.log(`Board name "${boardName}" already exists, but will be allowed as duplicate`);
        }
      });

      // Create the new column
      const newColumn = document.createElement('div');
      newColumn.className = 'kanban-column';

      // Create column header
      const columnHeader = document.createElement('div');
      columnHeader.className = 'kanban-column-header';

      // Create column title
      const columnTitle = document.createElement('span');
      columnTitle.className = 'column-title';
      columnTitle.textContent = boardName;

      // If this is a duplicate, mark it as such for internal tracking
      if (isDuplicate) {
        columnHeader.setAttribute('data-is-duplicate', 'true');
      }

      // Create status container
      const statusContainer = document.createElement('span');
      statusContainer.className = 'kanban-status-container';

      // Create rename button
      const renameBtn = document.createElement('button');
      renameBtn.className = 'rename-column-btn editor-admin-only';
      renameBtn.title = 'Rename column';
      renameBtn.innerHTML = '<i class="fa fa-pencil"></i>';
      renameBtn.addEventListener('click', e => {
        e.preventDefault();

        // Find the column title
        const columnTitle = columnHeader.querySelector('.column-title');
        if (!columnTitle) return;

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

        // Handle input events
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const newTitle = input.value.trim();

            if (newTitle && newTitle !== originalTitle) {
              // Update the column title
              columnTitle.textContent = newTitle;

              // Save changes
              saveKanbanChanges(docPath);
            }

            // Restore display
            columnTitle.style.display = '';
            input.remove();
          } else if (e.key === 'Escape') {
            // Cancel on escape
            columnTitle.style.display = '';
            input.remove();
          }
        });

        // Also handle blur event to cancel
        input.addEventListener('blur', () => {
          // Small delay to allow for Enter key processing
          setTimeout(() => {
            if (input.parentNode) {
              columnTitle.style.display = '';
              input.remove();
            }
          }, 200);
        });
      });

      // Create add task button
      const addTaskBtn = document.createElement('button');
      addTaskBtn.className = 'add-task-btn editor-admin-only';
      addTaskBtn.title = 'Add task';
      addTaskBtn.innerHTML = '<i class="fa fa-plus"></i>';
      addTaskBtn.addEventListener('click', e => {
        e.preventDefault();
        addTaskToColumn(newColumn);
      });

      // Assemble column header
      columnHeader.appendChild(columnTitle);
      columnHeader.appendChild(statusContainer);
      columnHeader.appendChild(renameBtn);
      columnHeader.appendChild(addTaskBtn);

      // Create column content
      const columnContent = document.createElement('div');
      columnContent.className = 'kanban-column-content';

      // Create task list
      const taskList = document.createElement('ul');
      taskList.className = 'task-list';

      // Add task list to column content
      columnContent.appendChild(taskList);

      // Add header and content to column
      newColumn.appendChild(columnHeader);
      newColumn.appendChild(columnContent);

      // Add column to board
      const kanbanBoard = document.querySelector('.kanban-board');
      kanbanBoard.appendChild(newColumn);

      // Make the column a drop target
      setupColumnDropTargets();

      // Save changes
      await saveKanbanChanges(docPath);

      console.log('New board added:', boardName);
    }

    /**
     * Add a task to a column
     */
    function addTaskToColumn(column) {
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
    }
  }
})();