/**
 * Script to copy JSON files from archive/context to each project's context folder
 * This will ensure that when regenerating reports, Claude has access to the original
 * project data with customer information
 */

const fs = require('fs-extra');
const path = require('path');

async function copyJsonToContext() {
  try {
    console.log('=== Copying JSON files from archive to project context folders ===');
    
    // Define paths
    const archiveContextDir = path.join(__dirname, 'projects', 'archive', 'context');
    const projectsDir = path.join(__dirname, 'projects');
    
    // Check if archive context directory exists
    if (!await fs.pathExists(archiveContextDir)) {
      console.error(`Archive context directory not found: ${archiveContextDir}`);
      return;
    }
    
    // Get all JSON files in archive context directory
    const files = await fs.readdir(archiveContextDir);
    const jsonFiles = files.filter(file => file.endsWith('.json') && !file.endsWith('_backup.json'));
    
    console.log(`Found ${jsonFiles.length} JSON files in archive context.`);
    
    // Process each JSON file
    for (const jsonFile of jsonFiles) {
      // The project name is the JSON filename without extension
      const projectName = path.basename(jsonFile, '.json');
      
      // Skip if this is a backup file or not a project name
      if (projectName === 'archive' || projectName.includes('_backup')) {
        continue;
      }
      
      // Check if project directory exists
      const projectDir = path.join(projectsDir, projectName);
      if (!await fs.pathExists(projectDir)) {
        console.log(`Project directory not found, skipping: ${projectName}`);
        continue;
      }
      
      // Check/create context directory
      const projectContextDir = path.join(projectDir, 'context');
      await fs.ensureDir(projectContextDir);
      
      // Check/create project-info directory within context
      const projectInfoDir = path.join(projectContextDir, 'project-info');
      await fs.ensureDir(projectInfoDir);
      
      // Source and destination paths
      const sourceJsonPath = path.join(archiveContextDir, jsonFile);
      const destJsonPath = path.join(projectInfoDir, 'project-data.json');
      
      // Copy the file
      await fs.copy(sourceJsonPath, destJsonPath);
      console.log(`Copied ${jsonFile} to ${projectName}/context/project-info/project-data.json`);
    }
    
    console.log('Copy process completed successfully');
    
  } catch (error) {
    console.error('Error copying JSON files:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  copyJsonToContext()
    .then(() => {
      console.log('Script execution complete');
    })
    .catch(err => {
      console.error('Script execution failed:', err);
      process.exit(1);
    });
}

module.exports = { copyJsonToContext };
