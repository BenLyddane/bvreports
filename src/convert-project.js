/**
 * BuildVision PDF Report Generator - Project Conversion Script
 * 
 * This script converts an existing JSON project file to the new modular structure.
 */

const fs = require('fs-extra');
const path = require('path');
const { 
  createProject, 
  PROJECT_STRUCTURE,
  getSectionPaths
} = require('./project-processor');
const { saveSectionJson } = require('./json-merger');

/**
 * Convert an existing JSON project to the new modular structure
 * @param {string} projectName - Name of the project (without .json extension)
 */
async function convertProject(projectName) {
  try {
    console.log(`Converting project: ${projectName}`);
    
    // Check if the original JSON file exists
    const originalJsonPath = path.join(__dirname, '..', 'projects', `${projectName}.json`);
    if (!await fs.pathExists(originalJsonPath)) {
      throw new Error(`Original JSON file not found: ${originalJsonPath}`);
    }
    
    // Read the original JSON file
    const projectData = await fs.readJson(originalJsonPath);
    console.log(`Read original project data from: ${originalJsonPath}`);
    
    // Create the new project structure
    await createProject(projectName);
    console.log(`Created new project structure for: ${projectName}`);
    
    // Make a backup copy of the original JSON
    const backupPath = path.join(__dirname, '..', 'projects', `${projectName}_backup.json`);
    await fs.copy(originalJsonPath, backupPath);
    console.log(`Created backup of original JSON: ${backupPath}`);
    
    // Get section paths
    const sectionPaths = getSectionPaths(projectName);
    
    // Extract and save project details section
    const projectDetailsSection = {
      reportTitle: projectData.reportTitle || `BuildVision Project Report for ${projectName}`,
      customerInformation: projectData.customerInformation || {
        customerName: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        projectId: "",
        additionalFields: {}
      },
      projectInformation: projectData.projectInformation || {
        projectName: "",
        location: "",
        startDate: "",
        completionDate: "",
        budget: "",
        scope: "",
        projectUrl: "",
        additionalFields: {}
      },
      preparerInformation: projectData.preparerInformation || {
        preparers: [
          {
            name: "Ben Lyddane",
            email: "Ben@BuildVision.io",
            phone: "202-365-8628"
          },
          {
            name: "Mackenzie Hoover",
            email: "Mackenzie@buildvision.io",
            phone: "843-609-3265"
          }
        ],
        preparationDate: ""
      }
    };
    
    await saveSectionJson(projectName, 'projectDetails', projectDetailsSection);
    console.log(`Saved project details section`);
    
    // Extract and save equipment section
    const equipmentSection = {
      equipmentByType: projectData.equipmentByType || []
    };
    
    await saveSectionJson(projectName, 'equipment', equipmentSection);
    console.log(`Saved equipment section`);
    
    // Extract and save alternates section
    const alternatesSection = {
      suppliers: projectData.suppliers || []
    };
    
    await saveSectionJson(projectName, 'alternates', alternatesSection);
    console.log(`Saved alternates section`);
    
    // Extract and save recommendations section
    const recommendationsSection = {
      buildVisionRecommendations: projectData.buildVisionRecommendations || []
    };
    
    await saveSectionJson(projectName, 'recommendations', recommendationsSection);
    console.log(`Saved recommendations section`);
    
    // Extract and save summary section
    const summarySection = {
      conclusion: projectData.conclusion || {
        summary: "",
        keyFindings: [],
        highestPriorityActions: []
      }
    };
    
    await saveSectionJson(projectName, 'summary', summarySection);
    console.log(`Saved summary section`);
    
    // Create a sample context text file to demonstrate the structure
    const contextDir = path.join(__dirname, '..', 'projects', projectName, PROJECT_STRUCTURE.CONTEXT_DIR);
    const sampleContextPath = path.join(contextDir, PROJECT_STRUCTURE.MISC_DIR, 'project-info.txt');
    
    await fs.writeFile(sampleContextPath, `
Project information for ${projectName}
====================================

This is a sample context file for the ${projectName} project.
Real context files would contain specifications, schedules, and other project documents
that Claude API can use to generate the JSON sections.

The original JSON data has been split into separate section files and placed in:
${path.join('projects', projectName, PROJECT_STRUCTURE.SECTIONS_DIR)}

This structure allows for modular generation and updating of individual sections.
`);
    
    console.log(`Added sample context file: ${sampleContextPath}`);
    
    // Copy the original JSON file to the project root
    const projectDir = path.join(__dirname, '..', 'projects', projectName);
    const projectJsonPath = path.join(projectDir, `${projectName}.json`);
    await fs.copy(originalJsonPath, projectJsonPath);
    console.log(`Copied original JSON to project root: ${projectJsonPath}`);
    
    console.log(`\nProject ${projectName} successfully converted to the new modular structure!`);
    console.log(`\nYou can now use the following commands to work with this project:`);
    console.log(`  - node src/main.js --project "${projectName}"`);
    console.log(`  - node src/main.js --generate-section "${projectName}" [section]`);
    console.log(`  - node src/main.js --add-context "${projectName}" [file] [type]`);
  } catch (error) {
    console.error(`Error converting project: ${error.message}`);
    throw error;
  }
}

// If run as a script, get project name from command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a project name (without .json extension)');
    console.error('Usage: node src/convert-project.js <project-name>');
    process.exit(1);
  }
  
  const projectName = args[0];
  
  convertProject(projectName)
    .then(() => {
      console.log('Conversion completed successfully');
    })
    .catch(err => {
      console.error('Conversion failed:', err);
      process.exit(1);
    });
}

module.exports = {
  convertProject
};
