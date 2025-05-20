# BuildVision Modular PDF Report Generator

A Node.js application that generates modular BuildVision reports using Claude API and LaTeX.

## Overview

This tool processes project folders containing context files (specifications, schedules, etc.), uses Claude AI to generate structured data sections, and converts them into professionally styled PDF reports with BuildVision branding.

## Features

- Modular project structure with organized context files
- AI-powered content generation using Claude API
- Separate processing of report sections (project details, equipment, alternatives, recommendations, etc.)
- Beautiful LaTeX-based PDF generation with BuildVision styling
- Simplified command structure for easy report generation

## Requirements

- Node.js (v16 or higher)
- npm
- LaTeX installation (TeX Live or MiKTeX)
- Claude API key (set in `.env.local` file)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Install LaTeX (required for PDF generation). See the [LaTeX Installation](#latex-installation) section below.

### LaTeX Installation

This application requires LaTeX (specifically XeLaTeX) to generate PDF reports. Installation varies by operating system:

#### macOS (MacTeX)

1. Download MacTeX from [https://tug.org/mactex/](https://tug.org/mactex/)
   - MacTeX is a large download (~4GB) as it includes the full TeX Live distribution
   - For a smaller installation, consider [BasicTeX](https://tug.org/mactex/morepackages.html) (~100MB)
2. Run the installer and follow the prompts
3. After installation, XeLaTeX should be available at `/Library/TeX/texbin/xelatex`
4. Verify installation by opening Terminal and running:
   ```bash
   xelatex --version
   ```

#### Windows (MiKTeX)

1. Download MiKTeX from [https://miktex.org/download](https://miktex.org/download)
2. Run the installer and follow the prompts
   - When asked, choose to install missing packages automatically
3. After installation, XeLaTeX should be available in your PATH
4. Verify installation by opening Command Prompt and running:
   ```bash
   xelatex --version
   ```

#### Linux (TeX Live)

1. Install TeX Live using your distribution's package manager:

   For Ubuntu/Debian:
   ```bash
   sudo apt-get install texlive-xetex texlive-fonts-recommended texlive-fonts-extra
   ```

   For Fedora:
   ```bash
   sudo dnf install texlive-xetex texlive-collection-fontsrecommended
   ```

   For Arch Linux:
   ```bash
   sudo pacman -S texlive-most
   ```

2. Verify installation by running:
   ```bash
   xelatex --version
   ```

#### Custom LaTeX Location

If you have LaTeX installed in a non-standard location, you can set the `XELATEX_PATH` environment variable to point to your XeLaTeX executable:

```bash
# macOS/Linux
export XELATEX_PATH=/path/to/your/xelatex

# Windows
set XELATEX_PATH=C:\path\to\your\xelatex.exe
```

## Setup

1. Copy the example environment file and configure it:
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your actual API key
# DO NOT commit this file to version control!
```

2. Add your Claude API key to the `.env.local` file:
```
ANTHROPIC_KEY=your_api_key_here
```

You can obtain an API key from the [Anthropic Console](https://console.anthropic.com/).

> **IMPORTANT**: Never commit your `.env.local` file or API keys to version control. The `.gitignore` file is configured to exclude these sensitive files, but always verify your commits don't contain secrets. See the [Security](#security) section for more details.

## Usage

### Simple Workflow

The application now provides a simplified workflow:

```bash
# Process all projects that have context files but no output
npm run generate

# Process a specific project
npm run generate:one ProjectName
```

This will:
1. Automatically set up project structures if needed
2. Generate all JSON sections using Claude API
3. Merge the sections into a complete JSON
4. Create a PDF report

### Project Management

```bash
# Create a new project
npm run project:create "Project Name"

# List all available projects
npm run project:list

# Add a context file to a project
npm run project:add-context "Project Name" "/path/to/file.pdf" specifications
```

### Cleanup and Maintenance

```bash
# Clean temporary files
npm run clean

# Move old JSON files to archive (for project migration)
npm run archive
```

## Project Structure

Each project follows this structure:

```
projects/
└── ProjectName/
    ├── ProjectName.json        # Merged JSON data
    ├── context/                # Input files for Claude
    │   ├── specifications/     # Technical specs
    │   ├── schedules/          # Equipment schedules
    │   ├── images/             # Project images
    │   └── miscellaneous/      # Additional documents
    ├── sections/               # Individual JSON sections
    │   ├── project-details.json
    │   ├── equipment.json
    │   ├── alternates.json
    │   ├── recommendations.json
    │   └── summary.json
    └── output/                 # Generated PDF report
        └── ProjectName.pdf
```

## Security

This project handles API keys and other sensitive information. To ensure security:

1. **Environment Variables**: All sensitive data is stored in `.env.local` files that are excluded from version control.

2. **Pre-Commit Checks**: We have implemented pre-commit hooks that scan for potential secrets before allowing commits:
   ```bash
   # Install the pre-commit hooks (also done automatically on npm install)
   npm run setup:hooks
   
   # You can manually check for secrets in staged files
   npm run git:check-secrets
   ```

3. **Secret Management Guidelines**: See the full [`SECURITY.md`](./SECURITY.md) document for comprehensive guidelines on:
   - Setting up your environment safely
   - What to do if you accidentally commit a secret
   - Removing secrets from Git history
   - Best practices for handling API keys

4. **Automatic Protection**: GitHub's secret scanning is enabled for this repository, which will block pushes containing detected secrets.

## How It Works

The modular report generation process follows these steps:

1. Project Setup: Create a project and add context files (specs, schedules, etc.)
2. Section Generation: For each section:
   - Read all context files from the project folder
   - Send them to Claude API with a section-specific prompt
   - Parse the resulting JSON and save it to the project's section folder
3. JSON Merging: Combine all section JSON files into a complete report JSON
4. PDF Generation: Convert the merged JSON into a beautifully formatted PDF report

## Fonts Setup

The BuildVision report uses the Inter font family for consistent, professional typography. The required font files are included in the repository and do not need to be installed system-wide.

### About the Included Fonts

- **Inter** - A modern, highly readable sans-serif font designed for screen interfaces
- Located in the `fonts/inter/` directory
- Various weights included (Regular, Bold, Light, Medium, SemiBold, etc.)

### First-Time Setup

When running on a new machine, the system needs to know where to find these fonts. The template is configured to look for fonts in a specific location which may need to be updated:

1. Open the file `templates/buildvision.cls`
2. Find all instances of the font path (search for `Path =`)
3. Update the path to match your local repository location:

```latex
Path = /path/to/your/repo/fonts/inter/Inter Desktop/
```

For example, if you cloned the repository to `/home/user/BVReports`, the path should be:
```latex
Path = /home/user/BVReports/fonts/inter/Inter Desktop/
```

Alternatively, you can use a relative path like this:
```latex
Path = ../fonts/inter/Inter Desktop/
```

### Font Troubleshooting

If you encounter font-related issues in your PDF generation:

1. **Missing fonts**: Ensure all font files exist in `fonts/inter/Inter Desktop/` 
2. **Font not found errors**: Verify the path in `templates/buildvision.cls` is correct
3. **Incorrect font rendering**: Make sure XeLaTeX is properly installed (it's required for custom font support)

## Troubleshooting

If you encounter issues:

1. Ensure LaTeX is properly installed and accessible from the command line
   - Use the environment variable `XELATEX_PATH` if LaTeX is installed in a non-standard location
2. Check that your JSON files are valid and properly formatted
   - Use a JSON validator tool if you're getting parsing errors
3. Look for error messages in the console output
4. Verify that the BuildVisionLogo.png file exists in the root directory
5. Check the `temp` directory for LaTeX compilation logs if PDFs aren't generating correctly
6. If fonts aren't rendering correctly, see the [Fonts Setup](#fonts-setup) section above

## License

ISC
