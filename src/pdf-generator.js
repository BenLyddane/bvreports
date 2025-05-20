/**
 * BuildVision PDF Report Generator - PDF Generator
 * 
 * This module handles the generation of PDFs from JSON files.
 */

const path = require('path');
const CONFIG = require('./config');
const { parseJsonFile } = require('./json-parser');
const { generateLatex } = require('./latex-generator');
const { compilePdf } = require('./pdf-compiler');

/**
 * Generate a PDF from a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<string>} - Path to generated PDF
 */
async function generatePDF(filePath) {
  try {
    // Parse JSON file
    console.log('Parsing JSON file...');
    const parsedData = await parseJsonFile(filePath);
    
    // Generate LaTeX code
    console.log('Generating LaTeX code...');
    const reportTitle = parsedData.jsonData.reportTitle || path.basename(filePath, '.json');
    const latexCode = generateLatex(parsedData, reportTitle);
    
    // Output PDF path - Use project-specific output directory if it's a project JSON file
    let pdfPath;
    
    // Extract the project name from the file path
    const fileName = path.basename(filePath, '.json');
    
    // Check if this is a project file (inside a project directory)
    const projectsDir = CONFIG.paths.projectsDir;
    if (filePath.includes(projectsDir)) {
      // Extract the project name from the path
      const pathParts = filePath.split(path.sep);
      const projectsIndex = pathParts.indexOf('projects');
      
      if (projectsIndex >= 0 && projectsIndex < pathParts.length - 1) {
        const projectName = pathParts[projectsIndex + 1];
        
        // Use the project's output directory
        const projectOutputDir = path.join(projectsDir, projectName, 'output');
        // Ensure the output directory exists
        const fs = require('fs-extra');
        fs.ensureDirSync(projectOutputDir);
        
        pdfPath = path.join(projectOutputDir, `${fileName}.pdf`);
        
        // Also copy to the root output directory for backward compatibility
        const rootPdfPath = path.join(CONFIG.paths.outputDir, `${fileName}.pdf`);
        
        // Compile PDF to project directory first
        console.log(`Compiling LaTeX to PDF in project directory: ${projectOutputDir}`);
        await compilePdf(latexCode, pdfPath);
        
        // Then copy to root output directory
        console.log(`Copying PDF to root output directory: ${rootPdfPath}`);
        await fs.copy(pdfPath, rootPdfPath);
      } else {
        // Default to root output directory if we can't determine project
        pdfPath = path.join(CONFIG.paths.outputDir, `${fileName}.pdf`);
      }
    } else {
      // Not a project file, use the root output directory
      pdfPath = path.join(CONFIG.paths.outputDir, `${fileName}.pdf`);
    }
    
    // Only compile directly if we haven't already compiled it for a project directory
    if (!pdfPath.includes(path.join(projectsDir, path.sep))) {
      // Compile LaTeX to PDF
      console.log('Compiling LaTeX to PDF...');
      await compilePdf(latexCode, pdfPath);
    }
    
    return pdfPath;
  } catch (err) {
    throw new Error(`Error generating PDF: ${err.message}`);
  }
}

module.exports = {
  generatePDF
};
