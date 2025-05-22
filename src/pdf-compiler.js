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
 * Escape special characters in a string for use in a regular expression
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

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
    
    // Create a fonts directory in the temp directory
    const tempFontsDir = path.join(CONFIG.latex.tempDir, 'fonts', 'inter', 'Inter Desktop');
    await fs.ensureDir(tempFontsDir);
    
    // Copy the font files to the temp directory
    const fontSourceDir = path.join(__dirname, '..', 'fonts', 'inter', 'Inter Desktop');
    const fontFiles = await fs.readdir(fontSourceDir);
    for (const fontFile of fontFiles) {
      const sourcePath = path.join(fontSourceDir, fontFile);
      const destPath = path.join(tempFontsDir, fontFile);
      await fs.copy(sourcePath, destPath);
    }
    
    // Create a temporary templates directory
    const tempTemplatesDir = path.join(CONFIG.latex.tempDir, 'templates');
    await fs.ensureDir(tempTemplatesDir);
    
    // Read the buildvision.cls file
    const buildvisionClsPath = path.join(__dirname, '..', 'templates', 'buildvision.cls');
    let buildvisionCls = await fs.readFile(buildvisionClsPath, 'utf8');
    
    // Replace the font path placeholder with the actual font path
    // Ensure the path is properly escaped for LaTeX
    const fontPath = CONFIG.paths.fontPath.replace(/\\/g, '/');
    // Escape any special LaTeX characters in the path
    const escapedFontPath = fontPath.replace(/([&%$#_{}~^\\])/g, '\\$1');
    buildvisionCls = buildvisionCls.replace(/FONTPATH_PLACEHOLDER/g, escapedFontPath);
    
    console.log(`Using font path: ${escapedFontPath}`);
    
    // Write the modified buildvision.cls to the temporary templates directory
    const tempBuildvisionClsPath = path.join(tempTemplatesDir, 'buildvision.cls');
    await fs.writeFile(tempBuildvisionClsPath, buildvisionCls, 'utf8');
    
    // Copy the BuildVision logo to the temp directory
    const logoPath = CONFIG.paths.buildVisionLogo;
    const tempLogoPath = path.join(CONFIG.latex.tempDir, path.basename(logoPath));
    await fs.copy(logoPath, tempLogoPath);
    
    // Update the LaTeX code to use the local logo path
    latexCode = latexCode.replace(
      new RegExp(escapeRegExp(logoPath), 'g'),
      path.basename(logoPath)
    );
    
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
    // Set up environment variables for the compiler process
    const env = { ...process.env };
    
    // Add the fonts directory to the TEXINPUTS environment variable
    // The trailing '//' tells TeX to search subdirectories recursively
    const fontsDir = path.join(__dirname, '..', 'fonts');
    
    // TEXINPUTS format: path1:path2:path3:
    // The trailing colon is important as it tells TeX to also search in the default locations
    if (process.platform === 'win32') {
      // Windows uses semicolons as path separators
      env.TEXINPUTS = `${fontsDir}//;${env.TEXINPUTS || ''}`;
    } else {
      // Unix-like systems use colons as path separators
      env.TEXINPUTS = `${fontsDir}//:${env.TEXINPUTS || ''}`;
    }
    
    console.log(`Setting TEXINPUTS to: ${env.TEXINPUTS}`);
    
    // Spawn the process with the modified environment
    const compilerProcess = spawn(compiler, args, { env });
    
    let stdout = '';
    let stderr = '';
    
    compilerProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    compilerProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    compilerProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('LaTeX compilation failed:');
        console.error(stderr || stdout);
        reject(new Error(`LaTeX compilation failed with code ${code}`));
      }
    });
    
    compilerProcess.on('error', (err) => {
      reject(new Error(`Failed to start LaTeX compiler: ${err.message}`));
    });
  });
}

module.exports = {
  compilePdf
};
