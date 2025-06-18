package frontmatter

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// KanbanColumn represents a column in the kanban board
type KanbanColumn struct {
	Title string
	Tasks []KanbanTask
}

// KanbanTask represents a task in the kanban board
type KanbanTask struct {
	Text       string
	Checked    bool
	HTMLText   string // Rendered HTML text of the task
	IndentLevel int   // Indentation level for nested tasks
}

// RenderKanban converts markdown content to a kanban board HTML
func RenderKanban(content string) string {
	// Extract header content and parse columns
	headerContent, columns := parseKanbanContent(content)

	// Generate HTML for the kanban board
	html := ""

	// Add header content if it exists
	if headerContent != "" {
		html += headerContent
	}

	html += `<div class="kanban-board">`

	for _, column := range columns {
		html += fmt.Sprintf(`<div class="kanban-column">
			<div class="kanban-column-header">%s</div>
			<div class="kanban-column-content">`, column.Title)

		// Add a task list for each column
		html += `<ul class="task-list">`

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
			html += fmt.Sprintf(`<li class="task-list-item-container" style="list-style-type: none;"%s>
				<span class="task-list-item">
					<input type="checkbox" class="task-checkbox" %s disabled>
					<span class="task-text">%s</span>
					<span class="save-state"></span>
				</span>
			</li>`, indentAttr, checkedAttr, task.HTMLText)
		}

		html += `</ul></div></div>`
	}

	html += `</div>`
	return html
}

// parseKanbanContent extracts header content and parses kanban columns
func parseKanbanContent(content string) (string, []KanbanColumn) {
	// Split content by lines
	lines := strings.Split(content, "\n")

	// Regular expressions for headings and tasks
	headingRegex := regexp.MustCompile(`^#{2,3}\s+(.+)$`)
	taskRegex := regexp.MustCompile(`^\s*[-*+]\s+\[([ xX])\]\s+(.+)$`)

	var columns []KanbanColumn
	var currentColumn *KanbanColumn
	var headerLines []string
	var foundFirstColumn bool

	for _, line := range lines {
		// Check if this line is a heading (column title) - level 2 or 3 only
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
				htmlText := processTaskText(taskText)

				// Add the task to the current column
				currentColumn.Tasks = append(currentColumn.Tasks, KanbanTask{
					Text:       taskText,
					Checked:    isChecked,
					HTMLText:   htmlText,
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
	headerContent := processHeaderContent(strings.Join(headerLines, "\n"))

	return headerContent, columns
}

// processHeaderContent converts header markdown to HTML
func processHeaderContent(content string) string {
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
			line = processInlineFormatting(line)
			result = append(result, "<p>"+line+"</p>")
		} else if line != "" {
			result = append(result, line)
		}
	}

	return strings.Join(result, "\n")
}

// processInlineFormatting handles basic markdown formatting for inline text
func processInlineFormatting(text string) string {
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

// processTaskText converts basic markdown formatting in task text to HTML
func processTaskText(text string) string {
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