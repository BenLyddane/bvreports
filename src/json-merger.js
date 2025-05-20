/**
 * BuildVision PDF Report Generator - JSON Merger
 * 
 * This module handles merging modular JSON sections into a complete report.
 */

const fs = require('fs-extra');
const path = require('path');
const { getSectionPaths, getMergedOutputPath } = require('./project-processor');

/**
 * Read a JSON file and parse its contents
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} - Parsed JSON object
 */
async function readJsonFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Merge JSON sections into a complete report
 * @param {string} projectName - Name of the project
 * @returns {Promise<Object>} - Merged JSON object
 */
async function mergeJsonSections(projectName) {
  try {
    console.log(`Merging JSON sections for project: ${projectName}`);
    
    // Get paths to section files
    const sectionPaths = getSectionPaths(projectName);
    
    // Initialize merged object with empty structures
    const mergedJson = {
      reportTitle: `BuildVision Project Report for ${projectName}`,
      customerInformation: {
        customerName: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        projectId: "",
        additionalFields: {}
      },
      projectInformation: {
        projectName: "",
        location: "",
        startDate: "",
        completionDate: "",
        budget: "",
        scope: "",
        projectUrl: "",
        additionalFields: {}
      },
      preparerInformation: {
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
        preparationDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
      },
      equipmentByType: [],
      suppliers: [],
      buildVisionRecommendations: [],
      conclusion: {
        summary: "",
        keyFindings: [],
        highestPriorityActions: []
      }
    };
    
    // Read and merge project details section
    const projectDetailsJson = await readJsonFile(sectionPaths.projectDetails);
    if (projectDetailsJson) {
      // Merge project details
      if (projectDetailsJson.reportTitle) {
        mergedJson.reportTitle = projectDetailsJson.reportTitle;
      }
      
      if (projectDetailsJson.customerInformation) {
        mergedJson.customerInformation = projectDetailsJson.customerInformation;
      }
      
      if (projectDetailsJson.projectInformation) {
        mergedJson.projectInformation = projectDetailsJson.projectInformation;
      }
      
      if (projectDetailsJson.preparerInformation) {
        // Merge preparerInformation but preserve today's date
        const todaysDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
        
        mergedJson.preparerInformation = projectDetailsJson.preparerInformation;
        
        // Always override the date with today's date
        mergedJson.preparerInformation.preparationDate = todaysDate;
      }
    }
    
    // Read and merge equipment section
    const equipmentJson = await readJsonFile(sectionPaths.equipment);
    if (equipmentJson && equipmentJson.equipmentByType) {
      mergedJson.equipmentByType = equipmentJson.equipmentByType;
    }
    
    // Read and merge alternates section
    const alternatesJson = await readJsonFile(sectionPaths.alternates);
    if (alternatesJson && alternatesJson.suppliers) {
      mergedJson.suppliers = alternatesJson.suppliers;
    }
    
    // Read and merge recommendations section
    const recommendationsJson = await readJsonFile(sectionPaths.recommendations);
    if (recommendationsJson && recommendationsJson.buildVisionRecommendations) {
      mergedJson.buildVisionRecommendations = recommendationsJson.buildVisionRecommendations;
    }
    
    // Read and merge summary section
    const summaryJson = await readJsonFile(sectionPaths.summary);
    if (summaryJson && summaryJson.conclusion) {
      mergedJson.conclusion = summaryJson.conclusion;
    }
    
    // Save the merged JSON
    const outputPath = getMergedOutputPath(projectName);
    await fs.writeJson(outputPath, mergedJson, { spaces: 2 });
    
    console.log(`Merged JSON saved to: ${outputPath}`);
    return mergedJson;
  } catch (error) {
    console.error(`Error merging JSON sections: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a specific section's JSON file for a project
 * @param {string} projectName - Name of the project
 * @param {string} sectionType - Type of section (projectDetails, equipment, etc.)
 * @param {Object} sectionData - JSON data for the section
 * @returns {Promise<string>} - Path to the saved JSON file
 */
async function saveSectionJson(projectName, sectionType, sectionData) {
  try {
    // Get section file path
    const sectionPaths = getSectionPaths(projectName);
    const sectionPath = sectionPaths[sectionType];
    
    if (!sectionPath) {
      throw new Error(`Invalid section type: ${sectionType}`);
    }
    
    // Save the section JSON
    await fs.writeJson(sectionPath, sectionData, { spaces: 2 });
    
    console.log(`Saved ${sectionType} JSON to: ${sectionPath}`);
    return sectionPath;
  } catch (error) {
    console.error(`Error saving section JSON: ${error.message}`);
    throw error;
  }
}

module.exports = {
  mergeJsonSections,
  saveSectionJson,
  readJsonFile
};
