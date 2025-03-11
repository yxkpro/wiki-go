package goldext

import (
	"strings"
)

// DirectionPreprocessor transforms rtl/ltr code blocks into HTML divs
// and avoids processing nested direction blocks inside other code blocks
func DirectionPreprocessor(markdown string, _ string) string {
	// We'll break this into smaller, more manageable steps

	// 1. First, let's extract all standalone direction blocks (not inside other code blocks)
	// We'll replace them with unique placeholders

	lines := strings.Split(markdown, "\n")
	processedLines := make([]string, len(lines))
	copy(processedLines, lines)

	// Maps to store replacements
	replacements := make(map[int]string) // Line index -> replacement HTML
	linesToRemove := make(map[int]bool)  // Lines to be removed

	// State tracking
	backtickStack := 0             // Track nesting of ``` blocks
	tildeStack := 0                // Track nesting of ~~~ blocks
	inDirectionBlock := false      // Are we in a direction block?
	directionStart := -1           // Start line of current direction block
	directionContent := []string{} // Content of current direction block
	directionBlockType := ""       // Type of block: "backtick" or "tilde"
	directionType := ""            // Type of direction: "rtl" or "ltr"

	// Scan through all lines
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check for code block markers
		if strings.HasPrefix(trimmed, "```") {
			if backtickStack == 0 {
				// Opening a backtick block
				backtickStack++

				// Check if it's a direction block and we're not inside any other block
				if tildeStack == 0 && (trimmed == "```rtl" || trimmed == "```ltr") {
					inDirectionBlock = true
					directionStart = i
					directionContent = []string{}
					directionBlockType = "backtick"
					directionType = strings.TrimPrefix(trimmed, "```")
					// Mark this line for removal
					linesToRemove[i] = true
				}
			} else {
				// Closing a backtick block
				backtickStack--

				// If we're closing a direction block
				if inDirectionBlock && directionBlockType == "backtick" && backtickStack == 0 && tildeStack == 0 {
					// Create replacement HTML
					replacement := "<div class=\"" + directionType + "\">\n" + strings.Join(directionContent, "\n") + "\n</div>"
					replacements[directionStart] = replacement

					// Mark this line for removal
					linesToRemove[i] = true

					// Reset state
					inDirectionBlock = false
					directionStart = -1
					directionContent = []string{}
					directionBlockType = ""
					directionType = ""
				}
			}
		} else if strings.HasPrefix(trimmed, "~~~") {
			if tildeStack == 0 {
				// Opening a tilde block
				tildeStack++

				// Check if it's a direction block and we're not inside any other block
				if backtickStack == 0 && (trimmed == "~~~rtl" || trimmed == "~~~ltr") {
					inDirectionBlock = true
					directionStart = i
					directionContent = []string{}
					directionBlockType = "tilde"
					directionType = strings.TrimPrefix(trimmed, "~~~")
					// Mark this line for removal
					linesToRemove[i] = true
				}
			} else {
				// Closing a tilde block
				tildeStack--

				// If we're closing a direction block
				if inDirectionBlock && directionBlockType == "tilde" && tildeStack == 0 && backtickStack == 0 {
					// Create replacement HTML
					replacement := "<div class=\"" + directionType + "\">\n" + strings.Join(directionContent, "\n") + "\n</div>"
					replacements[directionStart] = replacement

					// Mark this line for removal
					linesToRemove[i] = true

					// Reset state
					inDirectionBlock = false
					directionStart = -1
					directionContent = []string{}
					directionBlockType = ""
					directionType = ""
				}
			}
		} else if inDirectionBlock && ((directionBlockType == "backtick" && backtickStack > 0 && tildeStack == 0) ||
			(directionBlockType == "tilde" && tildeStack > 0 && backtickStack == 0)) {
			// We're inside a direction block, collect the content
			directionContent = append(directionContent, line)
			// Mark this line for removal
			linesToRemove[i] = true
		}
	}

	// Handle unclosed direction blocks at end of document
	if inDirectionBlock && directionStart >= 0 {
		// Create replacement HTML for unclosed direction block
		replacement := "<div class=\"" + directionType + "\">\n" + strings.Join(directionContent, "\n") + "\n</div>"
		replacements[directionStart] = replacement
	}

	// Process the lines, applying replacements and removing marked lines
	result := []string{}

	for i, line := range processedLines {
		if replacement, ok := replacements[i]; ok {
			// This line has a replacement
			result = append(result, replacement)
		} else if !linesToRemove[i] {
			// This line should not be removed
			result = append(result, line)
		}
		// Lines marked for removal are skipped
	}

	return strings.Join(result, "\n")
}
