package goldext

import (
	"fmt"
	"regexp"
	"strings"
)

// TocPreprocessor adds support for [toc] markers
// This generates the complete table of contents during markdown processing
// by scanning for headings in the document and building the TOC HTML structure
func TocPreprocessor(markdown string, _ string) string {
	// Process line by line to handle code blocks properly
	lines := strings.Split(markdown, "\n")
	var result []string

	inCodeBlock := false
	tocMarker := regexp.MustCompile(`^\s*\[toc\]\s*$`)
	headingRegex := regexp.MustCompile(`^(#{1,6})\s+(.+?)(?:\s+\{#([a-zA-Z0-9-]+)\})?$`)

	// First pass: collect all headings and their levels
	var headings []struct {
		Level int
		Text  string
		ID    string
		Line  string // Store the original line
	}

	// Track used IDs to avoid duplicates
	usedIDs := make(map[string]bool)

	for i, line := range lines {
		// Check if this line starts or ends a code block
		trimmedLine := strings.TrimSpace(line)
		if strings.HasPrefix(trimmedLine, "```") || strings.HasPrefix(trimmedLine, "~~~") {
			inCodeBlock = !inCodeBlock
			continue
		}

		// Skip processing inside code blocks
		if inCodeBlock {
			continue
		}

		// Extract headings outside of code blocks
		matches := headingRegex.FindStringSubmatch(trimmedLine)
		if matches != nil {
			level := len(matches[1]) // Count the number of # characters
			text := strings.TrimSpace(matches[2])
			existingID := ""

			// Check if the heading already has an ID
			if len(matches) > 3 && matches[3] != "" {
				existingID = matches[3]
			}

			// Remove any inline code or formatting from heading text for ID generation
			idText := text
			// Remove inline code
			idText = regexp.MustCompile("`[^`]+`").ReplaceAllString(idText, "")
			// Remove links
			idText = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`).ReplaceAllString(idText, "$1")

			// Use existing ID or generate a new one
			var id string
			if existingID != "" {
				id = existingID
			} else {
				id = makeSlug(idText)
			}

			// Ensure unique IDs
			baseID := id
			counter := 1
			for usedIDs[id] {
				id = fmt.Sprintf("%s-%d", baseID, counter)
				counter++
			}

			// Mark this ID as used
			usedIDs[id] = true

			headings = append(headings, struct {
				Level int
				Text  string
				ID    string
				Line  string
			}{Level: level, Text: text, ID: id, Line: line})

			// If this heading doesn't already have an ID, we need to update it in the original lines
			if existingID == "" {
				lines[i] = fmt.Sprintf("%s %s {#%s}", strings.Repeat("#", level), text, id)
			}
		}
	}

	// Second pass: Replace [toc] markers with generated TOC, but use the updated lines
	inCodeBlock = false
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Check if this line starts or ends a code block
		if strings.HasPrefix(trimmedLine, "```") || strings.HasPrefix(trimmedLine, "~~~") {
			inCodeBlock = !inCodeBlock
			result = append(result, line)
			continue
		}

		// If we're in a code block, don't process
		if inCodeBlock {
			result = append(result, line)
			continue
		}

		// Process [toc] markers outside of code blocks
		if tocMarker.MatchString(trimmedLine) {
			// Generate TOC HTML
			tocHTML := generateTOCHTML(headings)
			result = append(result, tocHTML)
		} else {
			// Check for inline code sections and preserve them
			var processedLine string
			segments := strings.Split(line, "`")

			for j, segment := range segments {
				if j%2 == 0 {
					// Outside inline code
					if strings.Contains(segment, "[toc]") {
						// Replace [toc] with generated TOC HTML
						segment = strings.ReplaceAll(segment, "[toc]", generateTOCHTML(headings))
					}
					processedLine += segment
				} else {
					// Inside inline code - preserve it
					processedLine += "`" + segment + "`"
				}
			}

			if processedLine != "" {
				result = append(result, processedLine)
			} else {
				result = append(result, line)
			}
		}
	}

	return strings.Join(result, "\n")
}

// makeSlug creates a URL-friendly slug from text
func makeSlug(text string) string {
	// Convert to lowercase
	text = strings.ToLower(text)

	// First, replace common special characters with spaces
	text = regexp.MustCompile(`[&+_,.()\[\]{}'"!?;:~*]`).ReplaceAllString(text, " ")

	// Normalize spaces (convert multiple spaces to single space)
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")

	// Trim spaces from beginning and end
	text = strings.TrimSpace(text)

	// Replace spaces with hyphens
	text = strings.ReplaceAll(text, " ", "-")

	// Remove any non-alphanumeric characters except hyphens
	text = regexp.MustCompile(`[^a-z0-9-]`).ReplaceAllString(text, "")

	// Remove consecutive hyphens
	text = regexp.MustCompile(`-+`).ReplaceAllString(text, "-")

	// Trim hyphens from beginning and end
	text = strings.Trim(text, "-")

	// Handle empty result (e.g., if input was all symbols)
	if text == "" {
		return "heading"
	}

	return text
}

// Generate the HTML for the table of contents
func generateTOCHTML(headings []struct {
	Level int
	Text  string
	ID    string
	Line  string
}) string {
	if len(headings) == 0 {
		return `<div class="wiki-toc"><p class="toc-empty">No headings found in this document.</p></div>`
	}

	// Start building the TOC HTML
	var tocBuilder strings.Builder
	tocBuilder.WriteString(`<nav class="wiki-toc table-of-contents" aria-label="Table of Contents">`)
	tocBuilder.WriteString(`<div class="toc-title">Table of Contents</div>`)

	// Track the current list level
	currentLevel := 0

	// Start the list
	for i, heading := range headings {
		// Handle level changes
		if i == 0 {
			// First heading - open lists up to this level
			for j := 1; j <= heading.Level; j++ {
				if j == 1 {
					tocBuilder.WriteString(`<ul class="toc-list">`)
				} else {
					tocBuilder.WriteString(`<ul>`)
				}
			}
			currentLevel = heading.Level
		} else if heading.Level > currentLevel {
			// Going deeper - open new list(s)
			for j := currentLevel + 1; j <= heading.Level; j++ {
				tocBuilder.WriteString(`<ul>`)
			}
			currentLevel = heading.Level
		} else if heading.Level < currentLevel {
			// Going up - close list(s)
			for j := currentLevel; j > heading.Level; j-- {
				tocBuilder.WriteString(`</ul></li>`)
			}
			tocBuilder.WriteString(`</li>`)
			currentLevel = heading.Level
		} else {
			// Same level - close previous item
			tocBuilder.WriteString(`</li>`)
		}

		// Add the list item
		tocBuilder.WriteString(fmt.Sprintf(`<li><a href="#%s">%s</a>`, heading.ID, heading.Text))
	}

	// Close any remaining open lists
	for j := currentLevel; j >= 1; j-- {
		if j == 1 {
			tocBuilder.WriteString(`</li></ul>`)
		} else {
			tocBuilder.WriteString(`</li></ul>`)
		}
	}

	tocBuilder.WriteString(`</nav>`)
	return tocBuilder.String()
}
