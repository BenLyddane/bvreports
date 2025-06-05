/**
 * BuildVision PDF Report Generator - Claude API Integration
 * 
 * This module handles API calls to Claude for generating modular JSON sections.
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const FileManager = require('./file-manager');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

// Get API key from environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_KEY;

// Maximum number of retries for JSON fixing
const MAX_RETRIES = 2;

// Maximum number of retries for rate limiting
const MAX_RATE_LIMIT_RETRIES = 3;

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after the delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'; // Updated model

/**
 * Format a file to be used as context for Claude
 * @param {string} filePath - Path to the file
 * @returns {Object} - Formatted file object with name and content
 */
async function formatFileForContext(filePath) {
  try {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Handle PDF files differently
    if (fileExt === '.pdf') {
      return await extractPdfContent(filePath);
    }
    
    // Handle regular text files
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
 * Extract text content from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Object} - Formatted file object with name and content
 */
async function extractPdfContent(filePath) {
  try {
    const fileName = path.basename(filePath);
    console.log(`Extracting text from PDF: ${fileName}`);
    
    // Read the PDF file as a buffer
    const dataBuffer = await fs.readFile(filePath);
    
    // Parse the PDF content
    const pdfData = await pdfParse(dataBuffer);
    
    // Return the formatted content
    return {
      name: fileName,
      content: pdfData.text
    };
  } catch (error) {
    console.error(`Error extracting text from PDF ${filePath}:`, error);
    // Return a placeholder if PDF parsing fails
    return {
      name: path.basename(filePath),
      content: `[PDF CONTENT EXTRACTION FAILED: ${error.message}]`
    };
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
    const fileTypes = ['.txt', '.csv', '.json', '.md', '.pdf'];
    
    // Recursively find all text-based files in the project directory
    const files = await fs.readdir(projectDir, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(projectDir, file.name);
      
      if (file.isDirectory()) {
        // Recursively process subdirectories
        const subDirFiles = await processContextFiles(filePath);
        contextFiles.push(...subDirFiles);
      } else if (fileTypes.includes(path.extname(file.name).toLowerCase())) {
        // Skip cache files
        if (file.name === '.file-cache.json') {
          continue;
        }
        // Process text-based files and PDFs
        const formattedFile = await formatFileForContext(filePath);
        contextFiles.push(formattedFile);
      }
      // Note: Image files would need additional processing that's not implemented here
    }
    
    return contextFiles;
  } catch (error) {
    console.error(`Error processing context files in ${projectDir}:`, error);
    throw error;
  }
}

/**
 * Fix malformed JSON or convert non-JSON response to JSON using Claude
 * @param {string} responseContent - The malformed JSON or non-JSON response to fix/convert
 * @param {number} retryCount - Current retry attempt
 * @returns {Object} - Fixed and parsed JSON object
 */
async function fixJsonWithClaude(responseContent, retryCount = 0) {
  // Don't exceed the maximum number of retries
  if (retryCount >= MAX_RETRIES) {
    throw new Error(`Failed to fix JSON after ${MAX_RETRIES} attempts`);
  }

  try {
    console.log(`Attempting to fix/convert response to JSON (retry ${retryCount + 1}/${MAX_RETRIES})...`);
    
    // Determine if this looks like JSON or not
    const trimmedContent = responseContent.trim();
    const looksLikeJson = trimmedContent.startsWith('{') && trimmedContent.includes('}');
    
    let fixPrompt;
    if (looksLikeJson) {
      // This looks like malformed JSON, so fix syntax errors
      fixPrompt = `I have a JSON object that has syntax errors and won't parse. 
Please fix the JSON syntax errors and return ONLY the fixed JSON with no additional text or explanations.
Do not modify the structure or data, only fix syntax errors.

Here's the malformed JSON:

${responseContent}`;
    } else {
      // This doesn't look like JSON at all, so convert the content to JSON format
      fixPrompt = `I need you to convert the following text content into a valid JSON object. The content appears to be about manufacturers and suppliers for a construction project.

You must return ONLY a valid JSON object with this exact structure:
{
  "suppliers": [
    {
      "componentType": "",
      "suppliers": [
        {
          "manufacturer": "",
          "model": "",
          "isBasisOfDesign": true,
          "isListedAlternate": false,
          "representativeInfo": {
            "name": "",
            "company": "",
            "contact": ""
          },
          "costDifference": "",
          "compatibilityNotes": ""
        },
        {
          "manufacturer": "",
          "model": "",
          "isBasisOfDesign": false,
          "isListedAlternate": true,
          "representativeInfo": {
            "name": "",
            "company": "",
            "contact": ""
          },
          "costDifference": "",
          "compatibilityNotes": ""
        }
      ]
    }
  ]
}

Extract manufacturer and supplier information from the text below and format it as JSON. Do not include any explanatory text, markdown formatting, or additional notes. Return ONLY the JSON object:

${responseContent}`;
    }

    // Make request to Claude API
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: CLAUDE_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: fixPrompt }
            ]
          }
        ],
        max_tokens: 8000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    // Extract the fixed JSON from Claude's response
    const fixedContent = response.data.content[0].text;
    
    // Look for JSON content between triple backticks
    const jsonMatch = fixedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let fixedJson;
    
    if (jsonMatch && jsonMatch[1]) {
      fixedJson = jsonMatch[1].trim();
    } else {
      // If no backticks, use the full response if it looks like JSON
      const possibleJson = fixedContent.trim();
      if (possibleJson.startsWith('{') && possibleJson.endsWith('}')) {
        fixedJson = possibleJson;
      } else {
        // Try to find anything that looks like JSON
        const roughJsonMatch = fixedContent.match(/(\{[\s\S]*\})/);
        if (roughJsonMatch && roughJsonMatch[1]) {
          fixedJson = roughJsonMatch[1].trim();
        } else {
          // If we still can't find valid JSON, try again with a more specific prompt
          return fixJsonWithClaude(responseContent, retryCount + 1);
        }
      }
    }
    
    // Try to parse the fixed JSON
    try {
      return JSON.parse(fixedJson);
    } catch (parseError) {
      // If we still can't parse it, try again recursively with the improved but still broken JSON
      console.log("Fixed JSON still has issues, trying again...");
      return fixJsonWithClaude(fixedJson, retryCount + 1);
    }
  } catch (error) {
    console.error('Error in fixJsonWithClaude:', error);
    throw error;
  }
}

