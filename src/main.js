/**
 * BuildVision PDF Report Generator - Main Entry Point
 * 
 * This is the main entry point for the BuildVision PDF Report Generator.
 * It processes project folders, generates modular JSON sections using Claude API,
 * merges them, and converts them into beautifully formatted PDF reports using LaTeX.
 */

const fs = require('fs-extra');
const path = require('path');
const CONFIG = require('./config');
const { ensureDirectories } = require('./utils');
const { checkLatexInstallation } = require('./latex-setup');
const { 
  createProject,
  projectExists,
  listProjects,
  addContextFile,
  setupProjectFromExistingFiles
} = require('./project-processor');
const {
  generateReport,
  generateSection,
  generateAllSections
} = require('./report-generator');

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
BuildVision PDF Report Generator - Usage
----------------------------------------
Commands:
  node src/main.js                              Process all projects and generate PDFs
  node src/main.js --project <name>             Process a specific project and generate PDF
  node src/main.js --create <name>              Create a new project structure
  node src/main.js --list                       List all projects
  node src/main.js --add-context <project> <file> <type>  Add a context file to a project
  node src/main.js --generate-section <project> <section> Generate a specific section for a project
  node src/main.js --setup-from-files <project>           Setup project from existing files
  
Options:
  --regenerate                                  Regenerate all sections even if they exist
  
Section Types:
  projectDetails, equipment, alternates, recommendations, summary

Context Types:
  specifications, schedules, images, miscellaneous (default)

