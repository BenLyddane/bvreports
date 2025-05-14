/**
 * BuildVision PDF Report Generator - PDF Compiler
 * 
 * This module handles compiling LaTeX code into PDF files.
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const CONFIG = require('./config');
const { cleanupTempFiles } = require('./utils');

/**
 * Compile LaTeX code into a PDF file
 * @param {string} latexCode - LaTeX code to compile
 * @param {string} outputPath - Path to save the PDF file
 * @returns {Promise<string>} - Path to the generated PDF
 */
async function compilePdf(latexCode, outputPath) {
  try {
    // Create temp directory if it doesn't exist
    await fs.ensureDir(CONFIG.latex.tempDir);
    
    // Create a temporary LaTeX file
    const tempFileName = path.basename(outputPath, '.pdf');
    const tempFilePath = path.join(CONFIG.latex.tempDir, `${tempFileName}.tex`);
    
    // Write LaTeX code to the temporary file
    await fs.writeFile(tempFilePath, latexCode, 'utf8');
    
    // Compile the LaTeX file to PDF
    await runLatexCompiler(tempFilePath);
    
    // Copy the generated PDF to the output directory
    const tempPdfPath = path.join(CONFIG.latex.tempDir, `${tempFileName}.pdf`);
    await fs.copy(tempPdfPath, outputPath);
    
    // Clean up temporary files
    await cleanupTempFiles(CONFIG.latex.tempDir);
    
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to compile PDF: ${err.message}`);
  }
}

/**
 * Run the LaTeX compiler on a file
 * @param {string} filePath - Path to the LaTeX file
 * @returns {Promise<void>}
 */
function runLatexCompiler(filePath) {
  return new Promise((resolve, reject) => {
    // Get the directory containing the LaTeX file
    const fileDir = path.dirname(filePath);
    
    // Prepare the compiler command and arguments
    const compiler = CONFIG.latex.compiler;
    const args = [
      ...CONFIG.latex.compilerOptions,
      `-output-directory=${fileDir}`,
      filePath
    ];
    
    console.log(`Running LaTeX compiler: ${compiler} ${args.join(' ')}`);
    
    // Run the compiler twice to resolve references
    runCompilerProcess(compiler, args)
      .then(() => runCompilerProcess(compiler, args))
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Run a single compiler process
 * @param {string} compiler - Path to the compiler executable
 * @param {Array} args - Arguments for the compiler
 * @returns {Promise<void>}
 */
function runCompilerProcess(compiler, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(compiler, args);
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('LaTeX compilation failed:');
        console.error(stderr || stdout);
        reject(new Error(`LaTeX compilation failed with code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      reject(new Error(`Failed to start LaTeX compiler: ${err.message}`));
    });
  });
}

module.exports = {
  compilePdf
};