/**
 * Make a Claude API call with rate limiting support
 * @param {Object} requestConfig - Axios request configuration
 * @param {number} rateLimitRetryCount - Current rate limit retry count
 * @returns {Object} - API response
 */
async function makeClaudeApiCall(requestConfig, rateLimitRetryCount = 0) {
  try {
    const response = await axios.post(CLAUDE_API_URL, requestConfig.data, {
      headers: requestConfig.headers
    });
    return response;
  } catch (error) {
    // Handle rate limiting (429 errors)
    if (error.response?.status === 429) {
      if (rateLimitRetryCount >= MAX_RATE_LIMIT_RETRIES) {
        throw new Error(`Rate limit exceeded after ${MAX_RATE_LIMIT_RETRIES} retries`);
      }
      
      // Extract retry-after header
      const retryAfter = error.response.headers['retry-after'];
      const waitTime = retryAfter ? parseInt(retryAfter) : 5; // Default to 5 seconds if no header
      
      console.log(`Rate limited. Waiting ${waitTime} seconds before retry (attempt ${rateLimitRetryCount + 1}/${MAX_RATE_LIMIT_RETRIES})...`);
      
      // Wait for the specified time
      await sleep(waitTime * 1000);
      
      // Retry the request
      console.log(`Retrying API call after rate limit wait...`);
      return makeClaudeApiCall(requestConfig, rateLimitRetryCount + 1);
    }
    
    // Handle server errors (502, 529) with retry
    if (error.response?.status === 502 || error.response?.status === 529) {
      if (rateLimitRetryCount >= MAX_RATE_LIMIT_RETRIES) {
        throw new Error(`Server error ${error.response.status} after ${MAX_RATE_LIMIT_RETRIES} retries`);
      }
      
      const waitTime = 10; // Wait 10 seconds for server errors
      console.log(`Server error ${error.response.status}. Waiting ${waitTime} seconds before retry (attempt ${rateLimitRetryCount + 1}/${MAX_RATE_LIMIT_RETRIES})...`);
      
      await sleep(waitTime * 1000);
      
      console.log(`Retrying API call after server error wait...`);
      return makeClaudeApiCall(requestConfig, rateLimitRetryCount + 1);
    }
    
    // Log detailed error information for 400 errors
    if (error.response?.status === 400) {
      console.error('400 Bad Request Error Details:');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Request Headers:', JSON.stringify(error.config.headers, null, 2));
      console.error('Request Data Length:', error.config.data.length);
    }
    
    // Re-throw other errors (like 400 - Bad Request)
    throw error;
  }
}

