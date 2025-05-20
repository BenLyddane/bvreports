/**
 * BuildVision PDF Report Generator - Claude API Integration
 * 
 * This module handles API calls to Claude for generating modular JSON sections.
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

// Get API key from environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_KEY;

/**
 * Validate environment setup before using the API
 * @returns {boolean} True if environment is properly set up
 * @throws {Error} If environment variables are missing
 */
function validateEnvironment() {
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
  return true;
}

// Claude API configuration
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219'; // Updated model

/**
 * Format a file to be used as context for Claude
 * @param {string} filePath - Path to the file
 * @returns {Object} - Formatted file object with name and content
 */
async function formatFileForContext(filePath) {
  try {
    const fileName = path.basename(filePath);
    const fileContent = await fs.readFile(filePath, 'utf8');
    return {
      name: fileName,
      content: fileContent
    };
  } catch (error) {
    console.error(`Error formatting file ${filePath} for context:`, error);
    throw error;
  }
}

/**
 * Process all context files from a project directory
 * @param {string} projectDir - Path to the project directory
 * @returns {Array} - Formatted context files
 */
async function processContextFiles(projectDir) {
  try {
    const contextFiles = [];
    const fileTypes = ['.txt', '.csv', '.json', '.md'];
    
    // Recursively find all text-based files in the project directory
    const files = await fs.readdir(projectDir, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(projectDir, file.name);
      
      if (file.isDirectory()) {
        // Recursively process subdirectories
        const subDirFiles = await processContextFiles(filePath);
        contextFiles.push(...subDirFiles);
      } else if (fileTypes.includes(path.extname(file.name).toLowerCase())) {
        // Process text-based files
        const formattedFile = await formatFileForContext(filePath);
        contextFiles.push(formattedFile);
      }
      // Note: PDF and image files would need additional processing that's not implemented here
    }
    
    return contextFiles;
  } catch (error) {
    console.error(`Error processing context files in ${projectDir}:`, error);
    throw error;
  }
}

/**
 * Generate JSON section using Claude API
 * @param {string} prompt - Specialized prompt for the specific section
 * @param {Array} contextFiles - Context files for Claude
 * @returns {Object} - Generated JSON object
 */
async function generateJsonSection(prompt, contextFiles) {
  try {
    // Make sure the environment is properly set up before proceeding
    validateEnvironment();
    
    console.log(`Calling Claude API with ${contextFiles.length} context files...`);
    
    // Format context files into a single string
    let contextString = '';
    for (const file of contextFiles) {
      contextString += `=== FILE: ${file.name} ===\n${file.content}\n\n`;
    }
    
    // Prepare request to Claude API
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: CLAUDE_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt + '\n\n' + contextString }
            ]
          }
        ],
        max_tokens: 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    // Extract JSON from Claude's response
    const assistantMessage = response.data.content[0].text;
    
    // Log the full response for debugging
    console.log("\n==== Claude's Raw Response ====");
    console.log(assistantMessage.substring(0, 300) + "...");
    
    // Look for JSON content between triple backticks
    const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let jsonContent;
    
    if (jsonMatch && jsonMatch[1]) {
      jsonContent = jsonMatch[1].trim();
      console.log("\nFound JSON between backticks");
    } else {
      // If no triple backticks, try to find JSON content directly
      const possibleJson = assistantMessage.trim();
      // Check if it starts with a curly brace
      if (possibleJson.startsWith('{') && possibleJson.endsWith('}')) {
        jsonContent = possibleJson;
        console.log("\nFound JSON without backticks");
      } else {
        // Try one more approach - look for any content that looks like JSON
        const roughJsonMatch = assistantMessage.match(/(\{[\s\S]*\})/);
        if (roughJsonMatch && roughJsonMatch[1]) {
          jsonContent = roughJsonMatch[1].trim();
          console.log("\nFound JSON using loose pattern match");
        } else {
          console.error("\nCould not find any JSON in Claude's response");
          // Save the response to a file for inspection
          const debugFile = path.join(__dirname, '..', 'claude_response_debug.txt');
          fs.writeFileSync(debugFile, assistantMessage);
          console.log(`Full response saved to ${debugFile}`);
          throw new Error('Could not extract valid JSON from Claude response');
        }
      }
    }
    
    try {
      // Parse the JSON content
      console.log("\nAttempting to parse JSON content...");
      return JSON.parse(jsonContent);
    } catch (jsonError) {
      console.error('Error parsing JSON from Claude response:', jsonError);
      console.error('Attempted to parse:', jsonContent.substring(0, 500) + '...');
      
      // Save the problematic JSON to a file for inspection
      const debugFile = path.join(__dirname, '..', 'failed_json_debug.txt');
      fs.writeFileSync(debugFile, jsonContent);
      console.log(`Failed JSON content saved to ${debugFile}`);
      
      throw new Error('Invalid JSON structure in Claude response');
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Simplified version to generate a complete JSON structure using Claude API
 * @param {string} projectDir - Path to the project directory
 * @param {string} sectionType - Type of section to generate (projectDetails, equipment, etc.)
 * @param {string} prompt - Specialized prompt for the specific section
 * @returns {Object} - Generated JSON object for the specified section
 */
async function generateSectionJson(projectDir, sectionType, prompt) {
  try {
    console.log(`Generating ${sectionType} JSON section for project: ${path.basename(projectDir)}`);
    
    // Process all context files from the project directory
    const contextFiles = await processContextFiles(projectDir);
    
    // Generate JSON using Claude API
    const sectionJson = await generateJsonSection(prompt, contextFiles);
    
    return sectionJson;
  } catch (error) {
    console.error(`Error generating ${sectionType} JSON section:`, error);
    throw error;
  }
}

module.exports = {
  generateSectionJson,
  processContextFiles
};
