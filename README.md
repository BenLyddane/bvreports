# BuildVision PDF Report Generator

A Node.js application that converts markdown files into beautifully formatted PDF reports using PDFKit.

## Overview

This tool automatically processes markdown files in the `projects` folder and converts them into professionally styled PDF reports with BuildVision branding. It keeps track of which files have been processed and only generates PDFs for new or modified files.

## Features

- Automatic processing of markdown files
- Beautiful LaTeX-based PDF generation
- BuildVision styling with custom colors
- Tracking of processed files to avoid duplicate work
- Support for tables, lists, images, and other markdown elements

## Requirements

- Node.js (v12 or higher)
- npm
- LaTeX installation (TeX Live or MiKTeX)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Ensure you have LaTeX installed on your system. This is required for PDF generation.

## Usage

1. Place your markdown files in the `projects` folder
2. Run the generator:

```bash
npm run generate
```

3. Find your generated PDFs in the `output` folder

## Markdown Format

The system supports standard markdown syntax, including:

- Headers (# for h1, ## for h2, etc.)
- Bold and italic text (**bold**, *italic*)
- Lists (ordered and unordered)
- Tables
- Links
- Images
- Code blocks

## Customization

You can customize the PDF output by modifying the following files:

- `index.js`: Update the `CONFIG` object to change paths, colors, etc.
- `index.js`: Modify the `BUILDVISION_INFO` constant to update the company information
- `index.js`: Edit the `createLatexDocument` function to change the LaTeX template

## How It Works

1. The system scans the `projects` folder for markdown files
2. It checks which files are new or have been modified since the last run
3. For each file to process:
   - Reads the markdown content
   - Converts it to HTML (intermediate step)
   - Transforms the HTML to LaTeX
   - Creates a complete LaTeX document with BuildVision styling
   - Generates a PDF using the LaTeX engine
4. Keeps track of processed files in `processed-files.json`

## Troubleshooting

If you encounter issues:

1. Ensure LaTeX is properly installed and accessible from the command line
2. Check that the markdown files are valid and properly formatted
3. Look for error messages in the console output
4. Verify that the BuildVisionLogo.png file exists in the root directory

## License

ISC