/**
 * Generate JSON section using Claude API with Files API
 * @param {string} prompt - Specialized prompt for the specific section
 * @param {Array} fileReferences - File references from FileManager
 * @returns {Object} - Generated JSON object
 */
async function generateJsonSectionWithFiles(prompt, fileReferences) {
  try {
    // Make sure the environment is properly set up before proceeding
    validateEnvironment();
    
    console.log(`Calling Claude API with ${fileReferences.length} file references...`);
    
    // Build content array with prompt and file references
    const content = [{ type: 'text', text: prompt }];
    
    // Add file references as appropriate content blocks
    for (const fileRef of fileReferences) {
      if (fileRef.contentType === 'document') {
        content.push({
          type: 'document',
          source: {
            type: 'file',
            file_id: fileRef.fileId
          },
          title: fileRef.isConverted ? `${fileRef.fileName} (converted from CSV)` : fileRef.fileName,
          context: fileRef.isConverted ? 'Converted from CSV format for analysis' : undefined
        });
      } else if (fileRef.contentType === 'image') {
        content.push({
          type: 'image',
          source: {
            type: 'file',
            file_id: fileRef.fileId
          }
        });
      }
    }
    
    // Prepare request to Claude API with Files API
    const requestConfig = {
      data: {
        model: CLAUDE_MODEL,
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 8000
      },
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14'
      }
    };
    
    const response = await makeClaudeApiCall(requestConfig);
    
    // Extract JSON from Claude's response
    const assistantMessage = response.data.content[0].text;
    
    // Log the full response for debugging
    console.log("\n==== Claude's Raw Response (Files API) ====");
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
          const debugFile = path.join(__dirname, '..', 'claude_response_debug_files.txt');
          fs.writeFileSync(debugFile, assistantMessage);
          console.log(`Full response saved to ${debugFile}`);
          
          // Try to fix the response using Claude (treat the entire response as "malformed JSON")
          console.log("Attempting to convert non-JSON response to JSON with Claude...");
          try {
            const fixedJson = await fixJsonWithClaude(assistantMessage);
            console.log("Successfully converted response to JSON with Claude");
            return fixedJson;
          } catch (fixError) {
            console.error("Failed to convert response to JSON with Claude:", fixError);
            throw new Error('Could not extract valid JSON from Claude response');
          }
        }
      }
    }
    
    try {
      // Try to parse the JSON content
      console.log("\nAttempting to parse JSON content...");
      return JSON.parse(jsonContent);
    } catch (jsonError) {
      console.error('Error parsing JSON from Claude response:', jsonError);
      console.error('Attempted to parse:', jsonContent.substring(0, 500) + '...');
      
      // Save the problematic JSON to a file for inspection
      const debugFile = path.join(__dirname, '..', 'failed_json_debug_files.txt');
      fs.writeFileSync(debugFile, jsonContent);
      console.log(`Failed JSON content saved to ${debugFile}`);
      
      // Try to fix the JSON using Claude
      console.log("Attempting to fix JSON with Claude...");
      try {
        const fixedJson = await fixJsonWithClaude(jsonContent);
        console.log("Successfully fixed JSON with Claude");
        return fixedJson;
      } catch (fixError) {
        console.error("Failed to fix JSON with Claude:", fixError);
        throw new Error('Invalid JSON structure in Claude response');
      }
    }
  } catch (error) {
    console.error('Error calling Claude API with Files API:', error);
    throw error;
  }
}

