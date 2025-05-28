/**
 * Test script for Claude Files API integration
 * 
 * This script tests the FileManager and Files API functionality.
 */

const path = require('path');
const fs = require('fs-extra');
const FileManager = require('./src/file-manager');
const { generateSectionJsonWithFiles } = require('./src/claude-api');

async function testFilesAPI() {
  try {
    console.log('=== Testing Claude Files API Integration ===\n');
    
    // Test with a sample project directory
    const testProjectDir = path.join(__dirname, 'projects', 'Acadia');
    
    // Check if test project exists
    if (!(await fs.pathExists(testProjectDir))) {
      console.log('Test project "Acadia" not found. Please ensure you have a project with context files to test.');
      return;
    }
    
    console.log(`Testing with project directory: ${testProjectDir}\n`);
    
    // Initialize FileManager
    const fileManager = new FileManager();
    
    // Test file discovery
    console.log('1. Testing file discovery...');
    const supportedFiles = await fileManager.findSupportedFiles(testProjectDir);
    console.log(`Found ${supportedFiles.length} supported files:`);
    supportedFiles.forEach(file => {
      console.log(`  - ${path.relative(testProjectDir, file)}`);
    });
    console.log();
    
    // Test file processing and upload
    console.log('2. Testing file processing and upload...');
    const fileReferences = await fileManager.getFileReferences(testProjectDir);
    console.log(`Processed ${fileReferences.length} file references:`);
    fileReferences.forEach(ref => {
      console.log(`  - ${ref.fileName} (${ref.contentType}) -> ${ref.fileId}`);
      if (ref.isConverted) {
        console.log(`    (converted from CSV)`);
      }
    });
    console.log();
    
    // Test cache functionality
    console.log('3. Testing cache functionality...');
    const cache = await fileManager.loadCache(testProjectDir);
    console.log(`Cache contains ${Object.keys(cache.uploadedFiles).length} files:`);
    Object.entries(cache.uploadedFiles).forEach(([fileName, fileInfo]) => {
      console.log(`  - ${fileName}: ${fileInfo.file_id} (uploaded: ${fileInfo.uploaded_at})`);
    });
    console.log();
    
    // Test Files API generation (if we have files)
    if (fileReferences.length > 0) {
      console.log('4. Testing Files API generation...');
      const testPrompt = `
Please analyze the provided files and return a simple JSON object with the following structure:

{
  "projectName": "extracted from files",
  "fileCount": number_of_files_analyzed,
  "summary": "brief summary of what was found in the files"
}

Return ONLY the JSON object, no additional text.`;
      
      try {
        const { generateJsonSectionWithFiles } = require('./src/claude-api');
        const result = await generateJsonSectionWithFiles(testPrompt, fileReferences);
        console.log('Files API generation successful!');
        console.log('Result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.log('Files API generation failed:', error.message);
        console.log('This is expected if the API key is not configured or if there are API issues.');
      }
    } else {
      console.log('4. Skipping Files API generation test (no files found)');
    }
    
    console.log('\n=== Files API Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testFilesAPI();
}

module.exports = { testFilesAPI };
