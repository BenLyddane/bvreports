/**
 * BuildVision PDF Report Generator - Utilities
 * 
 * This file contains utility functions used throughout the application.
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const CONFIG = require('./config');

/**
 * Find all markdown files in a directory
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findMarkdownFiles(dir) {
  try {
    const files = await glob('**/*.md', { cwd: dir, absolute: true });
    return files;
  } catch (err) {
    throw new Error(`Failed to find markdown files: ${err.message}`);
  }
}

/**
 * Find all JSON files in a directory
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findJsonFiles(dir) {
  try {
    const files = await glob('**/*.json', { cwd: dir, absolute: true });
    return files;
  } catch (err) {
    throw new Error(`Failed to find JSON files: ${err.message}`);
  }
}

/**
 * Ensure all required directories exist
 * @returns {Promise<void>}
 */
async function ensureDirectories() {
  try {
    await fs.ensureDir(CONFIG.paths.outputDir);
    await fs.ensureDir(CONFIG.latex.tempDir);
    
    // Create processed files list if it doesn't exist
    if (!(await fs.pathExists(CONFIG.paths.processedListFile))) {
      await fs.writeJson(CONFIG.paths.processedListFile, []);
    }
  } catch (err) {
    throw new Error(`Failed to ensure directories: ${err.message}`);
  }
}

/**
 * Get list of processed files
 * @returns {Promise<Array>} - Array of processed file entries
 */
async function getProcessedFiles() {
  try {
    if (await fs.pathExists(CONFIG.paths.processedListFile)) {
      return await fs.readJson(CONFIG.paths.processedListFile);
    } else {
      return [];
    }
  } catch (err) {
    console.warn('Could not read processed files list, starting fresh:', err.message);
    return [];
  }
}

/**
 * Update the processed files list
 * @param {Array} processedFiles - Updated list of processed files
 * @returns {Promise<void>}
 */
async function updateProcessedFiles(processedFiles) {
  try {
    await fs.writeJson(CONFIG.paths.processedListFile, processedFiles, { spaces: 2 });
  } catch (err) {
    throw new Error(`Failed to update processed files list: ${err.message}`);
  }
}

/**
 * Clean up temporary files
 * @param {string} tempDir - Directory containing temporary files
 * @returns {Promise<void>}
 */
async function cleanupTempFiles(tempDir) {
  try {
    const files = await fs.readdir(tempDir);
    
    for (const file of files) {
      // Only remove auxiliary LaTeX files, not the PDF
      if (!['.pdf'].includes(path.extname(file))) {
        await fs.remove(path.join(tempDir, file));
      }
    }
  } catch (err) {
    console.warn(`Warning: Failed to clean up temporary files: ${err.message}`);
  }
}

/**
 * Escape special LaTeX characters in a string
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeLatex(text) {
  if (!text) return '';
  
  // Handle common case where text might be a number or other non-string
  if (typeof text !== 'string') {
    text = String(text);
  }
  
  // First, handle HTML entities
  text = text.replace(/&amp;/g, '\\&');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  
  // Replace ampersands with "and" for better readability in LaTeX
  // This is especially important for terms like "O&M" which would otherwise cause alignment issues
  text = text.replace(/\b([A-Za-z])&([A-Za-z])\b/g, '$1 and $2');
  
  // Replace LaTeX special characters with their escaped versions
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\n/g, '\\\\');
}

/**
 * Get an appropriate icon for a section based on its title
 * @param {string} title - Section title
 * @returns {string} - Icon for the section
 */
function getSectionIcon(title) {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('equipment')) return CONFIG.icons.equipment;
  if (lowerTitle.includes('design')) return CONFIG.icons.design;
  if (lowerTitle.includes('heat')) return CONFIG.icons.heating;
  if (lowerTitle.includes('pump')) return CONFIG.icons.pump;
  if (lowerTitle.includes('air')) return CONFIG.icons.air;
  if (lowerTitle.includes('distribution')) return CONFIG.icons.distribution;
  if (lowerTitle.includes('humidity')) return CONFIG.icons.humidity;
  if (lowerTitle.includes('refrigerant')) return CONFIG.icons.refrigerant;
  if (lowerTitle.includes('fan')) return CONFIG.icons.fan;
  if (lowerTitle.includes('recommendation')) return CONFIG.icons.recommendation;
  if (lowerTitle.includes('conclusion')) return CONFIG.icons.conclusion;
  
  // Default icon
  return CONFIG.icons.document;
}

/**
 * Format a date string
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'NA' || dateStr === 'N/A') return 'N/A';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (err) {
    return dateStr; // Return original if parsing fails
  }
}

module.exports = {
  findMarkdownFiles,
  findJsonFiles,
  ensureDirectories,
  getProcessedFiles,
  updateProcessedFiles,
  cleanupTempFiles,
  escapeLatex,
  getSectionIcon,
  formatDate
};
