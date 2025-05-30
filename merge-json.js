#!/usr/bin/env node

/**
 * Standalone JSON Merger Script
 * 
 * This script merges individual JSON section files into a complete project JSON file.
 * Usage: node merge-json.js <project-name>
 */

const { mergeJsonSections } = require('./src/json-merger');

async function main() {
  const projectName = process.argv[2];
  
  if (!projectName) {
    console.error('Usage: node merge-json.js <project-name>');
    console.error('Example: node merge-json.js "GSBD-ITC"');
    process.exit(1);
  }
  
  try {
    console.log(`Merging JSON sections for project: ${projectName}`);
    
    const mergedJson = await mergeJsonSections(projectName);
    
    console.log('✅ JSON merge completed successfully!');
    console.log(`📄 Updated file: projects/${projectName}/${projectName}.json`);
    
  } catch (error) {
    console.error('❌ Error merging JSON sections:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