/**
 * Generate JSON section using Claude API (legacy text injection method)
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
    
    // Prepare request to Claude API with rate limiting
    const requestConfig = {
      data: {
        model: CLAUDE_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt + '\n\n' + contextString }
            ]
          }
        ],
        max_tokens: 8000
      },
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };
    
    const response = await makeClaudeApiCall(requestConfig);
    
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
          
          // Try to fix the response using Claude (treat the entire response as "malformed JSON")
          console.log("Attempting to convert non-JSON response to JSON with Claude...");
          try {
            const fixedJson = await fixJsonWithClaude(assistantMessage);
            console.log("Successfully converted response to JSON with Claude");
            return fixedJson;
          } catch (fixError) {
            console.error("Failed to convert response to JSON with Claude:", fixError);
            throw new Error('Could not extract valid JSON from Claude response');
          }
        }
      }
    }
    
    try {
      // Try to parse the JSON content
      console.log("\nAttempting to parse JSON content...");
      return JSON.parse(jsonContent);
    } catch (jsonError) {
      console.error('Error parsing JSON from Claude response:', jsonError);
      console.error('Attempted to parse:', jsonContent.substring(0, 500) + '...');
      
      // Save the problematic JSON to a file for inspection
      const debugFile = path.join(__dirname, '..', 'failed_json_debug.txt');
      fs.writeFileSync(debugFile, jsonContent);
      console.log(`Failed JSON content saved to ${debugFile}`);
      
      // Try to fix the JSON using Claude
      console.log("Attempting to fix JSON with Claude...");
      try {
        const fixedJson = await fixJsonWithClaude(jsonContent);
        console.log("Successfully fixed JSON with Claude");
        return fixedJson;
      } catch (fixError) {
        console.error("Failed to fix JSON with Claude:", fixError);
        throw new Error('Invalid JSON structure in Claude response');
      }
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

/**
 * Extract component types from equipment.json file
 * @param {string} projectName - Name of the project
 * @returns {Array} - List of exact component types from equipment.json
 */
async function extractComponentTypesFromEquipment(projectName) {
  try {
    const { getSectionPaths } = require('./project-processor');
    const sectionPaths = getSectionPaths(projectName);
    
    // Check if equipment.json exists
    await fs.access(sectionPaths.equipment);
    
    // Read the equipment.json file
    const equipmentData = await fs.readJson(sectionPaths.equipment);
    
    // Extract exact component types from equipmentByType array
    const componentTypes = [];
    if (equipmentData.equipmentByType && Array.isArray(equipmentData.equipmentByType)) {
      for (const equipmentGroup of equipmentData.equipmentByType) {
        if (equipmentGroup.equipmentType) {
          componentTypes.push(equipmentGroup.equipmentType);
        }
      }
    }
    
    console.log(`Extracted ${componentTypes.length} component types from equipment.json: ${componentTypes.join(', ')}`);
    return componentTypes;
    
  } catch (error) {
    console.error('Error reading equipment.json:', error.message);
    console.log('Falling back to empty component types array');
    return [];
  }
}

/**
 * Repair component-specific JSON issues
 * @param {string} jsonString - The malformed JSON string
 * @returns {string} - Repaired JSON string
 */
function repairComponentJson(jsonString) {
  let repaired = jsonString;
  
  // Fix common JSON syntax issues
  
  // 1. Fix missing commas between array elements
  repaired = repaired.replace(/}\s*{/g, '}, {');
  repaired = repaired.replace(/]\s*{/g, '], {');
  
  // 2. Fix trailing commas
  repaired = repaired.replace(/,\s*}/g, '}');
  repaired = repaired.replace(/,\s*]/g, ']');
  
  // 3. Balance brackets
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  
  // Add missing closing braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }
  
  // Add missing closing brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }
  
  // 4. Fix unescaped quotes in strings
  repaired = repaired.replace(/"([^"]*?)"([^":,}\]]*?)"([^":,}\]]*?)"/g, '"$1\\"$2\\"$3"');
  
  return repaired;
}

