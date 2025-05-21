/**
 * BuildVision PDF Report Generator - JSON Parser
 * 
 * This module handles parsing JSON files and extracting structured data.
 */

const fs = require('fs-extra');
const { escapeLatex } = require('./utils');

/**
 * Fix common JSON syntax issues including unescaped quotes and control characters
 * @param {string} jsonString - Raw JSON string
 * @returns {string} - Processed JSON string with fixed syntax issues
 */
function sanitizeJsonString(jsonString) {
  if (!jsonString) return jsonString;
  
  try {
    // First attempt - try to parse it as-is to avoid unnecessary processing
    JSON.parse(jsonString);
    return jsonString;
  } catch (error) {
    // Only apply fixes if there's a parse error
    console.log(`JSON parse error detected: ${error.message}. Attempting to fix...`);
    
    let sanitized = jsonString;
    
    // Step 1: Remove or replace invalid control characters
    // ASCII control chars (except allowed ones in JSON spec)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Step 2: Handle unescaped quotes within string values
    // First, try to find and fix obvious string patterns with unescaped quotes
    sanitized = sanitized.replace(/(?<=([:,]\s*"|^\s*"))(?:\\"|[^"])*?(?<!\\)"/g, function(match) {
      return match.replace(/(?<!\\)"/g, '\\"');
    });
    
    // Step 3: Special case handling for the MS-1 size field that might have unescaped quotes
    // Looking specifically for patterns like: "size": "32" x 32"" (note the unescaped quotes)
    sanitized = sanitized.replace(/"size":\s*"(\d+)"\s*x\s*(\d+)"/g, '"size": "$1\\" x $2\\""');
    
    // Also handle other common measurement patterns with quotes
    sanitized = sanitized.replace(/"([^"]*\d+)"\s*([^"]*)\s*(\d+)"/g, function(match, p1, p2, p3) {
      // Only replace if p2 is a simple unit or operator like "x", "×", etc.
      if (p2.trim().match(/^[x×*\/\-+\s]+$/)) {
        return `"${p1}\\" ${p2} ${p3}\\""`; 
      }
      return match;
    });
    
    // Step 4: Try to run a final validation - if it still fails, make a more aggressive attempt
    try {
      JSON.parse(sanitized);
      return sanitized;
    } catch (secondError) {
      console.log(`First repair attempt failed. Making additional adjustments...`);
      
      // More aggressive replacement for any remaining suspicious patterns
      // Replace all instances of unescaped quotes between colons and commas or braces
      sanitized = sanitized.replace(/:\s*"([^"]*)(?<!\\)"(?=\s*[,}])/g, function(match, content) {
        // Replace any remaining unescaped inner quotes
        return match.replace(/(?<!")"/g, '\\"');
      });
      
      return sanitized;
    }
  }
}

/**
 * Parse a JSON file and extract structured data
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>} - Parsed data
 */
