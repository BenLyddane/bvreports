/**
 * BuildVision PDF Report Generator - Main Entry Point
 * 
 * This is the main entry point for the BuildVision PDF Report Generator.
 * It processes JSON files from the projects folder and converts them
 * into beautifully formatted PDF reports using LaTeX.
 */

const fs = require('fs-extra');
const path = require('path');
const CONFIG = require('./config');
const { 
  findJsonFiles, 
  ensureDirectories, 
  getProcessedFiles, 
  updateProcessedFiles 
} = require('./utils');
const { generatePDF } = require('./pdf-generator');

/**
 * Main function to run the PDF generation process
 */
async function main() {
  try {
    console.log('BuildVision PDF Report Generator');
    console.log('--------------------------------');
    
    // Ensure required directories exist
    await ensureDirectories();
    
    // Create temp directory if it doesn't exist
    await fs.ensureDir(CONFIG.latex.tempDir);
    
    // Get list of processed files or create empty list if it doesn't exist
    const processedFiles = await getProcessedFiles();
    
    // Get all JSON files in the projects directory
    const jsonFiles = await findJsonFiles(CONFIG.paths.projectsDir);
    console.log(`Found ${jsonFiles.length} JSON files in projects directory`);
    
    // Process all files regardless of whether they've been processed before
    const filesToProcess = jsonFiles;
    
    console.log(`Processing ${filesToProcess.length} new or modified files`);
    
    // Process each file
    for (const file of filesToProcess) {
      const relativePath = path.relative(CONFIG.paths.projectsDir, file);
      console.log(`\nProcessing: ${relativePath}`);
      
      try {
        // Generate PDF from JSON
        const pdfPath = await generatePDF(file);
        
        // Update processed files list
        const fileStats = fs.statSync(file);
        const processedEntry = {
          path: relativePath,
          lastModified: fileStats.mtime.getTime(),
          pdfPath: path.relative(__dirname, pdfPath)
        };
        
        // Update or add entry to processed files list
        const existingIndex = processedFiles.findIndex(entry => entry.path === relativePath);
        if (existingIndex >= 0) {
          processedFiles[existingIndex] = processedEntry;
        } else {
          processedFiles.push(processedEntry);
        }
        
        console.log(`Successfully generated PDF: ${path.basename(pdfPath)}`);
      } catch (err) {
        console.error(`Error processing ${relativePath}:`, err.message);
      }
    }
    
    // Save updated processed files list
    await updateProcessedFiles(processedFiles);
    
    // Clean up temp directory
    await fs.emptyDir(CONFIG.latex.tempDir);
    
    console.log('\nPDF generation complete!');
    if (filesToProcess.length > 0) {
      console.log(`Generated ${filesToProcess.length} PDF reports in: ${CONFIG.paths.outputDir}`);
    } else {
      console.log('No new files to process.');
    }
    
  } catch (err) {
    console.error('Error in PDF generation process:', err);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  main
};
