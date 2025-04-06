# LeoMoon Wiki-Go

![docker builds](https://github.com/leomoon-studios/wiki-go/actions/workflows/release-docker.yml/badge.svg)
![binary builds](https://github.com/leomoon-studios/wiki-go/actions/workflows/release-binaries.yml/badge.svg)
[![version](https://img.shields.io/github/v/release/leomoon-studios/wiki-go?label=Version)](https://github.com/leomoon-studios/wiki-go/releases)

A fast, modern, **flat-file wiki** powered by Go.

No database. No bloat. Just Markdown, simplicity, and power.

## Important Configuration Note with Non-SSL Setups

If you're running Wiki-Go without SSL/HTTPS and experiencing login issues, you need to set `allow_insecure_cookies: true` in your `config.yaml` file and restart Wiki-Go. This is because:

1. By default, Wiki-Go sets the "Secure" flag on cookies for security
2. Browsers reject "Secure" cookies on non-HTTPS connections
3. This prevents login from working properly on HTTP-only setups

> **Security Note**: Only use this setting in development or in trusted internal networks. For public-facing wikis, always use HTTPS.

## Features

### Features at a Glance

- ✍️ Full Markdown editing with emoji, Mermaid diagrams, and LaTeX math
- 🔍 Smart full-text search with highlighting and advanced filters
- 📁 Hierarchical page structure with version history
- 👥 User management, access control, and private wiki mode
- 💬 Comments with moderation and markdown support
- ⚡ Instant setup via Docker or prebuilt binaries
- 🧩 Custom logos, banners, shortcodes, and more

> Perfect for internal documentation, personal knowledge bases, or team wikis.

### Content Management
- **Markdown Support**: Write content using Markdown syntax for rich formatting
- **Emoji Shortcodes**: Use emoji shortcodes like `:smile:` in your Markdown content
- **File Attachments**: Upload and manage images and documents (supports jpg, jpeg, png, gif, svg, txt, log, csv, zip, pdf, docx, xlsx, pptx, mp4)
- **Hierarchical Organization**: Organize content in nested directories
- **Version History**: Track changes with full revision history and restore previous versions
- **Document Management**: Create, edit, and delete documents with a user-friendly interface

### Collaboration & Feedback
- **Comments System**: Enable discussions on documents with a full-featured commenting system
- **Markdown in Comments**: Format comments using the same Markdown syntax as in documents
- **Comment Moderation**: Administrators can delete inappropriate comments
- **Disable Comments**: Option to disable comments system-wide through the wiki settings

### Search & Navigation
- **Full-Text Search**: Powerful search functionality with support for:
  - Exact phrase matching (using quotes)
  - Inclusion/exclusion of terms
  - Highlighted search results
- **Breadcrumb Navigation**: Clear path visualization for easy navigation
- **Sidebar Navigation**: Quick access to document hierarchy

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between dark and light modes
- **Code Syntax Highlighting**: Support for multiple programming languages
- **Math Rendering**: LaTeX math formula support via MathJax
- **Diagrams**: Mermaid diagram integration for creating flowcharts, sequence diagrams, etc.

### Administration
- **User Management**: Create and manage users with different permission levels
- **Admin Panel**: Configure wiki settings through a web interface
- **Statistics**: Track document metrics and site usage

### Advanced Features
- **Custom Shortcodes**: Extend markdown with special shortcodes like `:::stats recenter=5:::` for additional functionality
- **Media Embedding**: Embed images, videos, and other media in your documents
- **Print Friendly**: Optimized printing support for documentation
- **API Access**: RESTful API for programmatic access to wiki content

## Preview

![Desktop](screenshots/preview.png)
More screenshots 👉 [SCREENSHOTS.md](SCREENSHOTS.md)

## Get Started

### Docker (quick test)

```bash
# Pull the latest image
docker pull leomoonstudios/wiki-go

# Run with default configuration
docker run -d \
  --name wiki-go \
  -p 8080:8080 \
  -v "$(pwd)/data:/wiki/data" \
  leomoonstudios/wiki-go
```

### Using Docker Compose (recommended)

```yaml
services:
  wiki-go:
    image: leomoonstudios/wiki-go
    container_name: wiki-go
    user: 1000:1000
    ports:
      - "8080:8080"
    volumes:
      - ./data:/wiki/data
    environment:
      - PUID=1000
      - PGID=1000
    restart: unless-stopped
```

### Binary

Download the latest release for your platform from the [GitHub Releases](https://github.com/leomoon-studios/wiki-go/releases) page.
```bash
# Run the application
./wiki-go  # or wiki-go.exe on Windows
```

### Build from Source

Requirements:
- Go 1.21 or later
- Git

```bash
# Clone the repository
git clone https://github.com/leomoon-studios/wiki-go.git
cd wiki-go

# Build the binary
go build -o wiki-go

# Run the application
./wiki-go  # or wiki-go.exe on Windows
```

## Configuration

### Basic Settings

Configuration is stored in `data/config.yaml` and will be created automatically on first run with default values. You can modify this file to customize your wiki:

```yaml
server:
    host: 0.0.0.0
    port: 8080
    # When set to true, allows cookies to be sent over non-HTTPS connections.
    # WARNING: Only enable this in trusted environments like a homelab
    # where HTTPS is not available. This reduces security by allowing
    # cookies to be transmitted in plain text.
    allow_insecure_cookies: true
wiki:
    root_dir: data
    documents_dir: documents
    title: "📚 Wiki-Go"
    owner: wiki.example.com
    notice: Copyright 2025 © All rights reserved.
    timezone: America/Vancouver
    private: false
    disable_comments: false
    max_versions: 10
    # Maximum file upload size in MB
    max_upload_size: 10
    # Default language for the wiki interface (en, es, etc.)
    language: en
users:
    - username: admin
      password: <bcrypt-hashed-password>
      is_admin: true
```

### Customization

#### Custom Favicon

LeoMoon Wiki-Go comes with default favicons, but you can easily replace them with your own:

1. To use custom favicons, place your files in the `data/static/` directory with the following names:
   - `favicon.ico` - Standard favicon format (used by older browsers)
   - `favicon.png` - PNG format favicon
   - `favicon.svg` - SVG format favicon (recommended for best quality at all sizes)

2. The application will automatically detect and use your custom favicon files without requiring a restart.

SVG format is recommended for favicons as it scales well to different sizes while maintaining crisp quality.

#### Custom Logo (Optional)

You can add a custom logo to display in the sidebar above your wiki title:

1. Create a logo file in one of the supported formats:
   - `logo.svg` - SVG format (recommended for best quality)
   - `logo.png` - PNG format (alternative option)

2. Place the logo file in the `data/static/` directory.

3. The logo will automatically appear in the sidebar above your wiki title.

**Notes:**
- The logo is displayed at 120×120 pixels, but will maintain its aspect ratio
- SVG format is recommended for the best appearance at all screen sizes
- No configuration changes or application restart needed
- If no logo file is present, only the wiki title will be displayed
- If both logo.svg and logo.png exist, logo.svg will be used

#### Global Banner (Optional)

You can add a banner image that will appear at the top of all documents:

1. Create a banner image in one of the supported formats:
   - `banner.png` - PNG format (recommended for best quality)
   - `banner.jpg` - JPG format (alternative option)

2. Place the banner file in the `data/static/` directory.

3. The banner will automatically appear at the top of all document content.

**Notes:**
- The banner is displayed with responsive width and a maximum height of 250px
- The banner maintains its aspect ratio while fitting different screen sizes
- No configuration changes or application restart needed
- To remove the banner, simply delete the file from the `data/static/` directory
- If both banner.png and banner.jpg exist, banner.png will be used

### User Management

LeoMoon Wiki-Go includes a user management system with different permission levels:

- **Admin users**: Can create, edit, and delete content, manage users, and change settings
- **Regular users**: Can view content (when in private mode)

The default admin credentials are:
- Username: `admin`
- Password: `admin`

It's recommended to change these credentials immediately after first login.

## Security

- **Authentication**: User authentication with secure password hashing
- **Private Mode**: Optional private wiki mode requiring login
- **Admin Controls**: Separate admin privileges for content management

## Usage

### Creating Content

1. Log in with admin credentials
2. Use the "New" button to create a new document
3. Write content using Markdown syntax
4. Save your document

### Organizing Content

LeoMoon Wiki-Go allows you to organize content in a hierarchical structure:

1. Create directories to group related documents
2. Use the move/rename feature to reorganize content when in edit mode
3. Navigate through your content using the sidebar or breadcrumbs

### Attaching Files

You can attach files to any document:

1. Navigate to the document and enter edit mode
2. Click the "Attachments"
3. Upload files using the upload button
4. Use "Files" tab to insert links to files in your document

### Using Comments

The commenting system allows users to provide feedback and engage in discussions:

1. Navigate to any document
2. Scroll to the comments section at the bottom
3. Authenticated users can add comments using Markdown syntax
4. Administrators can delete any comments
5. Comments can be disabled system-wide through the admin settings panel

## Technical Details

### Built With
- **Backend**: Go (Golang)
- **Frontend**: HTML, CSS, JavaScript
- **Editor**: [CodeMirror5](https://github.com/codemirror/codemirror5) for Markdown editing
- **Syntax Highlighting**: [Prism.js](https://github.com/PrismJS/prism)
- **Diagrams**: [Mermaid.js](https://github.com/mermaid-js/mermaid)
- **Math Rendering**: [MathJax](https://github.com/mathjax/MathJax)

### Architecture
- **Simple Configuration**: Easy YAML-based configuration
- **File-Based Storage**: Documents stored as Markdown files
- **Lightweight & Fast**: Built for performance
- **No External Database**: Self-contained with file-based storage

---

LeoMoon Wiki-Go is designed to be simple to deploy and use while providing powerful features for knowledge management. It's perfect for team documentation, personal knowledge bases, and collaborative projects.