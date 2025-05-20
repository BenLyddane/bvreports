/**
 * BuildVision PDF Report Generator - Recommendations Prompt
 * 
 * This module provides the specialized prompt for generating the recommendations
 * section of the BuildVision report using Claude API.
 */

/**
 * Get the prompt for generating recommendations section
 * @returns {string} Claude prompt for recommendations data
 */
function getRecommendationsPrompt() {
  return `
IMPORTANT: You are to return ONLY a JSON object without any additional text, explanation, or markdown formatting.

Analyze the context files, including the equipment data section, and develop equipment-specific procurement recommendations for the project.
Focus on generating specialized purchasing recommendations for each equipment type identified in the project.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "buildVisionRecommendations": {
    "generalRecommendations": [
      {
        "id": 1,
        "recommendation": "",
        "rationale": "",
        "estimatedImpact": "",
        "implementation": "",
        "priority": ""
      }
    ],
    "equipmentSpecificRecommendations": [
      {
        "equipmentType": "",
        "recommendations": [
          {
            "id": 1,
            "recommendation": "",
            "rationale": "",
            "estimatedImpact": "",
            "implementation": "",
            "priority": ""
          }
        ]
      }
    ]
  }
}

Instructions for creating high-quality recommendations:

First, identify all equipment types (e.g., "Air Cooled Chillers", "Cooling Towers", "Air Handling Units") from the project's equipment section.

Then, for EACH equipment type:
- Create a separate entry in the "equipmentSpecificRecommendations" array
- Develop 2-4 recommendations specific to that equipment type
- Focus on the unique procurement considerations, challenges, and best practices for that specific equipment
- Address common "gotchas" or pitfalls when purchasing this equipment type
- Include vendor selection criteria specific to this equipment type
- Consider maintenance requirements, lifecycle costs, and long-term support
- Include advice on performance specifications and acceptance testing
- Address compatibility considerations with other systems

Also provide 2-4 general recommendations in the "generalRecommendations" array that apply across equipment types.

For ALL recommendations:
- Each recommendation should have a concise title in the "recommendation" field
- Provide a detailed explanation in the "rationale" field that justifies the recommendation
- Estimate the financial, schedule, or performance impact in the "estimatedImpact" field
- Outline implementation steps in the "implementation" field
- Assign a priority level (e.g., "High", "Medium", "Low") based on potential value

Equipment-specific recommendations should address:
- Equipment-specific procurement challenges and how to overcome them
- Key technical specifications that influence procurement decisions
- Quality standards and certification requirements
- Vendor evaluation criteria unique to that equipment type
- Commissioning and acceptance requirements
- Warranty and service agreement considerations
- Training and documentation needs

All recommendations should be:
- Specific to this project based on the context provided
- Actionable by the client
- Focused on equipment procurement rather than design changes
- Supported by the information in the context files
- Numbered starting from 1 for each equipment type and for general recommendations

Ensure all fields are populated based on available information in the context files, using consistent data types throughout.

Extract information only from the provided context. Do not hallucinate or invent data. If you lack sufficient information to make meaningful recommendations for a specific equipment type, provide fewer, more general recommendations rather than inventing details.

The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes. Do not include \`\`\`json markers.
`;
}

module.exports = {
  getRecommendationsPrompt
};
