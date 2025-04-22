package goldext

import (
    "fmt"
    "regexp"
    "strings"
)

// HeadingAnchorPreprocessor adds a ¶ anchor link to every heading that already has an {#id} attribute.
// It must run AFTER TocPreprocessor so all headings are guaranteed to have IDs.
func HeadingAnchorPreprocessor(markdown, _ string) string {
    lines := strings.Split(markdown, "\n")
    inCodeBlock := false

    // Match headings that already contain an ID attribute
    // Example: "## Example Heading {#example-heading}"
    headingRegex := regexp.MustCompile(`^(#{1,6})\s+(.+?)\s+\{#([a-zA-Z0-9-]+)\}\s*$`)

    for i, line := range lines {
        trimmed := strings.TrimSpace(line)

        // Track fenced code blocks (``` or ~~~)
        if strings.HasPrefix(trimmed, "```") || strings.HasPrefix(trimmed, "~~~") {
            inCodeBlock = !inCodeBlock
            continue
        }
        if inCodeBlock {
            continue
        }

        // Skip if we already inserted an anchor
        if strings.Contains(line, "heading-anchor") {
            continue
        }

        // Match heading lines with IDs
        m := headingRegex.FindStringSubmatch(trimmed)
        if m == nil {
            continue
        }

        levelPrefix := m[1]        // ### etc.
        text := m[2]
        id := m[3]

        // Construct anchor element
        anchor := fmt.Sprintf(` <a class="heading-anchor" href="#%s" aria-label="Permalink">¶</a>`, id)

        // Preserve any leading spaces (indentation) from the original line
        leading := line[:len(line)-len(strings.TrimLeft(line, " \t"))]

        // Re‑assemble the heading with the anchor before the {#id}
        newLine := fmt.Sprintf("%s%s %s%s {#%s}", leading, levelPrefix, text, anchor, id)
        lines[i] = newLine
    }

    return strings.Join(lines, "\n")
}