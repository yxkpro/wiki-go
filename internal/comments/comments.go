package comments

import (
	"errors"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Comment represents a single comment on a document
type Comment struct {
	ID            string        // {timestamp}_{username}.md
	Author        string        // Extracted from filename
	Timestamp     int64         // Extracted from filename
	Content       string        // Raw markdown content
	RenderedHTML  template.HTML // Rendered HTML (not stored, generated on read)
	FormattedTime string        // Formatted timestamp for display
}

// AddComment creates a new comment for a document
func AddComment(documentPath, content, username string) error {
	// Generate timestamp
	timestamp := time.Now().Unix()

	// Sanitize username for filename safety
	safeUsername := sanitizeUsername(username)

	// Create comment filename with sanitized username
	filename := fmt.Sprintf("%d_%s.md", timestamp, safeUsername)

	// Ensure comment directory exists
	commentDir := filepath.Join("data/comments", documentPath)
	if err := os.MkdirAll(commentDir, 0755); err != nil {
		return fmt.Errorf("failed to create comment directory: %w", err)
	}

	// Write comment content to file
	return os.WriteFile(filepath.Join(commentDir, filename), []byte(content), 0644)
}

// GetComments retrieves all comments for a document
func GetComments(documentPath string) ([]Comment, error) {
	// Read comment directory
	commentDir := filepath.Join("data/comments", documentPath)
	files, err := os.ReadDir(commentDir)
	if os.IsNotExist(err) {
		return []Comment{}, nil // No comments yet
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read comment directory: %w", err)
	}

	// Process each comment file
	comments := []Comment{}
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".md") {
			// Parse filename to get timestamp and username
			parts := strings.SplitN(strings.TrimSuffix(file.Name(), ".md"), "_", 2)
			if len(parts) != 2 {
				continue // Invalid filename format
			}

			timestamp, err := strconv.ParseInt(parts[0], 10, 64)
			if err != nil {
				continue // Invalid timestamp
			}

			// Read comment content
			content, err := os.ReadFile(filepath.Join(commentDir, file.Name()))
			if err != nil {
				continue // Can't read file
			}

			comments = append(comments, Comment{
				ID:        file.Name(),
				Author:    parts[1], // Username from filename
				Timestamp: timestamp,
				Content:   string(content),
			})
		}
	}

	// Sort comments by timestamp (oldest first)
	sort.Slice(comments, func(i, j int) bool {
		return comments[i].Timestamp < comments[j].Timestamp
	})

	return comments, nil
}

// DeleteComment deletes a comment if the user is an admin
func DeleteComment(commentID string, documentPath string, userIsAdmin bool) error {
	if !userIsAdmin {
		return errors.New("only admins can delete comments")
	}

	// Validate the comment ID to ensure it's safe
	if !isValidCommentID(commentID) {
		return errors.New("invalid comment ID")
	}

	// Delete the comment file
	commentPath := filepath.Join("data/comments", documentPath, commentID)
	return os.Remove(commentPath)
}

// Helper function to validate comment ID format (timestamp_username.md)
func isValidCommentID(id string) bool {
	// Check file extension
	if !strings.HasSuffix(id, ".md") {
		return false
	}

	// Split and validate parts
	parts := strings.SplitN(strings.TrimSuffix(id, ".md"), "_", 2)
	if len(parts) != 2 {
		return false
	}

	// Validate timestamp is numeric
	_, err := strconv.ParseInt(parts[0], 10, 64)
	return err == nil
}

// FormatCommentTime formats a timestamp for display
func FormatCommentTime(timestamp int64) string {
	t := time.Unix(timestamp, 0)
	return t.Format("Jan 2, 2006 at 15:04")
}

// AreCommentsAllowed checks if comments are allowed for a document
func AreCommentsAllowed(content string) bool {
	// Look for the no-comments marker
	return !strings.Contains(strings.ToLower(content), "<!-- no comments -->")
}

// sanitizeUsername makes a username safe for use in filenames
func sanitizeUsername(username string) string {
	// Replace potentially problematic characters
	username = strings.ReplaceAll(username, " ", "_")
	username = strings.ReplaceAll(username, "#", "")
	username = strings.ReplaceAll(username, "%", "")
	username = strings.ReplaceAll(username, "&", "")
	username = strings.ReplaceAll(username, "{", "")
	username = strings.ReplaceAll(username, "}", "")
	username = strings.ReplaceAll(username, "\\", "")
	username = strings.ReplaceAll(username, ":", "")
	username = strings.ReplaceAll(username, "<", "")
	username = strings.ReplaceAll(username, ">", "")
	username = strings.ReplaceAll(username, "*", "")
	username = strings.ReplaceAll(username, "?", "")
	username = strings.ReplaceAll(username, "|", "")
	username = strings.ReplaceAll(username, "\"", "")
	username = strings.ReplaceAll(username, "'", "")
	username = strings.ReplaceAll(username, ";", "")
	username = strings.ReplaceAll(username, "/", "_")
	return username
}