/**
 * Validate component structure
 * @param {Object} parsedJson - The parsed JSON object
 * @returns {boolean} - Whether the structure is valid
 */
function validateComponentStructure(parsedJson) {
  if (!parsedJson || typeof parsedJson !== 'object') {
    return false;
  }
  
  // Check for suppliers array
  if (!parsedJson.suppliers || !Array.isArray(parsedJson.suppliers)) {
    return false;
  }
  
  // Validate each supplier has required fields
  for (const supplier of parsedJson.suppliers) {
    if (!supplier.manufacturer || 
        typeof supplier.isBasisOfDesign !== 'boolean' ||
        typeof supplier.isListedAlternate !== 'boolean') {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate alternates for a single component type
 * @param {string} componentType - The exact component type from equipment.json
 * @param {Array} contextFiles - Context files for Claude
 * @returns {Object} - Generated component alternates JSON
 */
async function generateSingleComponentAlternates(componentType, contextFiles) {
  try {
    console.log(`Generating alternates for component type: ${componentType}`);
    
    // Create a simplified prompt that doesn't require Claude to get the component type right
    const componentPrompt = `
IMPORTANT: You are to return ONLY a JSON object without any additional text, explanation, or markdown formatting.

Analyze the context files and extract information about alternate manufacturers and suppliers for ${componentType} equipment.
Focus on ${componentType} related equipment.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "suppliers": [
    {
      "manufacturer": "",
      "model": "",
      "isBasisOfDesign": true,
      "isListedAlternate": false,
      "representativeInfo": {
        "name": "",
        "company": "",
        "contact": ""
      },
      "costDifference": "",
      "compatibilityNotes": ""
    }
  ]
}

Instructions:
- Extract manufacturers and models related to ${componentType}
- CRITICAL - Basis of Design Identification: A manufacturer can ONLY be marked as basis of design (isBasisOfDesign: true) if ONE of these conditions is met:
  * It is EXPLICITLY stated as "Basis of Design", "BoD", "Design Basis", or similar terminology in the specifications
  * It appears as the manufacturer name on mechanical schedules/drawings for that equipment type
  * It is explicitly called out as the "selected manufacturer" or "specified manufacturer" in the project documents
- If NO manufacturer meets the above criteria for basis of design, then ALL manufacturers should have isBasisOfDesign: false
- DO NOT randomly assign or guess a basis of design based on general industry knowledge or assumptions
- Identify listed alternates from specifications (isListedAlternate: true)
- Include representative information when available
- Provide cost differences as percentages (e.g., "+5%", "-3%")
- Add compatibility notes
- Suggest 2-3 additional suitable manufacturers if not already listed (set both isBasisOfDesign and isListedAlternate to false)

Extract information only from the provided context. Do not hallucinate or invent data.
The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes.
Do not include \`\`\`json markers.`;
    
    // Generate JSON using the existing generateJsonSection function
    let componentData;
    
    try {
      // Level 1: Try standard generation
      componentData = await generateJsonSection(componentPrompt, contextFiles);
    } catch (error) {
      console.log(`Standard generation failed for ${componentType}, attempting repair...`);
      
      // If standard generation failed, we need to handle it manually
      // Make the API call directly with rate limiting and apply our repair logic
      const requestConfig = {
        data: {
          model: CLAUDE_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: componentPrompt + '\n\n' + contextFiles.map(f => `=== FILE: ${f.name} ===\n${f.content}`).join('\n\n') }
              ]
            }
          ],
          max_tokens: 8000
        },
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      };
      
      const response = await makeClaudeApiCall(requestConfig);
      
      const rawResponse = response.data.content[0].text;
      console.log(`Raw response for ${componentType}:`, rawResponse.substring(0, 200) + '...');
      
      // Try to extract and repair JSON
      let jsonContent = rawResponse;
      
      // Look for JSON in backticks first
      const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1].trim();
      } else if (rawResponse.includes('{') && rawResponse.includes('}')) {
        // Extract JSON-like content
        const jsonStart = rawResponse.indexOf('{');
        const jsonEnd = rawResponse.lastIndexOf('}') + 1;
        jsonContent = rawResponse.substring(jsonStart, jsonEnd);
      }
      
      // Level 2: Try existing fixJsonWithClaude
      try {
        componentData = await fixJsonWithClaude(jsonContent);
      } catch (fixError) {
        console.log(`fixJsonWithClaude failed for ${componentType}, trying component-specific repair...`);
        
        // Level 3: Try component-specific repair
        try {
          const repairedJson = repairComponentJson(jsonContent);
          componentData = JSON.parse(repairedJson);
          
          console.log(`Successfully repaired JSON for ${componentType}`);
        } catch (repairError) {
          console.error(`All repair attempts failed for ${componentType}:`, repairError.message);
          throw new Error(`Failed to generate valid JSON for ${componentType}`);
        }
      }
    }
    
    // Validate the final result
    if (!validateComponentStructure(componentData)) {
      throw new Error(`Generated data for ${componentType} does not match expected structure`);
    }
    
    // Deterministically insert the correct component type
    const finalComponentData = {
      componentType: componentType,  // Use the exact component type from equipment.json
      suppliers: componentData.suppliers || []
    };
    
    console.log(`Successfully generated alternates for ${componentType}`);
    return finalComponentData;
    
  } catch (error) {
    console.error(`Error generating alternates for ${componentType}:`, error.message);
    throw error;
  }
}

