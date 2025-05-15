# Welcome to LeoMoon Wiki-Go

LeoMoon Wiki-Go is a modern, feature-rich, databaseless **flat-file wiki** platform built with Go. It provides a clean, intuitive interface for creating and managing knowledge bases, documentation, and collaborative content without requiring any external database.

No database. No bloat. Zero maintenance. Just Markdown.

## Important Configuration Note with Non-SSL Setups

If you're running LeoMoon Wiki-Go without SSL/HTTPS and experiencing login issues, you need to set `allow_insecure_cookies: true` in your `config.yaml` file and restart LeoMoon Wiki-Go. This is because:

1. By default, LeoMoon Wiki-Go sets the "Secure" flag on cookies for security
2. Browsers reject "Secure" cookies on non-HTTPS connections
3. This prevents login from working properly on HTTP-only setups

> **Security Note**: Only use this setting in development or in trusted internal networks. For public-facing wikis, always use HTTPS.
