package goldext

import (
	"fmt"
	"strings"
	"sync"
)

// Store extracted Mermaid blocks until after Goldmark processing
var (
	mermaidBlocks     = make(map[string]string)
	mermaidBlockCount = 0
	mermaidMutex      sync.Mutex
)

// MermaidPreprocessor extracts mermaid blocks and replaces them with placeholders
// that Goldmark won't process. The blocks will be restored after Goldmark rendering.
func MermaidPreprocessor(markdown string, _ string) string {
	mermaidMutex.Lock()
	defer mermaidMutex.Unlock()

	// Reset the storage on each new document
	mermaidBlocks = make(map[string]string)
	mermaidBlockCount = 0

	// Process line by line to safely extract mermaid blocks
	lines := strings.Split(markdown, "\n")
	var result []string

	inMermaidBacktick := false
	inMermaidTilde := false
	mermaidContent := []string{}

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Detect start/end of mermaid blocks
		if trimmed == "```mermaid" {
			inMermaidBacktick = true
			mermaidContent = []string{}
			continue
		} else if trimmed == "```" && inMermaidBacktick {
			inMermaidBacktick = false
			// Generate a placeholder that Goldmark won't touch
			blockID := fmt.Sprintf("MERMAID_BLOCK_%d", mermaidBlockCount)
			mermaidBlockCount++
			// Store the actual mermaid div
			mermaidDiv := "<div class=\"mermaid\">" + strings.Join(mermaidContent, "\n") + "</div>"
			mermaidBlocks[blockID] = mermaidDiv
			// Add placeholder to output - this will pass through Goldmark untouched
			result = append(result, "<!-- "+blockID+" -->")
			continue
		} else if trimmed == "~~~mermaid" {
			inMermaidTilde = true
			mermaidContent = []string{}
			continue
		} else if trimmed == "~~~" && inMermaidTilde {
			inMermaidTilde = false
			// Generate a placeholder that Goldmark won't touch
			blockID := fmt.Sprintf("MERMAID_BLOCK_%d", mermaidBlockCount)
			mermaidBlockCount++
			// Store the actual mermaid div
			mermaidDiv := "<div class=\"mermaid\">" + strings.Join(mermaidContent, "\n") + "</div>"
			mermaidBlocks[blockID] = mermaidDiv
			// Add placeholder to output - this will pass through Goldmark untouched
			result = append(result, "<!-- "+blockID+" -->")
			continue
		}

		// Collect content or pass unchanged
		if inMermaidBacktick || inMermaidTilde {
			mermaidContent = append(mermaidContent, line)
		} else {
			result = append(result, line)
		}
	}

	// Handle any unclosed blocks (rare, but possible)
	if inMermaidBacktick || inMermaidTilde {
		blockID := fmt.Sprintf("MERMAID_BLOCK_%d", mermaidBlockCount)
		mermaidBlockCount++
		mermaidDiv := "<div class=\"mermaid\">" + strings.Join(mermaidContent, "\n") + "</div>"
		mermaidBlocks[blockID] = mermaidDiv
		result = append(result, "<!-- "+blockID+" -->")
	}

	return strings.Join(result, "\n")
}

// RestoreMermaidBlocks replaces placeholders with actual mermaid diagrams
// This must be called after Goldmark processing
func RestoreMermaidBlocks(html string) string {
	mermaidMutex.Lock()
	defer mermaidMutex.Unlock()

	result := html
	for id, block := range mermaidBlocks {
		placeholder := fmt.Sprintf("<!-- %s -->", id)
		result = strings.Replace(result, placeholder, block, 1)
	}

	return result
}
