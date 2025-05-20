/**
 * BuildVision PDF Report Generator - Complete Project Processing Script
 * 
 * This script provides a one-command solution to process all projects:
 * 1. Sets up project structure if needed (moving files to context folder)
 * 2. Generates all JSON sections using Claude API
 * 3. Merges sections
 * 4. Generates the final PDF report
 */

const fs = require('fs-extra');
const path = require('path');
const { setupProjectFromExistingFiles, projectExists } = require('./project-processor');
const { generateReport, generateSection, generateAllSections } = require('./report-generator');

/**
 * Process a single project from end to end
 * @param {string} projectName - Name of the project
 * @param {boolean} regenerate - Whether to regenerate existing sections
 * @returns {Promise<Object>} - Result object with status and any errors
 */
async function processProject(projectName, regenerate = false) {
  try {
    console.log(`\n===== Processing project: ${projectName} =====`);
    
    // Step 1: Set up the project if needed (moves files to context)
    console.log(`\nStep 1: Setting up project structure...`);
    
    // Check if project exists
    if (!(await projectExists(projectName))) {
      throw new Error(`Project not found: ${projectName}`);
    }
    
    // Check if project needs to be set up
    const projectDir = path.join(__dirname, '..', 'projects', projectName);
    const contextDir = path.join(projectDir, 'context');
    
    if (!await fs.pathExists(contextDir)) {
      console.log(`Setting up project structure for ${projectName}...`);
      await setupProjectFromExistingFiles(projectName);
      console.log(`Project structure set up successfully.`);
    } else {
      console.log(`Project structure already exists. Continuing...`);
    }
    
    // Step 2: Generate report (this handles generating sections, merging, and PDF generation)
    console.log(`\nStep 2: Generating report...`);
    await generateReport(projectName, regenerate);
    
    console.log(`\nProject ${projectName} processed successfully!`);
    return { status: 'success' };
    
  } catch (error) {
    console.error(`Error processing project ${projectName}:`, error.message);
    return { status: 'failure', error: error.message };
  }
}

/**
 * Process all projects in the projects directory
 * @param {boolean} regenerate - Whether to regenerate existing sections
 */
async function processAllProjects(regenerate = false) {
  try {
    console.log('======================================');
    console.log('BuildVision Complete Project Processor');
    console.log('======================================');
    
    // Get list of directories in the projects folder
    const projectsDir = path.join(__dirname, '..', 'projects');
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    const dirs = entries.filter(entry => 
      entry.isDirectory() && 
      !entry.name.startsWith('.') &&
      !entry.name.includes('Template')
    );
    
    if (dirs.length === 0) {
      console.log('No project directories found to process.');
      return;
    }
    
    console.log(`Found ${dirs.length} projects to process:`);
    dirs.forEach(dir => console.log(`  - ${dir.name}`));
    console.log();
    
    // Process each project
    const results = {
      success: [],
      failure: []
    };
    
    for (const dir of dirs) {
      const projectName = dir.name;
      
      // Check if project already has output and we're not regenerating
      const outputFile = path.join(projectsDir, projectName, 'output', `${projectName}.pdf`);
      if (!regenerate && await fs.pathExists(outputFile)) {
        console.log(`Project ${projectName} already has output. Skipping...`);
        continue;
      }
      
      try {
        const result = await processProject(projectName, regenerate);
        if (result.status === 'success') {
          results.success.push(projectName);
        } else {
          results.failure.push({ name: projectName, error: result.error });
        }
      } catch (error) {
        console.error(`Error processing project ${projectName}:`, error.message);
        results.failure.push({ name: projectName, error: error.message });
      }
    }
    
    // Print summary
    console.log('\n===== Processing Summary =====');
    console.log(`Successfully processed: ${results.success.length} projects`);
    if (results.success.length > 0) {
      console.log('  - ' + results.success.join('\n  - '));
    }
    
    console.log(`\nFailed to process: ${results.failure.length} projects`);
    if (results.failure.length > 0) {
      results.failure.forEach(failure => {
        console.log(`  - ${failure.name}: ${failure.error}`);
      });
    }
    
    console.log('\nAll projects have been processed.');
    
  } catch (error) {
    console.error('Error in batch processing:', error);
  }
}

// If run as a script, handle arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  let regenerate = false;
  let projectName = null;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--regenerate') {
      regenerate = true;
    } else if (!args[i].startsWith('--')) {
      projectName = args[i];
    }
  }
  
  if (projectName) {
    // Process a single project
    processProject(projectName, regenerate)
      .then(() => {
        console.log('Processing completed');
      })
      .catch(err => {
        console.error('Processing failed:', err);
        process.exit(1);
      });
  } else {
    // Process all projects
    processAllProjects(regenerate)
      .then(() => {
        console.log('Batch processing completed');
      })
      .catch(err => {
        console.error('Batch processing failed:', err);
        process.exit(1);
      });
  }
}

module.exports = {
  processProject,
  processAllProjects
};
