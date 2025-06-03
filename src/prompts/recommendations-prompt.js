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

Analyze the context files and develop procurement-focused recommendations for the project.
Focus ONLY on generating equipment purchasing recommendations that will benefit the client.

Your response must be a valid JSON object with the following structure - nothing else:

{
  "buildVisionRecommendations": [
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

Instructions for creating high-quality recommendations:
- Focus on recommendations related to equipment procurement, supplier selection, and cost optimization
- Prioritize practical advice that can lead to better purchasing decisions
- Each recommendation should have a concise title in the "recommendation" field
- Provide a detailed explanation in the "rationale" field that justifies the recommendation
- Estimate the financial, schedule, or performance impact in the "estimatedImpact" field
- Outline implementation steps in the "implementation" field
- Assign a priority level (e.g., "High", "Medium", "Low") based on potential value

Recommendations should be:
- Specific to this project based on the context provided
- Actionable by the client
- Focused on equipment procurement rather than design changes
- Supported by the information in the context files
- Numbering should start from 1 and increment for each recommendation

Ensure all fields are populated based on available information in the context files, using consistent data types throughout.

Extract information only from the provided context. Do not hallucinate or invent data. If you lack sufficient information to make meaningful recommendations, provide fewer, more general recommendations rather than inventing details.

Do not provide numeric values for cost estimates (e.g., 5-10% savings). Instead, use generic language (e.g., significant, modest, meaningful).

The output must be valid, parseable JSON without any explanatory text, markdown formatting or additional notes. Do not include \`\`\`json markers.
`;
}

module.exports = {
  getRecommendationsPrompt
};
