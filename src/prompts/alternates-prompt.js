/**
 * BuildVision PDF Report Generator - Alternates Prompt
 * 
 * This module provides the specialized prompt for generating the alternate manufacturers
 * section of the BuildVision report using Claude API.
 */

/**
 * Get the prompt for generating alternates section
 * @returns {string} Claude prompt for alternate manufacturers data
 */
function getAlternatesPrompt() {
  return `
IMPORTANT: You are to return ONLY a JSON object without any additional text, explanation, or markdown formatting.

Analyze the context files and extract all information about alternate manufacturers and suppliers to create a structured JSON object.
Focus ONLY on the suppliers/alternates section.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "suppliers": [
    {
      "componentType": "",
      "suppliers": [
        {
          "manufacturer": "",
          "model": "",
          "isBasisOfDesign": true,
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

Instructions for populating this section:
- Group suppliers by component type (e.g., "Chillers", "Air Handling Units")
- For each component type, identify the basis of design (BoD) manufacturer and mark with "isBasisOfDesign": true
- Include alternate manufacturers and their models that could be substituted
- Provide representative information when available (full company names, not just initials)
- Include cost differences (e.g., "+$5,000", "-$2,500") between alternates and BoD
- Add compatibility notes about installation or performance differences

When identifying manufacturer representatives:
- Only include commercial manufacturer's representatives or entities that can sell equipment
- Verify they can sell equipment in the project's territory
- Do not include service providers that cannot sell equipment

Ensure all fields are populated based on available information in the context files, using consistent data types throughout.

Extract information only from the provided context. Do not hallucinate or invent data. If information is not available for certain fields, use empty strings or empty objects as appropriate rather than omitting fields.

The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes. Do not include \`\`\`json markers.
`;
}

module.exports = {
  getAlternatesPrompt
};
