# Technical Details

## Built With
- **Backend**: Go (Golang)
- **Frontend**: HTML, CSS, JavaScript
- **Editor**: [CodeMirror5](https://github.com/codemirror/codemirror5) for Markdown editing
- **Syntax Highlighting**: [Prism.js](https://github.com/PrismJS/prism)
- **Diagrams**: [Mermaid.js](https://github.com/mermaid-js/mermaid)
- **Math Rendering**: [MathJax](https://github.com/mathjax/MathJax)

## Architecture
- **Simple Configuration**: Easy YAML-based configuration
- **File-Based Storage**: Documents stored as Markdown files
- **Lightweight & Fast**: Built for performance
- **No External Database**: Self-contained with file-based storage

## Folder Structure

Wiki-Go uses a simple flat-file structure to store all content:

```
data/
├── config.yaml                   # Main configuration file for Wiki-Go
├── documents/                    # Regular wiki documents
│   └── path/
│       └── to/
│           └── doc-name/         # Document directory named "doc-name"
│               └── document.md   # The actual markdown content for "doc-name"
│
├── versions/                     # Version history storage
│    ├── documents/               # Regular document versions
│    │   └── path/
│    │       └── to/
│    │           └── doc-name/    # Timestamped version backup
│    │               └── YYYYMMDDhhmmss.md
│    └── pages/                   # Special pages versions
│        └── home/                # Timestamped homepage backup
│            └── YYYYMMDDhhmmss.md
│
├── pages/                        # Special pages (system pages)
│   └── home/                     # Homepage (landing page)
│       └── document.md           # Homepage content
│
├── comments/                     # Document comments
│   └── path/
│       └── to/
│           └── doc-name/         # Timestamped comments for "doc-name"
│               └── YYYYMMDDhhmmss_[user].md
│
└── static/                       # Static assets and customization
    ├── banner.png                # Global banner on all pages (optional, preferred)
    ├── banner.jpg                # Global banner on all pages (optional)
    ├── favicon.ico               # Standard favicon (optional)
    ├── favicon.svg               # SVG format favicon (optional, preferred)
    ├── favicon.png               # PNG format favicon (optional)
    └── langs/                    # Translation files copied by wiki-go at startup
```

The flat-file structure makes it easy to back up, version control, or manipulate wiki content outside the application if needed. All content is stored as plain Markdown files, and version history follows a simple timestamped file naming convention. File attachments are stored alongside the document.md file in the same directory, making it straightforward to manage document content and its associated files together.
