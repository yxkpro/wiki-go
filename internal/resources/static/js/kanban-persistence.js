// kanban-persistence.js - Save/load operations
class KanbanPersistenceManager {
  constructor(core) {
    this.core = core;
    this.docPath = core.docPath;

    // Track processed headers to avoid duplicates
    this.processedHeaders = new Set();
    this.processedBoards = new Set();

    // Maps to store original formatting
    this.originalSectionHeaders = new Map();
    this.originalBoardHeaders = new Map();
    this.originalTaskFormatting = new Map();

    // Save state tracking
    this.isSaving = false;
    this.saveQueue = [];
  }

  init() {
    console.log('Initializing KanbanPersistenceManager');

    // Pre-load original markdown for better performance
    this.preloadOriginalMarkdown();

    console.log('KanbanPersistenceManager initialized');
  }

  /**
   * Pre-load the original markdown to cache formatting information
   */
  async preloadOriginalMarkdown() {
    try {
      const response = await fetch(`/api/source/${this.docPath}`);
      if (response.ok) {
        const markdown = await response.text();
        this.cacheOriginalFormatting(markdown);
        console.log('Original markdown cached for formatting preservation');
      }
    } catch (error) {
      console.warn('Could not preload original markdown:', error);
    }
  }

  /**
   * Cache original formatting from markdown
   */
  cacheOriginalFormatting(markdown) {
    const lines = markdown.split(/\r?\n/);

    // Find frontmatter end
    const frontmatterEndIndex = lines.findIndex((line, index) =>
      index > 0 && line.trim() === '---' && lines[0].trim() === '---'
    );

    if (frontmatterEndIndex > 0) {
      this.collectOriginalFormatting(lines, frontmatterEndIndex, this.originalBoardHeaders, this.originalSectionHeaders, this.originalTaskFormatting);
    }
  }

