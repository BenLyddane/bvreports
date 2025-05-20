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

Instructions for populating this section:
- Group suppliers by component type (e.g., "Chillers", "Air Handling Units")
- For each component type, identify the basis of design (BoD) manufacturer and mark with "isBasisOfDesign": true and "isListedAlternate": false
- IMPORTANT: Look for "Listed Alternates" or "Acceptable Manufacturers" specifically mentioned in specifications and set "isListedAlternate": true for these manufacturers
- A manufacturer can only be one of these: Basis of Design (isBasisOfDesign: true), Listed Alternate (isListedAlternate: true), or neither
- Include alternate manufacturers and their models that could be substituted
- Provide representative information when available (full company names, not just initials)
- Express cost differences as percentages relative to the basis of design (e.g., "-5%", "+12%")
  * Assume the Basis of Design typically comes with a premium due to its status
  * Alternates may offer cost savings but might come with other project risks
  * Use reasonable percentage ranges based on typical industry pricing differences
- Add compatibility notes about installation or performance differences

How to identify "Listed Alternates":
- Look for explicit mentions of "Listed Alternates", "Listed Manufacturers", "Acceptable Alternates", or "Acceptable Manufacturers" in specifications
- Manufacturers that appear in specification lists labeled as "Approved" or "Accepted" should be marked as Listed Alternates
- Manufacturers that appear in the same section as the Basis of Design but are not explicitly identified as the Basis of Design should be considered Listed Alternates
- Only mark manufacturers as Listed Alternates if they are specifically included in the project specifications

IMPORTANT - Suggesting Additional Alternatives:
- After identifying BoD and Listed Alternates from the specifications, use your knowledge to suggest 2-4 additional manufacturers for each component type that would be suitable alternatives
- For these suggested manufacturers, set both "isBasisOfDesign" and "isListedAlternate" to false
- Focus on well-known, reputable manufacturers that produce compatible equipment
- Include manufacturer name, typical model series, and explain compatibility in the notes
- In the compatibilityNotes for these suggested alternatives, begin with "SUGGESTED ALTERNATIVE: " and then describe why this manufacturer would be suitable
- Be realistic about potential cost differences compared to the BoD, based on industry knowledge (up or down)

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