Example:
  node src/main.js --project "Acadia" --regenerate
  node src/main.js --generate-section "Acadia" recommendations
  node src/main.js --add-context "Acadia" "./specs.pdf" specifications
  `);
}

/**
 * Parse command line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsedArgs = {
    command: 'process-all', // Default command
    project: null,
    regenerate: false,
    section: null,
    contextFile: null,
    contextType: 'miscellaneous'
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--project':
        parsedArgs.command = 'process-project';
        parsedArgs.project = args[++i];
        break;
      case '--create':
        parsedArgs.command = 'create-project';
        parsedArgs.project = args[++i];
        break;
      case '--list':
        parsedArgs.command = 'list-projects';
        break;
      case '--add-context':
        parsedArgs.command = 'add-context';
        parsedArgs.project = args[++i];
        parsedArgs.contextFile = args[++i];
        if (args[i+1] && !args[i+1].startsWith('--')) {
          parsedArgs.contextType = args[++i];
        }
        break;
      case '--generate-section':
        parsedArgs.command = 'generate-section';
        parsedArgs.project = args[++i];
        parsedArgs.section = args[++i];
        break;
      case '--regenerate':
        parsedArgs.regenerate = true;
        break;
      case '--help':
  parsedArgs.command = 'help';
  break;
case '--setup-from-files':
  parsedArgs.command = 'setup-from-files';
  parsedArgs.project = args[++i];
  break;
default:
  if (arg.startsWith('--')) {
    console.warn(`Unknown option: ${arg}`);
  }
    }
  }
  
  return parsedArgs;
}

/**
 * Main function to run the PDF generation process
 */
async function main() {
  try {
    console.log('BuildVision PDF Report Generator');
    console.log('--------------------------------');
    
    // Parse command line arguments
    const args = parseArgs();
    
    // Show help if requested
    if (args.command === 'help') {
      printUsage();
      return;
    }
    
    // Check if LaTeX is installed
    const latexInstall = checkLatexInstallation();
    if (!latexInstall.isInstalled) {
      console.error('ERROR: LaTeX (specifically XeLaTeX) is not installed or not found.');
      console.error('This application requires LaTeX to generate PDF reports.');
      console.error(latexInstall.installInstructions);
      console.error('\nTip: If LaTeX is installed but not detected, you can set the XELATEX_PATH environment variable');
      console.error('     to specify the location of your xelatex executable.');
      process.exit(1);
    }
    
    console.log(`Using LaTeX compiler: ${CONFIG.latex.compiler}`);
    
    // Ensure required directories exist
    await ensureDirectories();
    
    // Create temp directory if it doesn't exist
    await fs.ensureDir(CONFIG.latex.tempDir);
    
    // Process the command
    switch (args.command) {
      case 'process-all':
        // List all projects
        const projects = await listProjects();
        
        if (projects.length === 0) {
          console.log('No projects found. Create a project first using --create option.');
          return;
        }
        
        console.log(`Found ${projects.length} projects to process.`);
        
        // Process each project
        for (const project of projects) {
          console.log(`\nProcessing project: ${project}`);
          try {
            await generateReport(project, args.regenerate);
          } catch (err) {
            console.error(`Error processing project ${project}:`, err.message);
          }
        }
        
        console.log('\nPDF generation complete!');
        break;
        
      case 'process-project':
        if (!args.project) {
          console.error('ERROR: No project name specified. Use --project <name>');
          printUsage();
          return;
        }
        
        // Check if project exists
        if (!(await projectExists(args.project))) {
          console.error(`ERROR: Project not found: ${args.project}`);
          return;
        }
        
        // Generate report for the project
        console.log(`Processing project: ${args.project}`);
        await generateReport(args.project, args.regenerate);
        
        console.log('\nPDF generation complete!');
        break;
        
      case 'create-project':
        if (!args.project) {
          console.error('ERROR: No project name specified. Use --create <name>');
          printUsage();
          return;
        }
        
        // Create a new project
        console.log(`Creating new project: ${args.project}`);
        await createProject(args.project);
        
        console.log(`Project created successfully. Add context files using --add-context option.`);
        break;
        
      case 'list-projects':
        // List all projects
        const projectList = await listProjects();
        
        if (projectList.length === 0) {
          console.log('No projects found. Create a project first using --create option.');
          return;
        }
        
        console.log('Available projects:');
        projectList.forEach(project => {
          console.log(`  - ${project}`);
        });
        break;
        
      case 'add-context':
        if (!args.project || !args.contextFile) {
          console.error('ERROR: Missing project name or context file path.');
          printUsage();
          return;
        }
        
        // Check if project exists
        if (!(await projectExists(args.project))) {
          console.error(`ERROR: Project not found: ${args.project}`);
          return;
        }
        
        // Check if context file exists
        try {
          await fs.access(args.contextFile);
        } catch (error) {
          console.error(`ERROR: Context file not found: ${args.contextFile}`);
          return;
        }
        
        // Add context file to the project
        console.log(`Adding context file to project ${args.project}: ${args.contextFile}`);
        await addContextFile(args.project, args.contextFile, args.contextType);
        
        console.log(`Context file added successfully.`);
        break;
        
      case 'generate-section':
        if (!args.project || !args.section) {
          console.error('ERROR: Missing project name or section type.');
          printUsage();
          return;
        }
        
        // Check if project exists
        if (!(await projectExists(args.project))) {
          console.error(`ERROR: Project not found: ${args.project}`);
          return;
        }
        
        // Validate section type
        const validSections = ['projectDetails', 'equipment', 'alternates', 'recommendations', 'summary'];
        if (!validSections.includes(args.section)) {
          console.error(`ERROR: Invalid section type: ${args.section}`);
          console.error(`Valid section types: ${validSections.join(', ')}`);
          return;
        }
        
        // Generate the specified section
        console.log(`Generating ${args.section} section for project: ${args.project}`);
        await generateSection(args.project, args.section);
        
        console.log(`Section generated successfully.`);
        break;
        
      case 'setup-from-files':
        if (!args.project) {
          console.error('ERROR: No project name specified. Use --setup-from-files <project>');
          printUsage();
          return;
        }
        
        // Check if project exists
        if (!(await projectExists(args.project))) {
          console.error(`ERROR: Project not found: ${args.project}`);
          return;
        }
        
        console.log(`Setting up project from existing files: ${args.project}`);
        await setupProjectFromExistingFiles(args.project);
        
        console.log(`Project setup complete.`);
        break;
        
      default:
        console.error(`ERROR: Unknown command: ${args.command}`);
        printUsage();
        return;
    }
    
    // Clean up temp directory
    await fs.emptyDir(CONFIG.latex.tempDir);
    
  } catch (err) {
    console.error('Error in PDF generation process:', err);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  main
};
