/**
 * BuildVision PDF Report Generator - Batch Project Conversion Script
 * 
 * This script converts all existing JSON project files to the new modular structure.
 */

const fs = require('fs-extra');
const path = require('path');
const { convertProject } = require('./convert-project');

/**
 * Convert all existing JSON projects to the new modular structure
 */
async function convertAllProjects() {
  try {
    console.log('Converting all projects to modular structure');
    console.log('-------------------------------------------');
    
    // Get list of JSON files in the projects directory
    const projectsDir = path.join(__dirname, '..', 'projects');
    const files = await fs.readdir(projectsDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.endsWith('_backup.json') && 
      !file.includes('Template')
    );
    
    if (jsonFiles.length === 0) {
      console.log('No projects found to convert.');
      return;
    }
    
    console.log(`Found ${jsonFiles.length} projects to convert:`);
    jsonFiles.forEach(file => console.log(`  - ${file}`));
    console.log();
    
    // Convert each project
    const results = {
      success: [],
      failure: []
    };
    
    for (const file of jsonFiles) {
      const projectName = path.basename(file, '.json');
      console.log(`\nProcessing ${projectName}...`);
      
      try {
        // Check if project has already been converted
        const projectDir = path.join(projectsDir, projectName);
        const sectionsDir = path.join(projectDir, 'sections');
        
        if (await fs.pathExists(sectionsDir)) {
          console.log(`Project ${projectName} already appears to be converted (sections directory exists).`);
          console.log('Skipping...');
          continue;
        }
        
        // Convert the project
        await convertProject(projectName);
        results.success.push(projectName);
      } catch (error) {
        console.error(`Error converting project ${projectName}:`, error.message);
        results.failure.push({ name: projectName, error: error.message });
      }
    }
    
    // Print summary
    console.log('\n===== Conversion Summary =====');
    console.log(`Successfully converted: ${results.success.length} projects`);
    if (results.success.length > 0) {
      console.log('  - ' + results.success.join('\n  - '));
    }
    
    console.log(`\nFailed to convert: ${results.failure.length} projects`);
    if (results.failure.length > 0) {
      results.failure.forEach(failure => {
        console.log(`  - ${failure.name}: ${failure.error}`);
      });
    }
    
    console.log('\nAll projects have been processed.');
    console.log('You can now use the new modular commands with these projects.');
    
  } catch (error) {
    console.error('Error in batch conversion process:', error);
  }
}

// If run as a script, execute the batch conversion function
if (require.main === module) {
  convertAllProjects()
    .then(() => {
      console.log('Batch conversion completed');
    })
    .catch(err => {
      console.error('Batch conversion failed:', err);
      process.exit(1);
    });
}

module.exports = {
  convertAllProjects
};
