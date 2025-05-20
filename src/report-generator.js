/**
 * BuildVision PDF Report Generator - Report Generator
 * 
 * This module orchestrates the entire report generation process using the modular architecture.
 */

const path = require('path');
const fs = require('fs-extra');
const { generateSectionJson } = require('./claude-api');
const { mergeJsonSections, saveSectionJson } = require('./json-merger');
const { generatePDF } = require('./pdf-generator');
const { projectExists, getContextDir, getSectionPaths } = require('./project-processor');
const { getProjectDetailsPrompt } = require('./prompts/project-details-prompt');
const { getEquipmentPrompt } = require('./prompts/equipment-prompt');
const { getAlternatesPrompt } = require('./prompts/alternates-prompt');
const { getRecommendationsPrompt } = require('./prompts/recommendations-prompt');
const { getSummaryPrompt } = require('./prompts/summary-prompt');

/**
 * Generate a specific section of a report using Claude API
 * @param {string} projectName - Name of the project
 * @param {string} sectionType - Type of section to generate
 * @param {boolean} preserveExistingData - Whether to preserve existing data in the merged JSON
 * @returns {Promise<Object>} - Generated section data
 */
async function generateSection(projectName, sectionType, preserveExistingData = false) {
  try {
    // Validate project existence
    if (!(await projectExists(projectName))) {
      throw new Error(`Project not found: ${projectName}`);
    }
    
    // Get context directory for the project
    const contextDir = getContextDir(projectName);
    
    // Determine which prompt to use based on section type
    let prompt;
    switch (sectionType) {
      case 'projectDetails':
        prompt = getProjectDetailsPrompt();
        break;
      case 'equipment':
        prompt = getEquipmentPrompt();
        break;
      case 'alternates':
        prompt = getAlternatesPrompt();
        break;
      case 'recommendations':
        prompt = getRecommendationsPrompt();
        break;
      case 'summary':
        prompt = getSummaryPrompt();
        break;
      default:
        throw new Error(`Invalid section type: ${sectionType}`);
    }
    
    // For the summary section, include the previously generated sections as context
    let sectionData;
    if (sectionType === 'summary') {
      // Get paths to all section files
      const sectionPaths = getSectionPaths(projectName);
      const additionalContext = [];
      
      // For each previous section, check if it exists and add to context
      const previousSections = ['projectDetails', 'equipment', 'alternates', 'recommendations'];
      for (const section of previousSections) {
        try {
          // Check if the section file exists
          await fs.access(sectionPaths[section]);
          
          // Read the section content and add to context
          const sectionContent = await fs.readJson(sectionPaths[section]);
          additionalContext.push({
            name: `${section}.json`,
            content: JSON.stringify(sectionContent, null, 2)
          });
          console.log(`Added ${section} section to summary context`);
        } catch (error) {
          console.log(`Section ${section} not found or error accessing it: ${error.message}`);
        }
      }
      
      // Generate the summary section with the additional context
      console.log(`Generating ${sectionType} section for project: ${projectName} with ${additionalContext.length} previous sections as context`);
      
      // Process the regular context files
      const { processContextFiles } = require('./claude-api');
      const regularContext = await processContextFiles(contextDir);
      
      // Combine regular and additional context
      const combinedContext = [...regularContext, ...additionalContext];
      
      // Generate the section using Claude API with the combined context
      const { generateJsonSection } = require('./claude-api');
      sectionData = await generateJsonSection(prompt, combinedContext);
    } else {
      // Generate regular section using Claude API
      console.log(`Generating ${sectionType} section for project: ${projectName}`);
      sectionData = await generateSectionJson(contextDir, sectionType, prompt);
    }
    
    // For projectDetails section, preserve existing customer and project information if requested
    if (sectionType === 'projectDetails' && preserveExistingData) {
      try {
        // Get path to the merged JSON file for the project
        const mergedJsonPath = path.join(
          path.dirname(getSectionPaths(projectName).projectDetails),
          '..',
          `${projectName}.json`
        );
        
        // Check if the merged JSON exists
        await fs.access(mergedJsonPath);
        
        // Read the existing merged JSON
        const existingData = await fs.readJson(mergedJsonPath);
        
        // Preserve customer and project information
        if (existingData.customerInformation) {
          console.log(`Preserving existing customer information for ${projectName}`);
          sectionData.customerInformation = existingData.customerInformation;
        }
        
        if (existingData.projectInformation) {
          console.log(`Preserving existing project information for ${projectName}`);
          // Preserve all project information except for projectName which should come from the new data
          const newProjectName = sectionData.projectInformation.projectName;
          sectionData.projectInformation = {
            ...existingData.projectInformation,
            projectName: newProjectName
          };
        }
      } catch (error) {
        console.log(`No existing data found for ${projectName} or error accessing it: ${error.message}`);
      }
    }
    
    // Save the section data to the appropriate file
    await saveSectionJson(projectName, sectionType, sectionData);
    
    return sectionData;
  } catch (error) {
    console.error(`Error generating section ${sectionType}: ${error.message}`);
    throw error;
  }
}