/**
 * Generate alternates using split component approach
 * @param {string} projectName - Name of the project
 * @param {string} projectDir - Path to the project directory
 * @returns {Object} - Complete alternates JSON structure
 */
async function generateSplitAlternates(projectName, projectDir) {
  try {
    console.log('Generating alternates using split component approach...');
    
    // Process context files
    const contextFiles = await processContextFiles(projectDir);
    
    // Extract component types from equipment.json
    const componentTypes = await extractComponentTypesFromEquipment(projectName);
    
    if (componentTypes.length === 0) {
      console.log('No component types found in equipment.json, returning empty suppliers array');
      return { suppliers: [] };
    }
    
    const successfulComponents = [];
    const failedComponents = [];
    
    // Generate alternates for each component type
    for (const componentType of componentTypes) {
      try {
        const componentData = await generateSingleComponentAlternates(componentType, contextFiles);
        successfulComponents.push(componentData);
      } catch (error) {
        console.error(`Failed to generate alternates for ${componentType}:`, error.message);
        failedComponents.push({ componentType, error: error.message });
      }
    }
    
    // Report results
    console.log(`Successfully generated alternates for ${successfulComponents.length} component types`);
    if (failedComponents.length > 0) {
      console.log(`Failed to generate alternates for ${failedComponents.length} component types:`);
      failedComponents.forEach(failed => {
        console.log(`  - ${failed.componentType}: ${failed.error}`);
      });
    }
    
    // Merge successful components into final structure
    const finalAlternates = {
      suppliers: successfulComponents
    };
    
    return finalAlternates;
    
  } catch (error) {
    console.error('Error in generateSplitAlternates:', error.message);
    throw error;
  }
}

/**
 * Generate section JSON using Files API (new method)
 * @param {string} projectDir - Path to the project directory
 * @param {string} sectionType - Type of section to generate
 * @param {string} prompt - Specialized prompt for the specific section
 * @returns {Object} - Generated JSON object for the specified section
 */
async function generateSectionJsonWithFiles(projectDir, sectionType, prompt) {
  console.log(`Generating ${sectionType} JSON section with Files API for project: ${path.basename(projectDir)}`);
  
  // Use FileManager to get file references
  const fileManager = new FileManager();
  const fileReferences = await fileManager.getFileReferences(projectDir);
  
  console.log(`Found ${fileReferences.length} file references for ${sectionType}`);
  fileReferences.forEach(ref => {
    console.log(`  - ${ref.fileName} (${ref.contentType}) -> ${ref.fileId}`);
  });
  
  if (fileReferences.length === 0) {
    throw new Error('No files found for Files API processing');
  }
  
  // Generate JSON using Files API
  const sectionJson = await generateJsonSectionWithFiles(prompt, fileReferences);
  
  return sectionJson;
}