  /**
   * Save kanban changes to the server
   */
  async saveKanbanChanges() {
    // Prevent multiple simultaneous saves
    if (this.isSaving) {
      console.log('Save already in progress, queuing request');
      return new Promise((resolve, reject) => {
        this.saveQueue.push({ resolve, reject });
      });
    }

    this.isSaving = true;

    // Show saving indicators on all columns
    if (this.core.columnManager) {
      this.core.columnManager.showColumnStatus('saving', '(Saving...)');
    }

    try {
      console.log('Starting kanban save operation');

      // 1. Fetch current markdown
      const srcResp = await fetch(`/api/source/${this.docPath}`);
      if (!srcResp.ok) throw new Error('source fetch failed');
      const markdown = await srcResp.text();

      // 2. Build updated markdown based on the current DOM structure
      const updatedMarkdown = this.buildUpdatedMarkdown(markdown);

      // 3. Save updated markdown
      const saveResp = await fetch(`/api/save/${this.docPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/markdown' },
        body: updatedMarkdown,
      });

      if (!saveResp.ok) throw new Error('save failed');

      // 4. After successful save, update task tracking
      this.updateTaskTrackingAfterSave();

      // Show success indicator
      if (this.core.columnManager) {
        this.core.columnManager.showColumnStatus('saved', '(Saved)', 2000);
      }

      console.log('Kanban save completed successfully');

      // Process any queued save requests
      this.processQueuedSaves(null);

    } catch (err) {
      console.error('Error saving kanban changes:', err);

      // Show error indicator
      if (this.core.columnManager) {
        this.core.columnManager.showColumnStatus('error', '(Error saving)', 3000);
      }

      // Process any queued save requests with error
      this.processQueuedSaves(err);

      throw err;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Process queued save requests
   */
  processQueuedSaves(error) {
    const queue = [...this.saveQueue];
    this.saveQueue = [];

    queue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  }

  /**
   * Update task tracking after a successful save
   */
  updateTaskTrackingAfterSave() {
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
   * Build updated markdown based on the current DOM structure
   */
  buildUpdatedMarkdown(originalMarkdown) {
    console.log('Building updated markdown');

    // Split the original markdown into lines
    const lines = originalMarkdown.split(/\r?\n/);

    // Extract frontmatter and content before the first kanban section
    const frontmatterEndIndex = lines.findIndex((line, index) =>
      index > 0 && line.trim() === '---' && lines[0].trim() === '---'
    );

    // Reset processed headers for this save operation
    this.processedHeaders.clear();
    this.processedBoards.clear();

    // Get column information from the column manager
    const renamedColumns = this.core.columnManager ? this.core.columnManager.getRenamedColumns() : new Map();
    const boardNameCounts = this.core.columnManager ? this.core.columnManager.getBoardNameCounts() : new Map();

    // Collect original formatting if not already cached
    if (this.originalSectionHeaders.size === 0) {
      this.collectOriginalFormatting(lines, frontmatterEndIndex, this.originalBoardHeaders, this.originalSectionHeaders, this.originalTaskFormatting);
    }

    // Now build the updated markdown
    let currentIndex = frontmatterEndIndex + 1;

    // Skip non-kanban content at the beginning
    while (currentIndex < lines.length && !lines[currentIndex].match(/^####\s+/)) {
      currentIndex++;
    }

    // Prepare the updated markdown
    const updatedLines = lines.slice(0, currentIndex);

    // Process each kanban container
    const kanbanContainers = document.querySelectorAll('.kanban-container');
    kanbanContainers.forEach((container, containerIndex) => {
      console.log(`Processing kanban container ${containerIndex + 1}`);
      this.processKanbanContainer(container, updatedLines, renamedColumns, boardNameCounts);
    });

    // Add any sections from the original that weren't processed
    this.addRemainingOriginalSections(lines, currentIndex, updatedLines, renamedColumns);

    // Log the first few lines of the updated markdown for debugging
    console.log('Updated markdown first few lines:', updatedLines.slice(0, Math.min(10, updatedLines.length)).join('\n'));

    return updatedLines.join('\n');
  }

  /**
   * Process a single kanban container
   */
  processKanbanContainer(container, updatedLines, renamedColumns, boardNameCounts) {
    // Reset processed headers for each kanban container to allow duplicate column names across boards
    this.processedHeaders.clear();

    // Get board title if it exists
    const boardTitleElement = container.querySelector('.kanban-board-title');
    let boardTitle = boardTitleElement ? boardTitleElement.textContent.trim() : '';

    // Add board title if it exists
    if (boardTitle) {
      const boardKey = boardTitle.toLowerCase();

      // Skip if already processed
      if (this.processedBoards.has(boardKey)) {
        console.log(`Board ${boardTitle} already processed, skipping`);
        return;
      }

      // Mark as processed
      this.processedBoards.add(boardKey);

      // Use original board header format if available
      const originalBoardHeader = this.originalBoardHeaders.get(boardKey) || boardTitle;
      updatedLines.push(`#### ${originalBoardHeader}`);
      updatedLines.push(''); // Add empty line after board title
    }

    // Process each column in this container
    const columns = container.querySelectorAll('.kanban-column');
    columns.forEach((column, columnIndex) => {
      this.processKanbanColumn(column, updatedLines, renamedColumns, boardNameCounts);
    });

    // Add empty line after each board
    updatedLines.push('');
  }

  /**
   * Process a single kanban column
   */
  processKanbanColumn(column, updatedLines, renamedColumns, boardNameCounts) {
    // Get the column header text without status indicators
    const header = column.querySelector('.kanban-column-header');
    if (!header) return;

    // Extract the column title from the title span
    const titleSpan = header.querySelector('.column-title');
    let headerText = titleSpan ? titleSpan.textContent.trim() : header.textContent.trim();

    // Clean up any status indicators
    headerText = this.cleanHeaderText(headerText);

    console.log(`Processing column: ${headerText}`);

    // Check if this column was renamed
    const originalTitle = header.getAttribute('data-original-title');
    if (originalTitle && originalTitle !== headerText) {
      console.log(`Column was renamed from "${originalTitle}" to "${headerText}"`);
      // Mark the original title as processed to avoid duplication
      this.processedHeaders.add(originalTitle.toLowerCase());
    }

    // Handle duplicate column names
    const headerKey = headerText.toLowerCase();
    const currentCount = boardNameCounts.get(headerKey) || 1;

    // Create unique markdown header for duplicates
    let markdownHeaderText = headerText;
    if (currentCount > 1) {
      markdownHeaderText = `${headerText} (${currentCount})`;
      console.log(`Handling duplicate column name: "${headerText}" -> "${markdownHeaderText}"`);
    }

    // Skip if already processed
    const processedKey = `${headerKey}-${currentCount}`;
    if (this.processedHeaders.has(processedKey)) {
      console.log(`Column ${headerText} already processed, skipping`);
      return;
    }

    // Mark as processed
    this.processedHeaders.add(processedKey);

    // Use original header format if available, otherwise use our generated one
    const originalHeader = this.originalSectionHeaders.get(headerKey) || markdownHeaderText;
    updatedLines.push(`##### ${originalHeader}`);

    // Process each task in this column
    this.processColumnTasks(column, updatedLines);

    // Add empty line after each column
    updatedLines.push('');
  }

  /**
   * Clean header text of status indicators and symbols
   */
  cleanHeaderText(headerText) {
    return headerText
      .replace(/\s*\(Saving\.\.\.\)\s*/g, '')
      .replace(/\s*\(Saved\)\s*/g, '')
      .replace(/\s*\(Error saving\)\s*/g, '')
      .replace(/\+/g, ''); // Remove + signs from add button
  }

  /**
   * Process all tasks in a column and add them to the updated markdown
   */
  processColumnTasks(column, updatedLines) {
    const tasks = column.querySelectorAll('.task-list-item-container');
    console.log(`Processing ${tasks.length} tasks in column`);

    if (tasks.length === 0) return;

    // Process tasks in the exact DOM order they appear
    // This preserves the hierarchy and ordering after drag and drop
    tasks.forEach((task, index) => {
      const taskLine = this.processSingleTask(task, index, tasks.length);
      if (taskLine) {
        updatedLines.push(taskLine);
      }
    });
  }

  /**
   * Process a single task and return its markdown line
   */
  processSingleTask(task, index, totalTasks) {
    const taskTextElement = task.querySelector('.task-text');
    if (!taskTextElement) return null;

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
    const originalFormat = this.originalTaskFormatting.get(plainTextKey);

    // Log task info for debugging
    if (index === 0 || index === totalTasks - 1 || indentLevel > 0) {
      console.log(`Task ${index + 1}/${totalTasks}: "${taskText}" (indent: ${indentLevel}, checked: ${isChecked}, id: ${taskId || 'none'})`);
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

    return taskLine;
  }

  /**
   * Collect original formatting from the markdown
   */
  collectOriginalFormatting(lines, startIndex, boardHeaders, sectionHeaders, taskFormatting) {
    let i = startIndex + 1;
    let currentBoard = null;

    while (i < lines.length) {
      // Check for H4 board headers
      const boardMatch = lines[i].match(/^####\s+(.+)$/);
      if (boardMatch) {
        const boardTitle = boardMatch[1].trim();
        const cleanBoardTitle = this.cleanHeaderText(boardTitle);
        currentBoard = cleanBoardTitle.toLowerCase();
        boardHeaders.set(currentBoard, boardTitle);
        i++;
        continue;
      }

      // Check for H5 column headers
      const headerMatch = lines[i].match(/^#####\s+(.+)$/);
      if (headerMatch) {
        const sectionTitle = headerMatch[1].trim();
        // Clean the title of any status indicators and + signs
        const cleanTitle = this.cleanHeaderText(sectionTitle);

        // Check if the next lines contain task items
        let hasTaskItems = false;
        let j = i + 1;
        while (j < lines.length && !lines[j].match(/^#{4,5}\s+/)) {
          const taskMatch = lines[j].match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.+)$/);
          if (taskMatch) {
            hasTaskItems = true;
            this.processOriginalTaskFormatting(taskMatch, taskFormatting, j, i);
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
   * Process original task formatting from regex match
   */
  processOriginalTaskFormatting(taskMatch, taskFormatting, lineIndex, sectionStart) {
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
    const plainTextKey = this.normalizeTaskContent(contentWithoutComments);

    if (plainTextKey !== contentWithoutComments) {
      taskFormatting.set(plainTextKey, {
        indent,
        listMarker,
        checkStatus,
        taskContent: contentWithoutComments,
        raw: taskContent,
        taskId
      });
    }

    // Log task IDs for debugging (only first few)
    if (taskId && lineIndex < sectionStart + 5) {
      console.log(`Found task with ID: ${taskId}, content: "${contentWithoutComments.substring(0, 30)}${contentWithoutComments.length > 30 ? '...' : ''}", indent: ${indent.length / 2}`);
    }
  }

  /**
   * Normalize task content for better matching
   */
  normalizeTaskContent(content) {
    return content
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/__([^_]+)__/g, '$1')     // Remove bold with underscore
      .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
      .replace(/_([^_]+)_/g, '$1')       // Remove italic with underscore
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/`([^`]+)`/g, '$1')       // Remove code
      .trim();
  }

  /**
   * Add remaining original sections that weren't processed
   */
  addRemainingOriginalSections(lines, startIndex, updatedLines, renamedColumns) {
    let skipSection = false;
    let skipBoard = false;
    // Track original board names to handle duplicates
    const originalBoardNameCounts = new Map();
    const originalColumnNameCounts = new Map();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Check if this is a board header (H4)
      const boardMatch = line.match(/^####\s+(.+)$/);
      if (boardMatch) {
        const boardText = boardMatch[1].trim();
        const cleanBoard = this.cleanHeaderText(boardText);
        const boardKey = cleanBoard.toLowerCase();

        // Count occurrences of this board name in the original markdown
        originalBoardNameCounts.set(boardKey, (originalBoardNameCounts.get(boardKey) || 0) + 1);

        // Check if already processed
        if (this.processedBoards.has(boardKey)) {
          skipBoard = true;
          skipSection = true;
          continue;
        } else {
          skipBoard = false;
          skipSection = false;
        }
      }

      // Check if this is a column header (H5)
      const headerMatch = line.match(/^#####\s+(.+)$/);
      if (headerMatch) {
        // Get clean header text
        const headerText = headerMatch[1].trim();
        const cleanHeader = this.cleanHeaderText(headerText)
          .replace(/\s*\(\d+\)\s*$/, ''); // Remove any trailing (number) from duplicate columns

        const headerKey = cleanHeader.toLowerCase();

        // Count occurrences of this column name in the original markdown
        originalColumnNameCounts.set(headerKey, (originalColumnNameCounts.get(headerKey) || 0) + 1);

        // Create a unique key for this column instance
        const originalKey = `${headerKey}-${originalColumnNameCounts.get(headerKey)}`;

        // Check if already processed
        if (this.processedHeaders.has(originalKey)) {
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
        if (skipSection || skipBoard) {
          // Check if this line is a task line (part of the kanban section we're skipping)
          const isTaskLine = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+/);
          const isEmpty = line.trim() === '';

          // If it's not a task line and not empty, this is regular content after the kanban section
          if (!isTaskLine && !isEmpty && !line.match(/^#{4,5}\s+/)) {
            skipSection = false; // Stop skipping, this is regular content
            skipBoard = false;
          }
        }
      }

      // Add line if not skipping
      if (!skipSection && !skipBoard) {
        updatedLines.push(line);
      }
    }
  }

  /**
   * Get original task formatting for a given task
   */
  getOriginalTaskFormatting(taskText) {
    const plainTextKey = taskText.replace(/\s+/g, ' ').trim();
    return this.originalTaskFormatting.get(plainTextKey) ||
           this.originalTaskFormatting.get(this.normalizeTaskContent(plainTextKey));
  }

  /**
   * Get original section header for a given title
   */
  getOriginalSectionHeader(title) {
    return this.originalSectionHeaders.get(title.toLowerCase());
  }

  /**
   * Clear cached formatting (useful for refresh)
   */
  clearCache() {
    this.originalSectionHeaders.clear();
    this.originalTaskFormatting.clear();
    this.processedHeaders.clear();
    this.processedBoards.clear();
    console.log('Persistence cache cleared');
  }

  /**
   * Force refresh of cached formatting
   */
  async refreshCache() {
    this.clearCache();
    await this.preloadOriginalMarkdown();
  }

  /**
   * Check if a save operation is currently in progress
   */
  isSaveInProgress() {
    return this.isSaving;
  }

  /**
   * Get the current save queue length
   */
  getSaveQueueLength() {
    return this.saveQueue.length;
  }

  /**
   * Cleanup and destroy the persistence manager
   */
  destroy() {
    console.log('Destroying KanbanPersistenceManager');

    // Clear all cached data
    this.clearCache();

    // Clear save queue
    this.saveQueue = [];

    // Reset save state
    this.isSaving = false;

    // Clear core reference
    this.core = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KanbanPersistenceManager;
}