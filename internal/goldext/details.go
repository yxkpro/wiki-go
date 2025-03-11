package goldext

import (
	"strings"
)

// DetailsPreprocessor adds support for ```details and ~~~details blocks
func DetailsPreprocessor(markdown string, _ string) string {
	// Split markdown into lines for processing
	lines := strings.Split(markdown, "\n")
	var result []string

	// Process the document line by line
	var inDetailsBlock bool
	var inCodeBlock bool
	var detailsContent strings.Builder
	var detailsTitle string
	var detailsMarker string // This will be ``` or ~~~
	var nestLevel int        // For tracking nested details blocks

	// Track inner code blocks within details
	var innerCodeBlocks []string
	var innerCodeBlockStart int

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmedLine := strings.TrimSpace(line)

		// Check if we're inside a regular code block (not a details block)
		if !inDetailsBlock && (strings.HasPrefix(trimmedLine, "```") || strings.HasPrefix(trimmedLine, "~~~")) &&
			!strings.HasPrefix(trimmedLine, "```details") && !strings.HasPrefix(trimmedLine, "~~~details") {
			inCodeBlock = !inCodeBlock
			result = append(result, line)
			continue
		}

		// Skip processing if inside a regular code block
		if inCodeBlock {
			result = append(result, line)
			continue
		}

		// Check for details block start
		if !inDetailsBlock &&
			(strings.HasPrefix(trimmedLine, "```details") || strings.HasPrefix(trimmedLine, "~~~details")) {
			inDetailsBlock = true
			if strings.HasPrefix(trimmedLine, "```details") {
				detailsMarker = "```"
			} else {
				detailsMarker = "~~~"
			}

			// Extract the title (everything after "```details" or "~~~details")
			detailsTitle = strings.TrimSpace(strings.TrimPrefix(
				strings.TrimPrefix(trimmedLine, "```details"), "~~~details"))

			// Start capturing details content
			detailsContent.Reset()
			nestLevel = 1
			continue
		}

		// Check for details block end
		if inDetailsBlock && strings.TrimSpace(line) == detailsMarker {
			nestLevel--

			// Only close the details block if all nested blocks are closed
			if nestLevel == 0 {
				inDetailsBlock = false

				// Generate the details HTML
				content := detailsContent.String()

				// Process inner code blocks
				for idx, block := range innerCodeBlocks {
					placeholder := "---INNERCODE" + strings.Repeat("I", idx) + "---"
					content = strings.Replace(content, placeholder, block, 1)
				}
				innerCodeBlocks = nil

				// Convert details content to HTML
				// Use the markdown-details class to apply the CSS styling
				detailsHTML := "<details class=\"markdown-details\">\n"
				detailsHTML += "  <summary>" + detailsTitle + "</summary>\n"
				detailsHTML += "  <div class=\"details-content\">\n"

				// Add the content without indentation to ensure proper markdown parsing
				detailsHTML += content

				detailsHTML += "  </div>\n"
				detailsHTML += "</details>"

				result = append(result, detailsHTML)
			} else {
				// This is a nested block close
				detailsContent.WriteString(line + "\n")
			}
			continue
		}

		// Check for nested details blocks within a details block
		if inDetailsBlock &&
			(strings.HasPrefix(trimmedLine, "```details") || strings.HasPrefix(trimmedLine, "~~~details")) {
			nestLevel++
			detailsContent.WriteString(line + "\n")
			continue
		}

		// Check for code blocks within details
		if inDetailsBlock && (strings.HasPrefix(trimmedLine, "```") || strings.HasPrefix(trimmedLine, "~~~")) &&
			!strings.HasPrefix(trimmedLine, "```details") && !strings.HasPrefix(trimmedLine, "~~~details") {

			// If this is the start of an inner code block
			if innerCodeBlockStart == 0 {
				innerCodeBlockStart = i

				// Create a placeholder for this code block
				placeholder := "---INNERCODE" + strings.Repeat("I", len(innerCodeBlocks)) + "---"
				detailsContent.WriteString(placeholder + "\n")

				// Start capturing the code block
				var codeBlock strings.Builder
				codeBlock.WriteString(line + "\n")

				// Find the end of this code block
				codeBlockMarker := strings.TrimSpace(line)[:3] // Get ``` or ~~~
				j := i + 1
				for ; j < len(lines); j++ {
					innerLine := lines[j]
					codeBlock.WriteString(innerLine + "\n")

					if strings.TrimSpace(innerLine) == codeBlockMarker {
						break
					}
				}

				// Store the full code block
				innerCodeBlocks = append(innerCodeBlocks, codeBlock.String())

				// Skip to the end of the code block
				if j < len(lines) {
					i = j
				}
				innerCodeBlockStart = 0
			}
			continue
		}

		// Capture content for the details block
		if inDetailsBlock {
			detailsContent.WriteString(line + "\n")
		} else {
			// Regular line outside of any special block
			result = append(result, line)
		}
	}

	// If we're still in a details block at the end, just add the raw content
	if inDetailsBlock {
		// Add the opening marker and title
		result = append(result, detailsMarker+"details "+detailsTitle)
		// Add the content
		result = append(result, detailsContent.String())
	}

	return strings.Join(result, "\n")
}

// Register Details preprocessor in the list of known processors
var _ = DetailsPreprocessor
