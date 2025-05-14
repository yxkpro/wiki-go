package goldext

import (
	"testing"
)

func TestSuperscriptPreprocessor(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Basic superscript",
			input:    "This is a ^test^ of superscript.",
			expected: "This is a <sup>test</sup> of superscript.",
		},
		{
			name:     "Multiple superscripts",
			input:    "H^2^O and E=mc^2^ are formulas.",
			expected: "H<sup>2</sup>O and E=mc<sup>2</sup> are formulas.",
		},
		{
			name:     "Footnote reference",
			input:    "This is a footnote[^1] reference.",
			expected: "This is a footnote[^1] reference.",
		},
		{
			name:     "Mixed with footnotes",
			input:    "This has a superscript^2^ and a footnote[^1].",
			expected: "This has a superscript<sup>2</sup> and a footnote[^1].",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SuperscriptPreprocessor(tt.input, "")
			if result != tt.expected {
				t.Errorf("Expected: %q, got: %q", tt.expected, result)
			}
		})
	}
}