/**
 * Generate alternates using Files API with split component approach
 * @param {string} projectName - Name of the project
 * @param {string} projectDir - Path to the project directory
 * @returns {Object} - Complete alternates JSON structure
 */
async function generateSplitAlternatesWithFiles(projectName, projectDir) {
  console.log('Generating alternates using Files API with split component approach...');
  
  // Use FileManager to get file references
  const fileManager = new FileManager();
  const fileReferences = await fileManager.getFileReferences(projectDir);
  
  console.log(`Found ${fileReferences.length} file references for alternates`);
  fileReferences.forEach(ref => {
    console.log(`  - ${ref.fileName} (${ref.contentType}) -> ${ref.fileId}`);
  });
  
  if (fileReferences.length === 0) {
    throw new Error('No files found for Files API alternates processing');
  }
  
  // Extract component types from equipment.json
  const componentTypes = await extractComponentTypesFromEquipment(projectName);
  
  if (componentTypes.length === 0) {
    console.log('No component types found in equipment.json, returning empty suppliers array');
    return { suppliers: [] };
  }
  
  const successfulComponents = [];
  const failedComponents = [];
  
  // Generate alternates for each component type using Files API
  for (const componentType of componentTypes) {
    try {
      const componentData = await generateSingleComponentAlternatesWithFiles(componentType, fileReferences);
      successfulComponents.push(componentData);
    } catch (error) {
      console.error(`Failed to generate alternates for ${componentType}:`, error.message);
      failedComponents.push({ componentType, error: error.message });
    }
  }
  
  // Report results
  console.log(`Successfully generated alternates for ${successfulComponents.length} component types`);
  if (failedComponents.length > 0) {
    console.log(`Failed to generate alternates for ${failedComponents.length} component types:`);
    failedComponents.forEach(failed => {
      console.log(`  - ${failed.componentType}: ${failed.error}`);
    });
  }
  
  // Merge successful components into final structure
  const finalAlternates = {
    suppliers: successfulComponents
  };
  
  return finalAlternates;
}

/**
 * Generate alternates for a single component type using Files API
 * @param {string} componentType - The exact component type from equipment.json
 * @param {Array} fileReferences - File references from FileManager
 * @returns {Object} - Generated component alternates JSON
 */
