/**
 * BuildVision PDF Report Generator - File Manager
 * 
 * This module handles file uploads and management for the Claude Files API.
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

// Get API key from environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_KEY;

// Claude Files API configuration
const CLAUDE_FILES_API_URL = 'https://api.anthropic.com/v1/files';

// Supported file types and their processing configuration
const FILE_PROCESSING = {
  '.pdf': { 
    mimeType: 'application/pdf', 
    contentType: 'document',
    process: 'direct'
  },
  '.txt': { 
    mimeType: 'text/plain', 
    contentType: 'document',
    process: 'direct'
  },
  '.csv': { 
    mimeType: 'text/plain',
    contentType: 'document',
    process: 'convert'
  },
  '.png': { 
    mimeType: 'image/png', 
    contentType: 'image',
    process: 'direct'
  }
};

class FileManager {
  constructor() {
    this.cacheFileName = '.file-cache.json';
  }

  /**
   * Validate environment setup before using the Files API
   * @throws {Error} If environment variables are missing
   */
  validateEnvironment() {
    if (!ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_KEY environment variable is not set.\n\n' +
        'Please follow these steps:\n' +
        '1. Copy .env.example to .env.local\n' +
        '2. Add your API key to .env.local\n' +
        '3. Restart the application\n\n' +
        'You can get an API key from https://console.anthropic.com/'
      );
    }
  }

  /**
   * Get the cache file path for a project
   * @param {string} projectDir - Path to the project directory
   * @returns {string} - Path to the cache file
   */
  getCacheFilePath(projectDir) {
    return path.join(projectDir, this.cacheFileName);
  }

  /**
   * Load cached file IDs for a project
   * @param {string} projectDir - Path to the project directory
   * @returns {Object} - Cached file data
   */
  async loadCache(projectDir) {
    try {
      const cacheFilePath = this.getCacheFilePath(projectDir);
      await fs.access(cacheFilePath);
      return await fs.readJson(cacheFilePath);
    } catch (error) {
      // Cache file doesn't exist or is invalid, return empty cache
      return { uploadedFiles: {}, tempFiles: {} };
    }
  }

  /**
   * Save cached file IDs for a project
   * @param {string} projectDir - Path to the project directory
   * @param {Object} cacheData - Cache data to save
   */
  async saveCache(projectDir, cacheData) {
    const cacheFilePath = this.getCacheFilePath(projectDir);
    await fs.writeJson(cacheFilePath, cacheData, { spaces: 2 });
  }

  /**
   * Find all supported files in a project directory
   * @param {string} projectDir - Path to the project directory
   * @returns {Array} - List of supported file paths
   */
  async findSupportedFiles(projectDir) {
    const supportedFiles = [];
    const supportedExtensions = Object.keys(FILE_PROCESSING);
    
    // Recursively find all supported files
    const findFiles = async (dir) => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          // Skip cache and output directories
          if (item.name !== 'output' && !item.name.startsWith('.')) {
            await findFiles(itemPath);
          }
        } else if (item.isFile()) {
          // Skip cache files
          if (item.name === this.cacheFileName) {
            continue;
          }
          const ext = path.extname(item.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            supportedFiles.push(itemPath);
          }
        }
      }
    };
    
    await findFiles(projectDir);
    return supportedFiles;
  }

  /**
   * Convert CSV file to formatted text
   * @param {string} csvFilePath - Path to the CSV file
   * @returns {string} - Formatted text content
   */
  async convertCsvToText(csvFilePath) {
    try {
      const csvContent = await fs.readFile(csvFilePath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return `=== ${path.basename(csvFilePath)} ===\n\nEmpty CSV file\n`;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      let textOutput = `=== ${path.basename(csvFilePath)} ===\n\n`;
      textOutput += `Headers: ${headers.join(' | ')}\n`;
      textOutput += '='.repeat(50) + '\n\n';
      
      // Convert each row to readable format
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          textOutput += `Row ${i}:\n`;
          headers.forEach((header, index) => {
            const value = values[index] || 'N/A';
            textOutput += `  ${header}: ${value}\n`;
          });
          textOutput += '\n';
        }
      }
      
      return textOutput;
    } catch (error) {
      console.error(`Error converting CSV ${csvFilePath}:`, error);
      return `=== ${path.basename(csvFilePath)} ===\n\nError reading CSV file: ${error.message}\n`;
    }
  }

  /**
   * Process files for upload (convert CSV files to text)
   * @param {Array} filePaths - List of file paths to process
   * @param {string} projectDir - Project directory for temporary files
   * @returns {Array} - Processed file information
   */
  async processFiles(filePaths, projectDir) {
    const processedFiles = [];
    
    for (const filePath of filePaths) {
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      const config = FILE_PROCESSING[ext];
      
      if (!config) {
        console.warn(`Unsupported file type: ${ext} for file ${fileName}`);
        continue;
      }
      
      if (config.process === 'convert' && ext === '.csv') {
        // Convert CSV to text
        const textContent = await this.convertCsvToText(filePath);
        const tempTextFile = path.join(projectDir, fileName + '.converted.txt');
        await fs.writeFile(tempTextFile, textContent);
        
        processedFiles.push({
          originalFile: filePath,
          uploadFile: tempTextFile,
          fileName: fileName,
          fileType: config.mimeType,
          contentType: config.contentType,
          isConverted: true
        });
      } else {
        // Process file directly
        processedFiles.push({
          originalFile: filePath,
          uploadFile: filePath,
          fileName: fileName,
          fileType: config.mimeType,
          contentType: config.contentType,
          isConverted: false
        });
      }
    }
    
    return processedFiles;
  }

  /**
   * Normalize text file encoding to UTF-8
   * @param {string} filePath - Path to the text file
   * @returns {Buffer} - Normalized UTF-8 buffer
   */
  async normalizeTextFile(filePath) {
    try {
      // Read the file as a buffer first
      const fileBuffer = await fs.readFile(filePath);
      
      // Convert to string, handling different encodings
      let content = fileBuffer.toString('utf8');
      
      // Normalize line endings (convert CR and CRLF to LF)
      content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Split very long lines to prevent issues
      const lines = content.split('\n');
      const normalizedLines = [];
      
      for (const line of lines) {
        if (line.length > 1000) {
          // Split very long lines at word boundaries
          const words = line.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            if (currentLine.length + word.length + 1 > 1000) {
              if (currentLine) {
                normalizedLines.push(currentLine.trim());
                currentLine = word;
              } else {
                // Single word is too long, split it
                normalizedLines.push(word.substring(0, 1000));
                currentLine = word.substring(1000);
              }
            } else {
              currentLine += (currentLine ? ' ' : '') + word;
            }
          }
          
          if (currentLine) {
            normalizedLines.push(currentLine.trim());
          }
        } else {
          normalizedLines.push(line);
        }
      }
      
      // Join back and convert to UTF-8 buffer
      const normalizedContent = normalizedLines.join('\n');
      return Buffer.from(normalizedContent, 'utf8');
      
    } catch (error) {
      console.warn(`Error normalizing text file ${filePath}:`, error.message);
      // Fallback to original file buffer
      return await fs.readFile(filePath);
    }
  }

  /**
   * Upload a file to Claude Files API
   * @param {string} filePath - Path to the file to upload
   * @param {string} mimeType - MIME type of the file
   * @returns {string} - File ID from Claude API
   */
  async uploadFile(filePath, mimeType) {
    this.validateEnvironment();
    
    try {
      const fileName = path.basename(filePath);
      let fileBuffer;
      
      // For text files, normalize encoding to prevent UTF-8 issues
      if (mimeType === 'text/plain') {
        console.log(`Normalizing text file encoding: ${fileName}`);
        fileBuffer = await this.normalizeTextFile(filePath);
      } else {
        fileBuffer = await fs.readFile(filePath);
      }
      
      console.log(`Uploading file: ${fileName} (${mimeType})`);
      
      // Create form data using Node.js approach
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Append file buffer with proper options
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: mimeType
      });
      
      const response = await axios.post(CLAUDE_FILES_API_URL, formData, {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'files-api-2025-04-14',
          ...formData.getHeaders()
        }
      });
      
      const fileId = response.data.id;
      console.log(`Successfully uploaded ${fileName} with file_id: ${fileId}`);
      
      return fileId;
    } catch (error) {
      console.error(`Error uploading file ${filePath}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get file references for a project (upload if necessary)
   * @param {string} projectDir - Path to the project directory
   * @returns {Array} - Array of file reference objects
   */
  async getFileReferences(projectDir) {
    try {
      console.log(`Processing files for project: ${path.basename(projectDir)}`);
      
      // Load existing cache
      const cache = await this.loadCache(projectDir);
      
      // Find all supported files in the project
      const filePaths = await this.findSupportedFiles(projectDir);
      
      if (filePaths.length === 0) {
        console.log('No supported files found in project');
        return [];
      }
      
      // Process files (convert CSV to text if needed)
      const processedFiles = await this.processFiles(filePaths, projectDir);
      
      const fileReferences = [];
      let cacheUpdated = false;
      
      for (const fileInfo of processedFiles) {
        const { fileName, uploadFile, fileType, contentType, isConverted } = fileInfo;
        
        // Check if file is already cached
        if (cache.uploadedFiles[fileName]) {
          console.log(`Using cached file_id for ${fileName}: ${cache.uploadedFiles[fileName].file_id}`);
          
          fileReferences.push({
            fileName: fileName,
            fileId: cache.uploadedFiles[fileName].file_id,
            contentType: contentType,
            isConverted: isConverted
          });
        } else {
          // Upload new file
          try {
            const fileId = await this.uploadFile(uploadFile, fileType);
            
            // Update cache
            cache.uploadedFiles[fileName] = {
              file_id: fileId,
              uploaded_at: new Date().toISOString(),
              file_type: fileType,
              original_type: path.extname(fileName).substring(1),
              converted_from: isConverted ? 'csv' : null
            };
            
            if (isConverted) {
              cache.tempFiles = cache.tempFiles || {};
              cache.tempFiles[fileName + '.converted.txt'] = fileId;
            }
            
            cacheUpdated = true;
            
            fileReferences.push({
              fileName: fileName,
              fileId: fileId,
              contentType: contentType,
              isConverted: isConverted
            });
          } catch (error) {
            console.error(`Failed to upload ${fileName}:`, error.message);
            // Continue with other files
          }
        }
        
        // Clean up temporary converted files
        if (isConverted && uploadFile !== fileInfo.originalFile) {
          try {
            await fs.remove(uploadFile);
          } catch (cleanupError) {
            console.warn(`Failed to clean up temporary file ${uploadFile}:`, cleanupError.message);
          }
        }
      }
      
      // Save updated cache
      if (cacheUpdated) {
        await this.saveCache(projectDir, cache);
      }
      
      console.log(`Processed ${fileReferences.length} files for project`);
      return fileReferences;
      
    } catch (error) {
      console.error('Error getting file references:', error);
      throw error;
    }
  }

  /**
   * Clean up uploaded files from Claude API
   * @param {Array} fileIds - Array of file IDs to delete
   */
  async cleanupFiles(fileIds) {
    this.validateEnvironment();
    
    for (const fileId of fileIds) {
      try {
        await axios.delete(`${CLAUDE_FILES_API_URL}/${fileId}`, {
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'files-api-2025-04-14'
          }
        });
        console.log(`Deleted file: ${fileId}`);
      } catch (error) {
        console.warn(`Failed to delete file ${fileId}:`, error.response?.data || error.message);
      }
    }
  }

  /**
   * Clear cache for a project
   * @param {string} projectDir - Path to the project directory
   */
  async clearCache(projectDir) {
    try {
      const cacheFilePath = this.getCacheFilePath(projectDir);
      await fs.remove(cacheFilePath);
      console.log(`Cleared cache for project: ${path.basename(projectDir)}`);
    } catch (error) {
      console.warn(`Failed to clear cache:`, error.message);
    }
  }
}

module.exports = FileManager;
