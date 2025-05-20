/**
 * BuildVision PDF Report Generator - Project Processor
 * 
 * This module handles processing project folders and context files.
 */

const fs = require('fs-extra');
const path = require('path');
const CONFIG = require('./config');

/**
 * Project structure constants
 */
const PROJECT_STRUCTURE = {
  CONTEXT_DIR: 'context',
  SPECS_DIR: 'specifications',
  SCHEDULES_DIR: 'schedules',
  IMAGES_DIR: 'images',
  MISC_DIR: 'miscellaneous',
  OUTPUT_DIR: 'output',
  SECTIONS_DIR: 'sections'
};

/**
 * Create a new project with proper folder structure
 * @param {string} projectName - Name of the project
 * @returns {string} - Path to the created project directory
 */
async function createProject(projectName) {
  try {
    // Sanitize project name to be filesystem-friendly
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_. ]/g, '').trim();
    
    // Create project directory in projects folder
    const projectDir = path.join(CONFIG.paths.projectsDir, sanitizedName);
    await fs.ensureDir(projectDir);
    
    // Create context directory structure
    const contextDir = path.join(projectDir, PROJECT_STRUCTURE.CONTEXT_DIR);
    await fs.ensureDir(contextDir);
    
    // Create subdirectories for different types of context files
    await fs.ensureDir(path.join(contextDir, PROJECT_STRUCTURE.SPECS_DIR));
    await fs.ensureDir(path.join(contextDir, PROJECT_STRUCTURE.SCHEDULES_DIR));
    await fs.ensureDir(path.join(contextDir, PROJECT_STRUCTURE.IMAGES_DIR));
    await fs.ensureDir(path.join(contextDir, PROJECT_STRUCTURE.MISC_DIR));
    
    // Create sections directory for modular JSON outputs
    await fs.ensureDir(path.join(projectDir, PROJECT_STRUCTURE.SECTIONS_DIR));
    
    // Create project output directory
    await fs.ensureDir(path.join(projectDir, PROJECT_STRUCTURE.OUTPUT_DIR));
    
    console.log(`Created project structure for: ${sanitizedName}`);
    return projectDir;
  } catch (error) {
    console.error(`Error creating project structure: ${error.message}`);
    throw error;
  }
}

/**
 * Get path to the context directory for a project
 * @param {string} projectName - Name of the project
 * @returns {string} - Path to the context directory
 */
function getContextDir(projectName) {
  return path.join(CONFIG.paths.projectsDir, projectName, PROJECT_STRUCTURE.CONTEXT_DIR);
}

/**
 * Get path to the sections directory for a project
 * @param {string} projectName - Name of the project
 * @returns {string} - Path to the sections directory
 */
function getSectionsDir(projectName) {
  return path.join(CONFIG.paths.projectsDir, projectName, PROJECT_STRUCTURE.SECTIONS_DIR);
}

/**
 * Get path to the output directory for a project
 * @param {string} projectName - Name of the project
 * @returns {string} - Path to the output directory
 */
function getOutputDir(projectName) {
  return path.join(CONFIG.paths.projectsDir, projectName, PROJECT_STRUCTURE.OUTPUT_DIR);
}

/**
 * Checks if a project exists
 * @param {string} projectName - Name of the project
 * @returns {Promise<boolean>} - True if the project exists
 */
