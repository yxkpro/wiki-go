package goldext

import (
	"strings"
)

// MermaidPreprocessor transforms mermaid code blocks into HTML divs
// and avoids processing nested mermaid blocks inside other code blocks
func MermaidPreprocessor(markdown string, _ string) string {
	// We'll break this into smaller, more manageable steps

	// 1. First, let's extract all standalone mermaid blocks (not inside other code blocks)
	// We'll replace them with unique placeholders

	lines := strings.Split(markdown, "\n")
	processedLines := make([]string, len(lines))
	copy(processedLines, lines)

	// Maps to store replacements
	replacements := make(map[int]string) // Line index -> replacement HTML
	linesToRemove := make(map[int]bool)  // Lines to be removed

	// State tracking
	backtickStack := 0           // Track nesting of ``` blocks
	tildeStack := 0              // Track nesting of ~~~ blocks
	inMermaidBlock := false      // Are we in a mermaid block?
	mermaidStart := -1           // Start line of current mermaid block
	mermaidContent := []string{} // Content of current mermaid block
	mermaidBlockType := ""       // Type of block: "backtick" or "tilde"

	// Scan through all lines
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check for code block markers
		if strings.HasPrefix(trimmed, "```") {
			if backtickStack == 0 {
				// Opening a backtick block
				backtickStack++

				// Check if it's a mermaid block and we're not inside any other block
				if tildeStack == 0 && strings.Contains(trimmed, "mermaid") {
					inMermaidBlock = true
					mermaidStart = i
					mermaidContent = []string{}
					mermaidBlockType = "backtick"
					// Mark this line for removal
					linesToRemove[i] = true
				}
			} else {
				// Closing a backtick block
				backtickStack--

				// If we're closing a mermaid block
				if inMermaidBlock && mermaidBlockType == "backtick" && backtickStack == 0 && tildeStack == 0 {
					// Create replacement HTML
					replacement := "<div class=\"mermaid\">\n" + strings.Join(mermaidContent, "\n") + "\n</div>"
					replacements[mermaidStart] = replacement

					// Mark this line for removal
					linesToRemove[i] = true

					// Reset state
					inMermaidBlock = false
					mermaidStart = -1
					mermaidContent = []string{}
					mermaidBlockType = ""
				}
			}
		} else if strings.HasPrefix(trimmed, "~~~") {
			if tildeStack == 0 {
				// Opening a tilde block
				tildeStack++

				// Check if it's a mermaid block and we're not inside any other block
				if backtickStack == 0 && strings.Contains(trimmed, "mermaid") {
					inMermaidBlock = true
					mermaidStart = i
					mermaidContent = []string{}
					mermaidBlockType = "tilde"
					// Mark this line for removal
					linesToRemove[i] = true
				}
			} else {
				// Closing a tilde block
				tildeStack--

				// If we're closing a mermaid block
				if inMermaidBlock && mermaidBlockType == "tilde" && tildeStack == 0 && backtickStack == 0 {
					// Create replacement HTML
					replacement := "<div class=\"mermaid\">\n" + strings.Join(mermaidContent, "\n") + "\n</div>"
					replacements[mermaidStart] = replacement

					// Mark this line for removal
					linesToRemove[i] = true

					// Reset state
					inMermaidBlock = false
					mermaidStart = -1
					mermaidContent = []string{}
					mermaidBlockType = ""
				}
			}
		} else if inMermaidBlock && ((mermaidBlockType == "backtick" && backtickStack > 0 && tildeStack == 0) ||
			(mermaidBlockType == "tilde" && tildeStack > 0 && backtickStack == 0)) {
			// We're inside a mermaid block, collect the content
			mermaidContent = append(mermaidContent, line)
			// Mark this line for removal
			linesToRemove[i] = true
		}
	}

	// Handle unclosed mermaid blocks at end of document
	if inMermaidBlock && mermaidStart >= 0 {
		// Create replacement HTML for unclosed mermaid block
		replacement := "<div class=\"mermaid\">\n" + strings.Join(mermaidContent, "\n") + "\n</div>"
		replacements[mermaidStart] = replacement
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
