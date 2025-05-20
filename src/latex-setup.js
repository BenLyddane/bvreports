/**
 * BuildVision PDF Report Generator - LaTeX Setup
 * 
 * This module handles LaTeX installation detection and configuration.
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Check if LaTeX (specifically xelatex) is installed
 * @returns {Object} - Object containing isInstalled and path properties
 */
function checkLatexInstallation() {
  // First check if there's an environment variable overriding the default path
  if (process.env.XELATEX_PATH) {
    try {
      // Verify the provided path works
      execSync(`"${process.env.XELATEX_PATH}" --version`, { stdio: 'ignore' });
      return {
        isInstalled: true,
        path: process.env.XELATEX_PATH,
        fromEnv: true
      };
    } catch (err) {
      console.warn(`Warning: XELATEX_PATH environment variable provided (${process.env.XELATEX_PATH}), but xelatex not found at that location.`);
    }
  }

  // Common installation paths by platform
  const commonPaths = {
    darwin: ['/Library/TeX/texbin/xelatex', '/usr/local/bin/xelatex'],
    linux: ['/usr/bin/xelatex', '/usr/local/bin/xelatex'],
    win32: ['xelatex', 'C:\\texlive\\bin\\win32\\xelatex.exe', 'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe']
  };

  // Try to find xelatex in PATH first (will work for all platforms)
  try {
    const command = process.platform === 'win32' ? 'where xelatex' : 'which xelatex';
    const pathOutput = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    
    if (pathOutput) {
      return {
        isInstalled: true,
        path: pathOutput,
        fromPath: true
      };
    }
  } catch (err) {
    // Not in PATH, continue to check common locations
  }

  // Check common locations based on platform
  const pathsToCheck = commonPaths[process.platform] || [];
  
  for (const latexPath of pathsToCheck) {
    try {
      // On Windows with just 'xelatex', we need a different check
      if (process.platform === 'win32' && latexPath === 'xelatex') {
        execSync('xelatex --version', { stdio: 'ignore' });
        return {
          isInstalled: true,
          path: 'xelatex', // Just use the command name, rely on PATH
          fromCommon: true
        };
      }
      
      // For explicit paths, check file existence first
      if (fs.existsSync(latexPath)) {
        try {
          execSync(`"${latexPath}" --version`, { stdio: 'ignore' });
          return {
            isInstalled: true,
            path: latexPath,
            fromCommon: true
          };
        } catch (err) {
          // File exists but not executable or not xelatex
        }
      }
    } catch (err) {
      // Continue checking other paths
    }
  }

  // XeLaTeX not found
  return {
    isInstalled: false,
    path: null,
    installInstructions: getLatexInstallInstructions()
  };
}

/**
 * Get instructions for installing LaTeX based on platform
 * @returns {string} - Installation instructions
 */
function getLatexInstallInstructions() {
  if (process.platform === 'darwin') {
    return 'MacTeX installation instructions: https://tug.org/mactex/';
  } else if (process.platform === 'win32') {
    return 'MiKTeX installation instructions: https://miktex.org/download';
  } else {
    return 'TeX Live installation instructions: https://tug.org/texlive/';
  }
}

/**
 * Get the best LaTeX compiler path for the current system
 * @returns {string} - Path to LaTeX compiler or null if not found
 */
function getBestLatexPath() {
  const result = checkLatexInstallation();
  
  if (result.isInstalled) {
    return result.path;
  }
  
  // Fallback to default paths, but these may not work
  if (process.platform === 'win32') {
    return 'xelatex';  // Try using PATH
  } else if (process.platform === 'darwin') {
    return '/Library/TeX/texbin/xelatex';
  } else {
    return '/usr/bin/xelatex';
  }
}

module.exports = {
  checkLatexInstallation,
  getBestLatexPath
};
