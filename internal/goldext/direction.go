package goldext

import (
	"bytes"
	"fmt"
	"strings"
	"sync"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	html "github.com/yuin/goldmark/renderer/html"
)

// Store extracted direction blocks until restored after Goldmark processing
var (
	directionBlocks     = make(map[string]string)
	directionBlockCount = 0
	directionMutex      sync.Mutex
)

// DirectionPreprocessor extracts rtl/ltr blocks and replaces them with placeholders
// The actual HTML generation will happen after Goldmark processes everything else
func DirectionPreprocessor(markdown string, _ string) string {
	directionMutex.Lock()
	defer directionMutex.Unlock()

	// Reset the storage on each new document
	directionBlocks = make(map[string]string)
	directionBlockCount = 0

	// Process line by line to safely extract RTL/LTR blocks
	lines := strings.Split(markdown, "\n")
	var result []string

	// State tracking
	inCodeBlock := false  // Are we inside a non-RTL/LTR code block?
	inRtlLtrBlock := false // Are we inside an RTL/LTR block?
	blockType := "" // rtl or ltr
	blockContent := []string{}
	codeBlockDepth := 0

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Handle code block markers
		if strings.HasPrefix(trimmed, "```") {
			if trimmed == "```rtl" || trimmed == "```ltr" {
				// Only process as RTL/LTR block if we're not already in a code block
				if !inCodeBlock && !inRtlLtrBlock {
					inRtlLtrBlock = true
					blockType = strings.TrimPrefix(trimmed, "```")
					blockContent = []string{}
					continue
				}
			}

			// Toggle code block state if not an RTL/LTR block or already in a code block
			if !inRtlLtrBlock || inCodeBlock {
				if codeBlockDepth == 0 {
					codeBlockDepth = 1
				} else {
					codeBlockDepth = 0
				}
				inCodeBlock = codeBlockDepth > 0
			}

			// If this is the closing marker for an RTL/LTR block
			if inRtlLtrBlock && trimmed == "```" && !inCodeBlock {
				// Create a placeholder for this block
				blockID := fmt.Sprintf("DIRECTION_BLOCK_%d", directionBlockCount)
				directionBlockCount++

				// Store the direction type and content for later processing
				directionBlocks[blockID] = blockType + "|" + strings.Join(blockContent, "\n")

				// Add the placeholder to the output
				result = append(result, "<!-- "+blockID+" -->")

				// Reset state
				inRtlLtrBlock = false
				blockType = ""
				blockContent = []string{}
				continue
			}
		} else if strings.HasPrefix(trimmed, "~~~") {
			if trimmed == "~~~rtl" || trimmed == "~~~ltr" {
				// Only process as RTL/LTR block if we're not already in a code block
				if !inCodeBlock && !inRtlLtrBlock {
					inRtlLtrBlock = true
					blockType = strings.TrimPrefix(trimmed, "~~~")
					blockContent = []string{}
					continue
				}
			}

			// Toggle code block state if not an RTL/LTR block or already in a code block
			if !inRtlLtrBlock || inCodeBlock {
				if codeBlockDepth == 0 {
					codeBlockDepth = 1
				} else {
					codeBlockDepth = 0
				}
				inCodeBlock = codeBlockDepth > 0
			}

			// If this is the closing marker for an RTL/LTR block
			if inRtlLtrBlock && trimmed == "~~~" && !inCodeBlock {
				// Create a placeholder for this block
				blockID := fmt.Sprintf("DIRECTION_BLOCK_%d", directionBlockCount)
				directionBlockCount++

				// Store the direction type and content for later processing
				directionBlocks[blockID] = blockType + "|" + strings.Join(blockContent, "\n")

				// Add the placeholder to the output
				result = append(result, "<!-- "+blockID+" -->")

				// Reset state
				inRtlLtrBlock = false
				blockType = ""
				blockContent = []string{}
				continue
			}
		}

		// Collect content or pass line through
		if inRtlLtrBlock && !inCodeBlock {
			blockContent = append(blockContent, line)
		} else {
			result = append(result, line)
		}
	}

	// Handle any unclosed blocks at EOF (rare case)
	if inRtlLtrBlock && !inCodeBlock && blockType != "" {
		blockID := fmt.Sprintf("DIRECTION_BLOCK_%d", directionBlockCount)
		directionBlockCount++
		directionBlocks[blockID] = blockType + "|" + strings.Join(blockContent, "\n")
		result = append(result, "<!-- "+blockID+" -->")
	}

	return strings.Join(result, "\n")
}

// RestoreDirectionBlocks replaces direction block placeholders with HTML
// This must be called after Goldmark rendering
func RestoreDirectionBlocks(htmlContent string) string {
	directionMutex.Lock()
	defer directionMutex.Unlock()

	// Create our own Goldmark instance for RTL/LTR content processing
	// This won't be recursive because we're only processing the content inside the blocks
	md := goldmark.New(
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

	result := htmlContent

	// Replace each placeholder with processed HTML
	for id, block := range directionBlocks {
		placeholder := fmt.Sprintf("<!-- %s -->", id)

		// Split the stored data into type and content
		parts := strings.SplitN(block, "|", 2)
		if len(parts) != 2 {
			continue
		}

		dirType := parts[0]
		content := parts[1]

		// Render the content with Goldmark
		var buf bytes.Buffer
		if err := md.Convert([]byte(content), &buf); err != nil {
			// If error, just use unprocessed content
			result = strings.Replace(result, placeholder, fmt.Sprintf("<div class=\"%s\">%s</div>", dirType, content), 1)
		} else {
			// Use the rendered HTML inside the direction div
			result = strings.Replace(result, placeholder, fmt.Sprintf("<div class=\"%s\">%s</div>", dirType, buf.String()), 1)
		}
	}

	return result
}