async function parseJsonFile(filePath) {
  try {
    // Read JSON file
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // First try to sanitize the JSON content to fix common issues like unescaped quotes
    const sanitizedContent = sanitizeJsonString(fileContent);
    
    let jsonData;
    try {
      // Try to parse the sanitized JSON content
      jsonData = JSON.parse(sanitizedContent);
    } catch (parseErr) {
      // Enhanced error message with more details about the JSON parsing failure
      const errorMessage = `JSON parsing error: ${parseErr.message}. Check for unescaped quotes or other syntax errors in the file: ${filePath}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Extract structured data
    const structuredData = extractStructuredData(jsonData);
    
    return {
      metadata: {
        title: jsonData.reportTitle || 'BuildVision Report',
        subtitle: 'Custom Procurement Report',
        author: 'BuildVision',
        subject: 'BuildVision Project Report',
        keywords: 'buildvision, construction, report',
        tagline: 'Control How You Source Building Systems',
        description: 'Directly access suppliers and automate sourcing, procurement, and financing—all from one platform'
      },
      jsonData,
      structuredData
    };
  } catch (err) {
    throw new Error(`Failed to parse JSON file: ${err.message}`);
  }
}

/**
 * Extract structured data from JSON
 * @param {Object} jsonData - JSON data
 * @returns {Object} - Structured data
 */
function extractStructuredData(jsonData) {
  // Extract customer information
  const customerInfo = extractCustomerInfo(jsonData.customerInformation);
  
  // Extract project information
  const projectInfo = extractProjectInfo(jsonData.projectInformation, jsonData);
  
  // Extract equipment table - use the new equipmentByType field if available, otherwise use projectEquipment
  const equipmentData = jsonData.equipmentByType || jsonData.projectEquipment;
  // Use suppliers field if available, otherwise fall back to alternateManufacturers for backward compatibility
  const supplierData = jsonData.suppliers || jsonData.alternateManufacturers;
  const equipmentTable = extractEquipmentTable(equipmentData, supplierData);
  
  // Extract sections
  const sections = extractSections(jsonData);
  
  return {
    customerInfo,
    projectInfo,
    equipmentTable,
    sections
  };
}

/**
 * Extract customer information from JSON
 * @param {Object} customerData - Customer information from JSON
 * @returns {Array} - Formatted customer information
 */
function extractCustomerInfo(customerData) {
  if (!customerData) return [];
  
  const customerInfo = [
    { label: 'Customer Name', value: customerData.customerName || 'N/A' },
    { label: 'Contact Person', value: customerData.contactPerson || 'N/A' },
    { label: 'Contact Email', value: customerData.contactEmail || 'N/A' },
    { label: 'Contact Phone', value: customerData.contactPhone || 'N/A' }
  ];
  
  // Add additional fields if present
  if (customerData.additionalFields) {
    Object.entries(customerData.additionalFields).forEach(([key, value]) => {
      customerInfo.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value: value || 'N/A' });
    });
  }
  
  return customerInfo;
}

/**
 * Extract project information from JSON
 * @param {Object} projectData - Project information from JSON
 * @param {Object} jsonData - Full JSON data object
 * @returns {Array} - Formatted project information
 */
function extractProjectInfo(projectData, jsonData) {
  if (!projectData) return [];
  
  // Get project URL from project information if available, or fall back to customer information
  let projectUrl = 'N/A';
  if (projectData && projectData.projectUrl) {
    // Use the direct projectUrl field from projectInformation (new structure)
    projectUrl = projectData.projectUrl;
  } else if (jsonData && 
      jsonData.customerInformation && 
      jsonData.customerInformation.additionalFields && 
      jsonData.customerInformation.additionalFields.projectLink) {
    // Fall back to the old structure for backward compatibility
    projectUrl = jsonData.customerInformation.additionalFields.projectLink;
  }
  
  const projectInfo = [
    { label: 'Project Name', value: projectData.projectName || 'N/A' },
    { label: 'Location', value: projectData.location || 'N/A' },
    { label: 'Start Date', value: projectData.startDate || 'N/A' },
    { label: 'Completion Date', value: projectData.completionDate || 'N/A' },
    { label: 'Budget', value: projectData.budget || 'N/A' },
    { label: 'Scope', value: projectData.scope || 'N/A' },
    { label: 'Project ID', value: jsonData.customerInformation?.projectId || 'N/A' },
    { label: 'Project URL', value: projectUrl }
  ];
  
  // Add additional fields if present, excluding projectManager
  if (projectData.additionalFields) {
    Object.entries(projectData.additionalFields).forEach(([key, value]) => {
      // Skip the projectManager field
      if (key !== 'projectManager') {
        // Check if the value is a nested object and needs special handling
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // For nested objects, recursively add each property with a formatted label
          processNestedObject(key, value, projectInfo);
        } else {
          projectInfo.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value: value || 'N/A' });
        }
      }
    });
  }
  
  return projectInfo;
}

/**
 * Extract equipment table from JSON
 * @param {Array} equipmentData - Equipment data from JSON
 * @param {Array} alternateManufacturers - Alternate manufacturers data from JSON
 * @returns {Object} - Formatted equipment table with grouped equipment
 */
function extractEquipmentTable(equipmentData, alternateManufacturers) {
  if (!equipmentData || equipmentData.length === 0) {
    return { headers: [], rows: [], groupedEquipment: [] };
  }
  
  // Define headers for the equipment table - removing Notes as it's now at component type level
  const headers = ['Equipment Tag', 'Manufacturer', 'Model'];
  
  // Group equipment by component type and handle notes at type level
  const equipmentByType = {};
  
  // Handling equipmentByType structure from the updated JSON
  if (equipmentData && Array.isArray(equipmentData)) {
    equipmentData.forEach(group => {
      const componentType = group.equipmentType || 'Other';
      const notes = group.notes || '';
      const items = group.items || [];
      
      if (!equipmentByType[componentType]) {
        equipmentByType[componentType] = {
          notes: notes,
          equipment: []
        };
      }
      
      // Process each equipment item
      items.forEach(item => {
        equipmentByType[componentType].equipment.push({
          equipmentTag: item.equipmentTag || '',
          manufacturer: item.manufacturer || '',
          model: item.model || ''
        });
      });
    });
  }
  
  // Create a structured representation of the grouped equipment
  const groupedEquipment = Object.keys(equipmentByType).map(componentType => {
    return {
      componentType,
      notes: equipmentByType[componentType].notes,
      equipment: equipmentByType[componentType].equipment
    };
  });
  
  // For backward compatibility, also create the flat rows structure
  let rows = [];
  
  if (equipmentData && Array.isArray(equipmentData)) {
    equipmentData.forEach(group => {
      const componentType = group.equipmentType || 'Other';
      const items = group.items || [];
      
      items.forEach(item => {
        rows.push([
          item.equipmentTag || '',
          item.manufacturer || '',
          componentType || '',
          item.model || ''
        ]);
      });
    });
  }
  
  // Process suppliers (or alternate manufacturers) separately
  let alternateManufacturersData = null;
  if (alternateManufacturers && alternateManufacturers.length > 0) {
    alternateManufacturersData = alternateManufacturers.map(item => {
      const componentType = item.componentType || '';
      
      // Check if we're using the new "suppliers" format or old "alternateManufacturers" format
      if (item.suppliers) {
        // New format - find the basis of design supplier (isBasisOfDesign is true)
        const bodSupplier = item.suppliers.find(s => s.isBasisOfDesign === true) || item.suppliers[0];
        const basisOfDesign = bodSupplier ? `${bodSupplier.manufacturer} ${bodSupplier.model}` : '';
        
        // Include ONLY non-basis of design suppliers in the alternateOptions
        const alternateOptions = item.suppliers
          .filter(s => !s.isBasisOfDesign) // Filter out the basis of design supplier
          .map(s => ({
            manufacturer: s.manufacturer || '',
            model: s.model || '',
            representative: s.representativeInfo?.company || 'N/A',
            compatibilityNotes: s.compatibilityNotes || '',
            costDifference: s.costDifference || '',
            isBasisOfDesign: false, // These are definitely not basis of design
            isListedAlternate: s.isListedAlternate || false // Preserve the Listed Alternate flag
          }));
        
        return {
          componentType,
          basisOfDesign,
          alternateOptions
        };
      } else {
        // Old format
        const basisOfDesign = item.basisOfDesign || '';
        
        // Extract manufacturer and model from the basisOfDesign string
        const bodParts = basisOfDesign.split(' ');
        const bodManufacturer = bodParts[0] || '';
        const bodModel = bodParts.slice(1).join(' ') || '';
        
        // Create a basis of design supplier object
        const bodSupplier = {
          manufacturer: bodManufacturer,
          model: bodModel,
          representative: 'N/A',
          compatibilityNotes: 'Basis of Design',
          isBasisOfDesign: true
        };
        
        // Get the alternate options
        const alternateOptions = item.alternateOptions || [];
        
        // Map alternate options and mark them as not basis of design
        const mappedAlternateOptions = alternateOptions.map(alt => ({
          manufacturer: alt.manufacturer || '',
          model: alt.model || '',
          representative: alt.representativeInfo?.company || 'N/A',
          compatibilityNotes: alt.compatibilityNotes || '',
          costDifference: alt.costDifference || '',
          isBasisOfDesign: false
        }));
        
        // Combine the basis of design with alternate options
        const allOptions = [bodSupplier, ...mappedAlternateOptions];
        
        return {
          componentType,
          basisOfDesign,
          alternateOptions: allOptions
        };
      }
    });
    
    // For backward compatibility, also add to the flat rows structure
    rows.push(['Suppliers', '', '', '', '']);
    rows.push(['Component Type', 'BoD Manufacturer', 'Alternate Manufacturer', 'Model', 'Rep', 'Notes']);
    
    alternateManufacturers.forEach(item => {
      const componentType = item.componentType || '';
      
      // Handle both new and old formats
      if (item.suppliers) {
        // New format
        const bodSupplier = item.suppliers.find(s => s.isBasisOfDesign === true) || item.suppliers[0];
        const basisOfDesign = bodSupplier ? `${bodSupplier.manufacturer} ${bodSupplier.model}` : '';
        
        // Process non-BOD suppliers as alternate options
        item.suppliers
          .filter(s => s.isBasisOfDesign !== true)
          .forEach(alt => {
            const manufacturer = alt.manufacturer || '';
            const model = alt.model || '';
            const rep = alt.representativeInfo?.company || 'N/A';
            const notes = alt.compatibilityNotes || '';
            
            rows.push([
              componentType,
              basisOfDesign,
              manufacturer,
              model,
              rep,
              notes
            ]);
          });
      } else if (item.alternateOptions && item.alternateOptions.length > 0) {
        // Old format
        const basisOfDesign = item.basisOfDesign || '';
        
        item.alternateOptions.forEach(alt => {
          const manufacturer = alt.manufacturer || '';
          const model = alt.model || '';
          const rep = alt.representativeInfo?.company || 'N/A';
          const notes = alt.compatibilityNotes || '';
          
          rows.push([
            componentType,
            basisOfDesign,
            manufacturer,
            model,
            rep,
            notes
          ]);
        });
      }
    });
  }
  
  return { 
    headers, 
    rows, 
    groupedEquipment,
    alternateManufacturers: alternateManufacturersData
  };
}

/**
 * Extract sections from JSON
 * @param {Object} jsonData - JSON data
 * @returns {Array} - Formatted sections
 */
function extractSections(jsonData) {
  const sections = [];
  
  // Add Design Notes section if present
  if (jsonData.designNotes && jsonData.designNotes.length > 0) {
    const designNotesSection = {
      title: 'Design Notes',
      content: '',
      subsections: []
    };
    
    jsonData.designNotes.forEach(note => {
      const subsection = {
        title: escapeLatex(note.systemType) || 'System',
        content: ''
      };
      
      // Add technical observations
      if (note.technicalObservations && note.technicalObservations.length > 0) {
        subsection.content += '\\textbf{Technical Observations:}\\par\n';
        subsection.content += '\\begin{itemize}\n';
        note.technicalObservations.forEach(observation => {
          subsection.content += `\\item ${escapeLatex(observation)}\n`;
        });
        subsection.content += '\\end{itemize}\n\\par\n';
      }
      
      // Add concerns
      if (note.concerns && note.concerns.length > 0) {
        subsection.content += '\\textbf{Concerns:}\\par\n';
        subsection.content += '\\begin{itemize}\n';
        note.concerns.forEach(concern => {
          subsection.content += `\\item ${escapeLatex(concern)}\n`;
        });
        subsection.content += '\\end{itemize}\n\\par\n';
      }
      
      // Add opportunities
      if (note.opportunities && note.opportunities.length > 0) {
        subsection.content += '\\textbf{Opportunities:}\\par\n';
        subsection.content += '\\begin{itemize}\n';
        note.opportunities.forEach(opportunity => {
          subsection.content += `\\item ${escapeLatex(opportunity)}\n`;
        });
        subsection.content += '\\end{itemize}\n\\par\n';
      }
      
      designNotesSection.subsections.push(subsection);
    });
    
    sections.push(designNotesSection);
  }
  
  // Add BuildVision Recommendations section if present
  if (jsonData.buildVisionRecommendations && jsonData.buildVisionRecommendations.length > 0) {
    const recommendationsSection = {
      title: 'BuildVision Recommendations',
      content: '',
      subsections: []
    };
    
    jsonData.buildVisionRecommendations.forEach(rec => {
      const subsection = {
        title: `${rec.id}. ${escapeLatex(rec.recommendation)}`,
        content: ''
      };
      
      // Add rationale
      if (rec.rationale) {
        subsection.content += `\\textbf{Rationale:} ${escapeLatex(rec.rationale)}\\par\\par\n`;
      }
      
      // Add estimated impact
      if (rec.estimatedImpact) {
        subsection.content += `\\textbf{Estimated Impact:} ${escapeLatex(rec.estimatedImpact)}\\par\\par\n`;
      }
      
      // Add implementation
      if (rec.implementation) {
        subsection.content += `\\textbf{Implementation:} ${escapeLatex(rec.implementation)}\\par\\par\n`;
      }
      
      // Add priority
      if (rec.priority) {
        subsection.content += `\\textbf{Priority:} ${escapeLatex(rec.priority)}\\par\n`;
      }
      
      recommendationsSection.subsections.push(subsection);
    });
    
    sections.push(recommendationsSection);
  }
  
  // Add Conclusion section if present
  if (jsonData.conclusion) {
    const conclusionSection = {
      title: 'Conclusion',
      content: '', // Initially empty, will add summary after subsections
      subsections: []
    };
    
    // Add key findings first
    if (jsonData.conclusion.keyFindings && jsonData.conclusion.keyFindings.length > 0) {
      const keyFindingsSubsection = {
        title: 'Key Findings',
        content: '\\begin{itemize}\n'
      };
      
      jsonData.conclusion.keyFindings.forEach(finding => {
        keyFindingsSubsection.content += `\\item ${escapeLatex(finding)}\n`;
      });
      
      keyFindingsSubsection.content += '\\end{itemize}\n';
      conclusionSection.subsections.push(keyFindingsSubsection);
    }
    
    // Add highest priority actions second
    if (jsonData.conclusion.highestPriorityActions && jsonData.conclusion.highestPriorityActions.length > 0) {
      const priorityActionsSubsection = {
        title: 'Highest Priority Actions',
        content: '\\begin{itemize}\n'
      };
      
      jsonData.conclusion.highestPriorityActions.forEach(action => {
        priorityActionsSubsection.content += `\\item ${escapeLatex(action)}\n`;
      });
      
      priorityActionsSubsection.content += '\\end{itemize}\n';
      conclusionSection.subsections.push(priorityActionsSubsection);
    }
    
    // Add summary as a subsection at the end
    if (jsonData.conclusion.summary) {
      const summarySubsection = {
        title: 'Summary',
        content: escapeLatex(jsonData.conclusion.summary)
      };
      conclusionSection.subsections.push(summarySubsection);
    }
    
    sections.push(conclusionSection);
  }
  
  return sections;
}

/**
 * Process a nested object and add its properties to the info array
 * @param {string} parentKey - The key of the parent object
 * @param {Object} obj - The nested object to process
 * @param {Array} infoArray - The array to add the processed properties to
 */
function processNestedObject(parentKey, obj, infoArray) {
  // Format the parent key (capitalize first letter)
  const formattedParentKey = parentKey.charAt(0).toUpperCase() + parentKey.slice(1);
  
  // Process each property in the nested object
  Object.entries(obj).forEach(([key, value]) => {
    // Format the key for display (capitalize first letter)
    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
    
    // Create a readable label combining parent and child keys
    const label = `${formattedParentKey} (${formattedKey})`;
    
    // If the value is also an object, recurse deeper
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Create a new parent key with the current key and recurse
      processNestedObject(`${parentKey}.${key}`, value, infoArray);
    } else {
      // Add the entry with the formatted label and value
      infoArray.push({ label, value: value || 'N/A' });
    }
  });
}

module.exports = {
  parseJsonFile
};