/**
 * Generate all sections of a report
 * @param {string} projectName - Name of the project
 * @param {boolean} preserveExistingData - Whether to preserve existing data 
 * @returns {Promise<Object>} - Merged JSON data
 */
async function generateAllSections(projectName, preserveExistingData = false) {
  try {
    console.log(`Generating all sections for project: ${projectName}`);
    
    // Generate each section sequentially
    await generateSection(projectName, 'projectDetails', preserveExistingData);
    await generateSection(projectName, 'equipment');
    await generateSection(projectName, 'alternates');
    await generateSection(projectName, 'recommendations');
    await generateSection(projectName, 'summary');
    
    // Merge all sections into a complete JSON
    const mergedJson = await mergeJsonSections(projectName);
    
    return mergedJson;
  } catch (error) {
    console.error(`Error generating all sections: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a PDF report from a project
 * @param {string} projectName - Name of the project
 * @param {boolean} regenerateSections - Whether to regenerate all sections
 * @returns {Promise<string>} - Path to the generated PDF
 */
async function generateReport(projectName, regenerateSections = false) {
  try {
    // Validate project existence
    if (!(await projectExists(projectName))) {
      throw new Error(`Project not found: ${projectName}`);
    }
    
    let mergedJsonPath;
    
    // Check if we need to regenerate sections
    if (regenerateSections) {
      // When regenerating, we want to use the context data instead of preserving existing data
      const preserveExistingData = false;
      
      // Generate all sections and merge them
      await generateAllSections(projectName, preserveExistingData);
      mergedJsonPath = path.join(
        path.dirname(getSectionPaths(projectName).projectDetails),
        '..',
        `${projectName}.json`
      );
    } else {
      // Check if merged JSON already exists
      mergedJsonPath = path.join(
        path.dirname(getSectionPaths(projectName).projectDetails),
        '..',
        `${projectName}.json`
      );
      
      try {
        await fs.access(mergedJsonPath);
        console.log(`Using existing merged JSON: ${mergedJsonPath}`);
        
        // Even when using existing JSON, we should update the preparation date
        // Read the JSON file
        const existingJson = await fs.readJson(mergedJsonPath);
        
        // Update the preparation date to today
        if (existingJson.preparerInformation) {
          existingJson.preparerInformation.preparationDate = new Date().toISOString().split('T')[0];
          
          // Write back the updated JSON
          await fs.writeJson(mergedJsonPath, existingJson, { spaces: 2 });
          console.log(`Updated preparation date in existing JSON to today's date`);
        }
      } catch (error) {
        // Merged JSON doesn't exist, create it
        console.log(`Merged JSON not found. Generating sections...`);
        await generateAllSections(projectName);
      }
    }
    
    // Generate PDF from the merged JSON
    console.log(`Generating PDF for project: ${projectName}`);
    const pdfPath = await generatePDF(mergedJsonPath);
    
    console.log(`PDF generated successfully: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error(`Error generating report: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a specific section and update the merged JSON
 * @param {string} projectName - Name of the project
 * @param {string} sectionType - Type of section to generate
 * @returns {Promise<Object>} - Updated merged JSON data
 */
async function updateSection(projectName, sectionType) {
  try {
    // Generate the specified section
    await generateSection(projectName, sectionType);
    
    // Merge all sections (including the newly generated one)
    const mergedJson = await mergeJsonSections(projectName);
    
    return mergedJson;
  } catch (error) {
    console.error(`Error updating section ${sectionType}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  generateSection,
  generateAllSections,
  generateReport,
  updateSection
};
