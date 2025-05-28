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
- CRITICAL - Basis of Design Identification: A manufacturer can ONLY be marked as basis of design ("isBasisOfDesign": true) if ONE of these conditions is met FOR THAT SPECIFIC EQUIPMENT TYPE:
  * It is EXPLICITLY stated as "Basis of Design", "BoD", "Design Basis", or similar terminology in the specifications FOR THAT SPECIFIC EQUIPMENT TYPE
  * It appears as the manufacturer name on mechanical schedules/drawings FOR THAT SPECIFIC EQUIPMENT TYPE
  * It is explicitly called out as the "selected manufacturer" or "specified manufacturer" FOR THAT SPECIFIC EQUIPMENT TYPE in the project documents
- IMPORTANT: Each equipment type must be evaluated independently - finding a manufacturer specified for one equipment type (e.g., chillers) does NOT make them the basis of design for other equipment types (e.g., air handlers, pumps, etc.)
- If NO manufacturer meets the above criteria for basis of design FOR A SPECIFIC EQUIPMENT TYPE, then ALL manufacturers for that equipment type should have "isBasisOfDesign": false
- DO NOT randomly assign or guess a basis of design based on general industry knowledge, assumptions, or specifications for other equipment types
- DO NOT extrapolate or assume that because a manufacturer is specified for one piece of equipment, they are the basis of design for other equipment types
- IMPORTANT: Look for "Listed Alternates" or "Acceptable Manufacturers" specifically mentioned in specifications and set "isListedAlternate": true for these manufacturers
- A manufacturer can only be one of these: Basis of Design (isBasisOfDesign: true), Listed Alternate (isListedAlternate: true), or neither
- Include alternate manufacturers and their models that could be substituted
- Provide representative information when available (full company names, not just initials)
- Express cost differences as percentages relative to the basis of design (e.g., "-5%", "+12%") - if no basis of design exists, express relative to a reference manufacturer
  * If a basis of design exists, it typically comes with a premium due to its status
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
- Be realistic about potential cost differences compared to the BoD (if one exists), or relative to other manufacturers, based on industry knowledge (up or down)
- REMEMBER: Only suggest alternatives - do NOT designate any suggested manufacturer as a basis of design unless it meets the explicit criteria above

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
