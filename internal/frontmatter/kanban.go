package frontmatter

import (
	"bytes"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

// KanbanColumn represents a column in the kanban board
type KanbanColumn struct {
	Title string
	Tasks []KanbanTask
}

// KanbanTask represents a task in the kanban board
type KanbanTask struct {
	Text        string
	Checked     bool
	HTMLText    string // Rendered HTML text of the task
	IndentLevel int    // Indentation level for nested tasks
}

// Store kanban sections until after goldext processing
var (
	kanbanSections     = make(map[string]KanbanSection)
	kanbanSectionCount = 0
	kanbanMutex        sync.Mutex
)

// KanbanSection represents a kanban board section (H2 + tasks)
type KanbanSection struct {
	Title string
	Tasks []KanbanTask
}

// PreprocessorFunc defines a function that transforms markdown before rendering
type PreprocessorFunc func(markdown string, docPath string) string

// PostProcessorFunc defines a function that processes HTML after goldmark rendering
type PostProcessorFunc func(html string) string

// RenderKanban converts markdown content to a kanban board HTML with full goldext support
func RenderKanban(content string) string {
	// For now, use the basic implementation to avoid circular dependency
	// This will be enhanced when called from the main markdown processing
	return RenderKanbanBasic(content)
}

// RenderKanbanWithProcessors converts markdown content to a kanban board HTML with full goldext support
// This function accepts preprocessor and postprocessor functions to avoid circular dependencies
func RenderKanbanWithProcessors(content string, preprocessors []PreprocessorFunc, postProcessors []PostProcessorFunc) string {
	// Apply kanban-aware preprocessing to protect kanban structure while allowing goldext processing
	processedContent := kanbanAwarePreprocess(content)

	// Apply all provided preprocessors to the content
	for _, preprocessor := range preprocessors {
		if preprocessor != nil {
			processedContent = preprocessor(processedContent, "")
		}
	}

	// Render the processed content with goldmark
	renderedHTML := renderWithGoldmark(processedContent)

	// Apply post-processors
	for _, postProcessor := range postProcessors {
		if postProcessor != nil {
			renderedHTML = postProcessor(renderedHTML)
		}
	}

	// Restore kanban sections and build final kanban HTML
	return restoreKanbanSections(renderedHTML, preprocessors)
}

// RenderKanbanBasic provides basic kanban rendering without full goldext support (fallback)
func RenderKanbanBasic(content string) string {
	// Extract header content and parse columns
	headerContent, columns := parseKanbanContentBasic(content)

	// Generate HTML for the kanban board
	var html strings.Builder

	// Add header content if it exists
	if headerContent != "" {
		html.WriteString(headerContent)
	}

	// Add kanban-container class to make it selectable by the drag-and-drop script
	html.WriteString(`<div class="kanban-container">`)
	html.WriteString(`<div class="kanban-board">`)

	for _, column := range columns {
		html.WriteString(fmt.Sprintf(`<div class="kanban-column">
			<div class="kanban-column-header">
				<span class="column-title">%s</span>
				<span class="kanban-status-container"></span>
				<button class="rename-column-btn editor-admin-only" title="Rename column"><i class="fa fa-pencil"></i></button>
				<button class="add-task-btn editor-admin-only" title="Add task"><i class="fa fa-plus"></i></button>
			</div>
			<div class="kanban-column-content">`, column.Title))

		// Add a task list for each column
		html.WriteString(`<ul class="task-list">`)

		for _, task := range column.Tasks {
			checkedAttr := ""
			if task.Checked {
				checkedAttr = "checked"
			}

			// Add indentation level attribute if needed
			indentAttr := ""
			if task.IndentLevel > 0 {
				indentAttr = ` data-indent-level="` + strconv.Itoa(task.IndentLevel) + `"`
			}

			// Use the same structure as the regular task list items
			// This ensures compatibility with tasklist-live.js
			html.WriteString(fmt.Sprintf(`<li class="task-list-item-container" style="list-style-type: none;"%s>
				<span class="task-list-item">
					<input type="checkbox" class="task-checkbox" %s disabled>
					<span class="task-text">%s</span>
					<span class="save-state"></span>
				</span>
			</li>`, indentAttr, checkedAttr, task.HTMLText))
		}

		html.WriteString(`</ul></div></div>`)
	}

	html.WriteString(`</div></div>`) // Close both kanban-board and kanban-container

	// Add the "Add Board" button
	html.WriteString(`<div class="add-board-container">
		<button class="add-board-btn editor-admin-only" title="Add new board">
			<i class="fa fa-plus"></i> Add Board
		</button>
	</div>`)

	return html.String()
}

// kanbanAwarePreprocess protects kanban structure while allowing goldext processing of other content
func kanbanAwarePreprocess(content string) string {
	kanbanMutex.Lock()
	defer kanbanMutex.Unlock()

	// Reset storage
	kanbanSections = make(map[string]KanbanSection)
	kanbanSectionCount = 0

	lines := strings.Split(content, "\n")
	var result []string

	// Regular expressions
	h2Regex := regexp.MustCompile(`^#{2}\s+(.+)$`)
	taskRegex := regexp.MustCompile(`^\s*[-*+]\s+\[([ xX])\]\s+(.+)$`)

	// State tracking
	inKanbanSection := false
	currentSection := KanbanSection{}
	nonKanbanLines := []string{}

	for _, line := range lines {
		// Check for H2 heading (kanban column) - only H2, not H3
		if h2Match := h2Regex.FindStringSubmatch(line); h2Match != nil {
			// Save any accumulated non-kanban content
			if len(nonKanbanLines) > 0 {
				result = append(result, nonKanbanLines...)
				nonKanbanLines = []string{}
			}

			// End previous kanban section if any
			if inKanbanSection {
				saveKanbanSection(currentSection, &result)
			}

			// Start new kanban section
			inKanbanSection = true
			currentSection = KanbanSection{
				Title: h2Match[1],
				Tasks: []KanbanTask{},
			}
			continue
		}

		if inKanbanSection {
			// Check if this is a task line
			trimmedLine := strings.TrimSpace(line)
			indent := line[:len(line)-len(trimmedLine)]

			// Calculate indentation level
			indentLevel := len(indent) / 2
			if indentLevel == 0 && len(indent) > 0 {
				indentLevel = 1 // Handle tab indentation
			}

			if taskMatch := taskRegex.FindStringSubmatch(trimmedLine); taskMatch != nil {
				// This is a task line - add to current section
				isChecked := taskMatch[1] == "x" || taskMatch[1] == "X"
				taskText := taskMatch[2]

				currentSection.Tasks = append(currentSection.Tasks, KanbanTask{
					Text:        taskText,
					Checked:     isChecked,
					HTMLText:    taskText, // Use raw text for basic fallback
					IndentLevel: indentLevel,
				})
				continue
			} else if trimmedLine == "" {
				// Empty line in kanban section - continue
				continue
			} else {
				// Non-task line in kanban section - end the section and treat as regular content
				saveKanbanSection(currentSection, &result)
				inKanbanSection = false
				nonKanbanLines = append(nonKanbanLines, line)
			}
		} else {
			// Regular content line
			nonKanbanLines = append(nonKanbanLines, line)
		}
	}

	// Handle remaining content
	if inKanbanSection {
		saveKanbanSection(currentSection, &result)
	}
	if len(nonKanbanLines) > 0 {
		result = append(result, nonKanbanLines...)
	}

	return strings.Join(result, "\n")
}

// saveKanbanSection saves a kanban section and adds a placeholder to the result
func saveKanbanSection(section KanbanSection, result *[]string) {
	kanbanSectionCount++
	id := fmt.Sprintf("KANBAN_SECTION_%d", kanbanSectionCount)
	kanbanSections[id] = section

	// Add placeholder that won't be processed by goldext
	placeholder := fmt.Sprintf("<!-- %s -->", id)
	*result = append(*result, placeholder)
}

// renderWithGoldmark renders the processed content using goldmark
func renderWithGoldmark(content string) string {
	// Configure Goldmark with all needed extensions (same as regular markdown processing)
	markdown := goldmark.New(
		goldmark.WithExtensions(
			extension.Table,
			extension.Strikethrough,
			extension.Linkify,
			extension.Footnote,
			extension.DefinitionList,
			extension.GFM,
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
			parser.WithAttribute(),
		),
		goldmark.WithRendererOptions(
			html.WithUnsafe(),
			html.WithHardWraps(),
		),
	)

	var buf bytes.Buffer
	if err := markdown.Convert([]byte(content), &buf); err != nil {
		return "<p>Error rendering markdown: " + err.Error() + "</p>"
	}

	return buf.String()
}

// restoreKanbanSections replaces placeholders with kanban HTML and builds the final result
func restoreKanbanSections(htmlContent string, preprocessors []PreprocessorFunc) string {
	kanbanMutex.Lock()
	defer kanbanMutex.Unlock()

	// Split content by kanban section placeholders
	var finalHTML strings.Builder
	var columns []KanbanColumn

	// Process the HTML content to find placeholders and build kanban structure
	lines := strings.Split(htmlContent, "\n")
	var headerContent []string
	var footerContent []string
	var foundFirstKanban bool
	var foundLastKanban bool

	for i, line := range lines {
		// Check if this line contains a kanban placeholder
		if strings.Contains(line, "<!-- KANBAN_SECTION_") {
			// Extract the placeholder ID
			re := regexp.MustCompile(`<!-- (KANBAN_SECTION_\d+) -->`)
			matches := re.FindStringSubmatch(line)
			if len(matches) > 1 {
				id := matches[1]
				if section, exists := kanbanSections[id]; exists {
					if !foundFirstKanban {
						foundFirstKanban = true
					}

					// Process task text with full goldext support
					var processedTasks []KanbanTask
					for _, task := range section.Tasks {
						processedHTML := applyProcessorsToTaskText(task.Text, preprocessors)
						processedTasks = append(processedTasks, KanbanTask{
							Text:        task.Text,
							Checked:     task.Checked,
							HTMLText:    processedHTML,
							IndentLevel: task.IndentLevel,
						})
					}

					// Add to columns
					columns = append(columns, KanbanColumn{
						Title: section.Title,
						Tasks: processedTasks,
					})

					// Check if this is the last kanban section
					hasMoreKanbanSections := false
					for j := i + 1; j < len(lines); j++ {
						if strings.Contains(lines[j], "<!-- KANBAN_SECTION_") {
							hasMoreKanbanSections = true
							break
						}
					}
					if !hasMoreKanbanSections {
						foundLastKanban = true
					}
				}
			}
		} else if !foundFirstKanban {
			// This is header content (before first kanban section)
			headerContent = append(headerContent, line)
		} else if foundLastKanban {
			// This is footer content (after last kanban section)
			footerContent = append(footerContent, line)
		}
	}

	// Build the final kanban HTML
	if len(headerContent) > 0 {
		finalHTML.WriteString(strings.Join(headerContent, "\n"))
		finalHTML.WriteString("\n")
	}

	// Add kanban board structure
	finalHTML.WriteString(`<div class="kanban-container">`)
	finalHTML.WriteString(`<div class="kanban-board">`)

	for _, column := range columns {
		finalHTML.WriteString(fmt.Sprintf(`<div class="kanban-column">
			<div class="kanban-column-header">
				<span class="column-title">%s</span>
				<span class="kanban-status-container"></span>
				<button class="rename-column-btn editor-admin-only" title="Rename column"><i class="fa fa-pencil"></i></button>
				<button class="add-task-btn editor-admin-only" title="Add task"><i class="fa fa-plus"></i></button>
			</div>
			<div class="kanban-column-content">`, column.Title))

		finalHTML.WriteString(`<ul class="task-list">`)

		for _, task := range column.Tasks {
			checkedAttr := ""
			if task.Checked {
				checkedAttr = "checked"
			}

			indentAttr := ""
			if task.IndentLevel > 0 {
				indentAttr = ` data-indent-level="` + strconv.Itoa(task.IndentLevel) + `"`
			}

			finalHTML.WriteString(fmt.Sprintf(`<li class="task-list-item-container" style="list-style-type: none;"%s>
				<span class="task-list-item">
					<input type="checkbox" class="task-checkbox" %s disabled>
					<span class="task-text">%s</span>
					<span class="save-state"></span>
				</span>
			</li>`, indentAttr, checkedAttr, task.HTMLText))
		}

		finalHTML.WriteString(`</ul></div></div>`)
	}

	finalHTML.WriteString(`</div></div>`)

	// Add the "Add Board" button
	finalHTML.WriteString(`<div class="add-board-container">
		<button class="add-board-btn editor-admin-only" title="Add new board">
			<i class="fa fa-plus"></i> Add Board
		</button>
	</div>`)

	// Add footer content (content after kanban sections)
	if len(footerContent) > 0 {
		finalHTML.WriteString("\n")
		finalHTML.WriteString(strings.Join(footerContent, "\n"))
	}

	return finalHTML.String()
}

// applyProcessorsToTaskText applies preprocessors to individual task text
func applyProcessorsToTaskText(taskText string, preprocessors []PreprocessorFunc) string {
	// Apply preprocessors to task text
	processed := taskText
	for _, preprocessor := range preprocessors {
		if preprocessor != nil {
			processed = preprocessor(processed, "")
		}
	}

	// Render with goldmark for inline processing
	markdown := goldmark.New(
		goldmark.WithExtensions(
			extension.Strikethrough,
			extension.Linkify,
			extension.GFM,
		),
		goldmark.WithRendererOptions(
			html.WithUnsafe(),
		),
	)

	var buf bytes.Buffer
	if err := markdown.Convert([]byte(processed), &buf); err != nil {
		return taskText // Fallback to original text
	}

	// Remove wrapping <p> tags for inline content
	result := buf.String()
	result = strings.TrimPrefix(result, "<p>")
	result = strings.TrimSuffix(result, "</p>\n")
	result = strings.TrimSuffix(result, "</p>")

	return result
}

// parseKanbanContentBasic extracts header content and parses kanban columns (basic implementation)
func parseKanbanContentBasic(content string) (string, []KanbanColumn) {
	// Split content by lines
	lines := strings.Split(content, "\n")

	// Regular expressions for headings and tasks - only H2 headers for kanban columns
	headingRegex := regexp.MustCompile(`^#{2}\s+(.+)$`)
	taskRegex := regexp.MustCompile(`^\s*[-*+]\s+\[([ xX])\]\s+(.+)$`)

	var columns []KanbanColumn
	var currentColumn *KanbanColumn
	var headerLines []string
	var foundFirstColumn bool

	for _, line := range lines {
		// Check if this line is a H2 heading (column title) - only H2, not H3
		if headingMatch := headingRegex.FindStringSubmatch(line); headingMatch != nil {
			// We found a column heading
			foundFirstColumn = true

			// If we found a heading, start a new column
			if currentColumn != nil {
				columns = append(columns, *currentColumn)
			}
			currentColumn = &KanbanColumn{
				Title: headingMatch[1],
				Tasks: []KanbanTask{},
			}
		} else if foundFirstColumn && currentColumn != nil {
			// Check if this is a task line
			trimmedLine := strings.TrimSpace(line)
			indent := line[:len(line)-len(trimmedLine)]

			// Calculate indentation level
			indentLevel := len(indent) / 2
			if indentLevel == 0 && len(indent) > 0 {
				indentLevel = 1 // Handle tab indentation
			}

			if taskMatch := taskRegex.FindStringSubmatch(trimmedLine); taskMatch != nil {
				// This is a task line
				isChecked := taskMatch[1] == "x" || taskMatch[1] == "X"
				taskText := taskMatch[2]

				// Process task text for basic markdown formatting
				htmlText := processInlineFormattingBasic(taskText)

				// Add the task to the current column
				currentColumn.Tasks = append(currentColumn.Tasks, KanbanTask{
					Text:        taskText,
					Checked:     isChecked,
					HTMLText:    htmlText,
					IndentLevel: indentLevel,
				})
			}
		} else if !foundFirstColumn {
			// Collect content before the first column heading
			headerLines = append(headerLines, line)
		}
	}

	// Add the last column if it exists
	if currentColumn != nil {
		columns = append(columns, *currentColumn)
	}

	// Process header content
	headerContent := processHeaderContentBasic(strings.Join(headerLines, "\n"))

	return headerContent, columns
}

// processHeaderContentBasic converts header markdown to HTML (basic implementation)
func processHeaderContentBasic(content string) string {
	if content == "" {
		return ""
	}

	// Process basic markdown for the header
	// Process h1 (# Title)
	h1Regex := regexp.MustCompile(`(?m)^#\s+(.+)$`)
	content = h1Regex.ReplaceAllString(content, "<h1>$1</h1>")

	// Process paragraphs (simple approach - treat each line as a paragraph)
	lines := strings.Split(content, "\n")
	var result []string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "<h1>") {
			// Process basic inline formatting
			line = processInlineFormattingBasic(line)
			result = append(result, "<p>"+line+"</p>")
		} else if line != "" {
			result = append(result, line)
		}
	}

	return strings.Join(result, "\n")
}

// processInlineFormattingBasic handles basic markdown formatting for inline text
func processInlineFormattingBasic(text string) string {
	// Process bold text (**text** or __text__)
	boldPattern := regexp.MustCompile(`(\*\*|__)([^*_]+)(\*\*|__)`)
	text = boldPattern.ReplaceAllString(text, "<strong>$2</strong>")

	// Process italic text (*text* or _text_)
	italicPattern := regexp.MustCompile(`(\*|_)([^*_]+)(\*|_)`)
	text = italicPattern.ReplaceAllString(text, "<em>$2</em>")

	// Process links [text](url)
	linkPattern := regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	text = linkPattern.ReplaceAllString(text, `<a href="$2">$1</a>`)

	// Process inline code (`code`)
	codePattern := regexp.MustCompile("`([^`]+)`")
	text = codePattern.ReplaceAllString(text, "<code>$1</code>")

	return text
}