async function generateSingleComponentAlternatesWithFiles(componentType, fileReferences) {
  try {
    console.log(`Generating alternates for component type: ${componentType} using Files API`);
    
    // Create a simplified prompt that doesn't require Claude to get the component type right
    const componentPrompt = `
IMPORTANT: You are to return ONLY a JSON object without any additional text, explanation, or markdown formatting.

Analyze the provided files and extract information about alternate manufacturers and suppliers for ${componentType} equipment.
Focus on ${componentType} related equipment.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "suppliers": [
    {
      "manufacturer": "",
      "model": "",
      "isBasisOfDesign": true,
      "isListedAlternate": false,
      "representativeInfo": {
        "name": "",
        "company": "",
        "contact": ""
      },
      "costDifference": "",
      "compatibilityNotes": ""
    }
  ]
}

Instructions:
- Extract manufacturers and models related to ${componentType}
- CRITICAL - Basis of Design Identification: A manufacturer can ONLY be marked as basis of design (isBasisOfDesign: true) if ONE of these conditions is met:
  * It is EXPLICITLY stated as "Basis of Design", "BoD", "Design Basis", or similar terminology in the specifications
  * It appears as the manufacturer name on mechanical schedules/drawings for that equipment type
  * It is explicitly called out as the "selected manufacturer" or "specified manufacturer" in the project documents
- If NO manufacturer meets the above criteria for basis of design, then ALL manufacturers should have isBasisOfDesign: false
- DO NOT randomly assign or guess a basis of design based on general industry knowledge or assumptions
- Identify listed alternates from specifications (isListedAlternate: true)
- Include representative information when available
- Provide cost differences as percentages (e.g., "+5%", "-3%")
- Add compatibility notes
- Suggest 2-3 additional suitable manufacturers if not already listed (set both isBasisOfDesign and isListedAlternate to false)

Extract information only from the provided files. Do not hallucinate or invent data.
The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes.
Do not include \`\`\`json markers.`;
    
    // Generate JSON using Files API
    let componentData;
    
    try {
      // Level 1: Try Files API generation
      componentData = await generateJsonSectionWithFiles(componentPrompt, fileReferences);
    } catch (error) {
      console.log(`Files API generation failed for ${componentType}, attempting repair...`);
      
      // If Files API generation failed, we need to handle it manually
      // Make the API call directly with Files API and apply our repair logic
      const content = [{ type: 'text', text: componentPrompt }];
      
      // Add file references as appropriate content blocks
      for (const fileRef of fileReferences) {
        if (fileRef.contentType === 'document') {
          content.push({
            type: 'document',
            source: {
              type: 'file',
              file_id: fileRef.fileId
            },
            title: fileRef.isConverted ? `${fileRef.fileName} (converted from CSV)` : fileRef.fileName,
            context: fileRef.isConverted ? 'Converted from CSV format for analysis' : undefined
          });
        } else if (fileRef.contentType === 'image') {
          content.push({
            type: 'image',
            source: {
              type: 'file',
              file_id: fileRef.fileId
            }
          });
        }
      }
      
      const requestConfig = {
        data: {
          model: CLAUDE_MODEL,
          messages: [
            {
              role: 'user',
              content: content
            }
          ],
          max_tokens: 8000
        },
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'files-api-2025-04-14'
        }
      };
      
      const response = await makeClaudeApiCall(requestConfig);
      
      const rawResponse = response.data.content[0].text;
      console.log(`Raw response for ${componentType}:`, rawResponse.substring(0, 200) + '...');
      
      // Try to extract and repair JSON
      let jsonContent = rawResponse;
      
      // Look for JSON in backticks first
      const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1].trim();
      } else if (rawResponse.includes('{') && rawResponse.includes('}')) {
        // Extract JSON-like content
        const jsonStart = rawResponse.indexOf('{');
        const jsonEnd = rawResponse.lastIndexOf('}') + 1;
        jsonContent = rawResponse.substring(jsonStart, jsonEnd);
      }
      
      // Level 2: Try existing fixJsonWithClaude
      try {
        componentData = await fixJsonWithClaude(jsonContent);
      } catch (fixError) {
        console.log(`fixJsonWithClaude failed for ${componentType}, trying component-specific repair...`);
        
        // Level 3: Try component-specific repair
        try {
          const repairedJson = repairComponentJson(jsonContent);
          componentData = JSON.parse(repairedJson);
          
          console.log(`Successfully repaired JSON for ${componentType}`);
        } catch (repairError) {
          console.error(`All repair attempts failed for ${componentType}:`, repairError.message);
          throw new Error(`Failed to generate valid JSON for ${componentType}`);
        }
      }
    }
    
    // Validate the final result
    if (!validateComponentStructure(componentData)) {
      throw new Error(`Generated data for ${componentType} does not match expected structure`);
    }
    
    // Deterministically insert the correct component type
    const finalComponentData = {
      componentType: componentType,  // Use the exact component type from equipment.json
      suppliers: componentData.suppliers || []
    };
    
    console.log(`Successfully generated alternates for ${componentType} using Files API`);
    return finalComponentData;
    
  } catch (error) {
    console.error(`Error generating alternates for ${componentType} with Files API:`, error.message);
    throw error;
  }
}

module.exports = {
  // Legacy methods (text injection)
  generateSectionJson,
  processContextFiles,
  generateJsonSection,
  generateSplitAlternates,
  extractComponentTypesFromEquipment,
  generateSingleComponentAlternates,
  
  // New Files API methods
  generateSectionJsonWithFiles,
  generateJsonSectionWithFiles,
  generateSplitAlternatesWithFiles,
  generateSingleComponentAlternatesWithFiles,
  
  // File Manager class
  FileManager
};
