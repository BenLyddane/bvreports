/**
 * BuildVision PDF Report Generator - Project Details Prompt
 * 
 * This module provides the specialized prompt for generating the project details
 * section of the BuildVision report using Claude API.
 */

/**
 * Get the prompt for generating project details section
 * @returns {string} Claude prompt for project details
 */
function getProjectDetailsPrompt() {
  return `
IMPORTANT: You are to return ONLY a JSON object without any additional text, explanation, or markdown formatting.

Analyze the context files and extract all project details information to create a structured JSON object.
Focus ONLY on the project and customer information sections.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "reportTitle": "BuildVision Project Report for [Project Name]",
  "customerInformation": {
    "customerName": "",
    "contactPerson": "",
    "contactEmail": "",
    "contactPhone": "",
    "projectId": "",
    "additionalFields": {}
  },
  "projectInformation": {
    "projectName": "",
    "location": "",
    "startDate": "",
    "completionDate": "",
    "budget": "",
    "scope": "",
    "projectUrl": "",
    "additionalFields": {}
  },
  "preparerInformation": {
    "preparers": [
      {
        "name": "Ben Lyddane",
        "email": "Ben@BuildVision.io",
        "phone": "202-365-8628"
      },
      {
        "name": "Mackenzie Hoover",
        "email": "Mackenzie@buildvision.io",
        "phone": "843-609-3265"
      }
    ],
    "preparationDate": ""
  }
}

Ensure all fields are populated based on available information in the context files, using consistent data types throughout. The "reportTitle" should include the project name if available.

Extract information only from the provided context. Do not hallucinate or invent data. If information is not available for certain fields, use empty strings or empty objects as appropriate rather than omitting fields.

The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes. Do not include \`\`\`json markers.
`;
}

module.exports = {
  getProjectDetailsPrompt
};
