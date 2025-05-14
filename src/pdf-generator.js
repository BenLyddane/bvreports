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
    
    // Output PDF path
    const pdfPath = path.join(CONFIG.paths.outputDir, `${path.basename(filePath, '.json')}.pdf`);
    
    // Compile LaTeX to PDF
    console.log('Compiling LaTeX to PDF...');
    await compilePdf(latexCode, pdfPath);
    
    return pdfPath;
  } catch (err) {
    throw new Error(`Error generating PDF: ${err.message}`);
  }
}

module.exports = {
  generatePDF
};