async function projectExists(projectName) {
  const projectDir = path.join(CONFIG.paths.projectsDir, projectName);
  try {
    await fs.access(projectDir);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Add a context file to a project
 * @param {string} projectName - Name of the project
 * @param {string} filePath - Path to the file to add
 * @param {string} contextType - Type of context (specs, schedules, images, misc)
 * @returns {Promise<string>} - Path to the copied file
 */
async function addContextFile(projectName, filePath, contextType = 'miscellaneous') {
  try {
    // Validate context type
    if (!Object.values(PROJECT_STRUCTURE).includes(contextType)) {
      contextType = PROJECT_STRUCTURE.MISC_DIR;
    }
    
    // Get project context directory
    const projectDir = path.join(CONFIG.paths.projectsDir, projectName);
    const contextTypeDir = path.join(projectDir, PROJECT_STRUCTURE.CONTEXT_DIR, contextType);
    
    // Ensure the context type directory exists
    await fs.ensureDir(contextTypeDir);
    
    // Copy the file to the appropriate context directory
    const fileName = path.basename(filePath);
    const targetPath = path.join(contextTypeDir, fileName);
    await fs.copy(filePath, targetPath);
    
    console.log(`Added context file to ${projectName}/${contextType}: ${fileName}`);
    return targetPath;
  } catch (error) {
    console.error(`Error adding context file: ${error.message}`);
    throw error;
  }
}

/**
 * Get section file paths for a project
 * @param {string} projectName - Name of the project
 * @returns {Object} - Paths to sections
 */
function getSectionPaths(projectName) {
  const sectionsDir = getSectionsDir(projectName);
  
  return {
    projectDetails: path.join(sectionsDir, 'project-details.json'),
    equipment: path.join(sectionsDir, 'equipment.json'),
    alternates: path.join(sectionsDir, 'alternates.json'),
    recommendations: path.join(sectionsDir, 'recommendations.json'),
    summary: path.join(sectionsDir, 'summary.json')
  };
}

/**
 * Get merged output file path for a project
 * @param {string} projectName - Name of the project
 * @returns {string} - Path to the merged output file
 */
function getMergedOutputPath(projectName) {
  const projectDir = path.join(CONFIG.paths.projectsDir, projectName);
  return path.join(projectDir, `${projectName}.json`);
}

/**
 * List all projects in the projects directory
 * @returns {Promise<Array>} - Array of project names
 */
async function listProjects() {
  try {
    // Get list of directories in the projects folder
    const projectDirs = await fs.readdir(CONFIG.paths.projectsDir);
    
    // Filter to include only directories that have the proper project structure
    const projects = [];
    for (const dir of projectDirs) {
      const projectDir = path.join(CONFIG.paths.projectsDir, dir);
      const stats = await fs.stat(projectDir);
      
      if (stats.isDirectory()) {
        // Check if it has a context directory (basic check for project structure)
        const contextDir = path.join(projectDir, PROJECT_STRUCTURE.CONTEXT_DIR);
        try {
          await fs.access(contextDir);
          projects.push(dir);
        } catch (error) {
          // Not a proper project directory, skip
        }
      }
    }
    
    return projects;
  } catch (error) {
    console.error(`Error listing projects: ${error.message}`);
    throw error;
  }
}

/**
 * Set up a project by moving existing files into the context folder
 * @param {string} projectName - Name of the project
 * @returns {Promise<string>} - Path to the created project directory
 */
async function setupProjectFromExistingFiles(projectName) {
  try {
    console.log(`Setting up project from existing files: ${projectName}`);
    
    // Sanitize project name to be filesystem-friendly
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_. ]/g, '').trim();
    
    // Get project directory path
    const projectDir = path.join(CONFIG.paths.projectsDir, sanitizedName);
    
    // Check if project directory exists
    const projectExists = await fs.pathExists(projectDir);
    if (!projectExists) {
      throw new Error(`Project directory ${projectDir} does not exist`);
    }
    
    // Create the proper project structure
    await createProject(sanitizedName);
    
    // Get list of files at root level of project directory (excluding directories)
    const files = await fs.readdir(projectDir, { withFileTypes: true });
    const rootFiles = files.filter(file => file.isFile());
    
    // Create context directory
    const contextDir = path.join(projectDir, PROJECT_STRUCTURE.CONTEXT_DIR);
    await fs.ensureDir(contextDir);
    
    // Process each root file
    for (const file of rootFiles) {
      const sourcePath = path.join(projectDir, file.name);
      const targetPath = path.join(contextDir, file.name);
      
      // Skip project JSON files
      if (path.extname(file.name) === '.json' && file.name === `${projectName}.json`) {
        console.log(`Skipping project JSON file: ${file.name}`);
        continue;
      }
      
      // Move the file to the context directory
      await fs.move(sourcePath, targetPath, { overwrite: true });
      console.log(`Moved ${file.name} to context folder`);
    }
    
    console.log(`Project setup complete for: ${sanitizedName}`);
    return projectDir;
  } catch (error) {
    console.error(`Error setting up project: ${error.message}`);
    throw error;
  }
}

module.exports = {
  PROJECT_STRUCTURE,
  createProject,
  getContextDir,
  getSectionsDir,
  getOutputDir,
  projectExists,
  addContextFile,
  getSectionPaths,
  getMergedOutputPath,
  listProjects,
  setupProjectFromExistingFiles
};
