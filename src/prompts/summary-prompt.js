/**
 * BuildVision PDF Report Generator - Summary Prompt
 * 
 * This module provides the specialized prompt for generating the summary/conclusion
 * section of the BuildVision report using Claude API.
 */

/**
 * Get the prompt for generating summary section
 * @returns {string} Claude prompt for summary data
 */
function getSummaryPrompt() {
  return `
IMPORTANT: You are to return ONLY a JSON object without any additional text, explanation, or markdown formatting.

Analyze the context files and the previously generated report sections to create a concise summary and conclusion for the project.
Focus ONLY on summarizing the key aspects of the project and providing concluding insights with an emphasis on procurement guidance.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "conclusion": {
    "summary": "",
    "keyFindings": [],
    "highestPriorityActions": []
  }
}

Instructions for creating an effective summary:
- The "summary" field should provide a concise overview of the project's procurement aspects
- The "keyFindings" array should contain 3-5 important discoveries from analyzing the project
- The "highestPriorityActions" array should list 2-4 critical next steps the client should take

The summary should focus on:
- Equipment procurement strategy and vendor selection guidelines
- Purchasing best practices specific to the equipment types identified in earlier sections
- Potential "gotchas" or challenges to watch for when procuring this type of equipment
- Timeline considerations and lead time management for procurement
- Quality standards, performance specifications, and criteria for evaluating equipment options

Ensure all fields are populated based on available information in the context files, using consistent data types throughout.

Extract information only from the provided context. Do not hallucinate or invent data. If information is not available for certain fields, provide minimal, general statements rather than inventing specific details.

The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes. Do not include \`\`\`json markers.
`;
}

module.exports = {
  getSummaryPrompt
};
