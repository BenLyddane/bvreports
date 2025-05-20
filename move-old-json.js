/**
 * Move old JSON files from the root of the projects directory to the archive folder
 */

const fs = require('fs-extra');
const path = require('path');

async function moveOldJsonFiles() {
  try {
    console.log('Moving old JSON files to archive folder...');
    
    const projectsDir = path.join(__dirname, 'projects');
    const archiveDir = path.join(projectsDir, 'archive');
    
    // Ensure archive directory exists
    await fs.ensureDir(archiveDir);
    
    // Get all files in the projects directory
    const files = await fs.readdir(projectsDir);
    
    // Filter for JSON files in the root of the projects directory
    // Skip folders and the BuildVisionProjectTemplate.json (keeping it as reference)
    const jsonFiles = files.filter(file => {
      // Check if it's a file, not a directory
      const stats = fs.statSync(path.join(projectsDir, file));
      if (stats.isDirectory()) return false;
      
      return file.endsWith('.json') && 
             !file.includes('BuildVisionProjectTemplate');
    });
    
    if (jsonFiles.length === 0) {
      console.log('No JSON files found in the root of the projects directory.');
      return;
    }
    
    console.log(`Found ${jsonFiles.length} JSON files to move:`);
    jsonFiles.forEach(file => console.log(`  - ${file}`));
    console.log();
    
    // Move each JSON file to the archive directory
    for (const file of jsonFiles) {
      const sourcePath = path.join(projectsDir, file);
      const destPath = path.join(archiveDir, file);
      
      await fs.move(sourcePath, destPath);
      console.log(`Moved ${file} to archive folder`);
    }
    
    console.log('\nAll JSON files have been moved to the archive folder.');
    
  } catch (error) {
    console.error('Error moving JSON files:', error);
  }
}

// Execute the function
moveOldJsonFiles()
  .then(() => {
    console.log('Process completed');
  })
  .catch(err => {
    console.error('Process failed:', err);
    process.exit(1);
  });
