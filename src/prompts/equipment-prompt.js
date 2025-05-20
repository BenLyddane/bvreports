/**
 * BuildVision PDF Report Generator - Equipment Prompt
 * 
 * This module provides the specialized prompt for generating the equipment
 * section of the BuildVision report using Claude API.
 */

/**
 * Get the prompt for generating equipment section
 * @returns {string} Claude prompt for equipment data
 */
function getEquipmentPrompt() {
  return `
IMPORTANT: You are to return ONLY a JSON object without any additional text, explanation, or markdown formatting.

Analyze the context files and extract all equipment information to create a structured JSON object.
Focus ONLY on the equipment data and specifications.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "equipmentByType": [
    {
      "equipmentType": "",
      "notes": "",
      "items": [
        {
          "equipmentTag": "",
          "manufacturer": "",
          "model": "",
          "specifications": {}
        }
      ]
    }
  ]
}

Instructions for populating this section:
- Group equipment by type (e.g., "Air Handling Units", "Pumps", "Chillers")
- For each type, provide relevant notes about that equipment category
- List each piece of equipment with its tag/ID, manufacturer, and model
- Include detailed specifications in the specifications object (e.g., capacity, power, dimensions)

Pay close attention to mechanical schedules, equipment lists, and specification documents to extract this information.

Ensure all fields are populated based on available information in the context files, using consistent data types throughout.

Extract information only from the provided context. Do not hallucinate or invent data. If information is not available for certain fields, use empty strings or empty objects as appropriate rather than omitting fields.

The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes. Do not include \`\`\`json markers.
`;
}

module.exports = {
  getEquipmentPrompt
};
