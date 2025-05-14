/**
 * BuildVision PDF Report Generator - JSON Parser
 * 
 * This module handles parsing JSON files and extracting structured data.
 */

const fs = require('fs-extra');
const { escapeLatex } = require('./utils');

/**
 * Parse a JSON file and extract structured data
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>} - Parsed data
 */
async function parseJsonFile(filePath) {
  try {
    // Read JSON file
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // Parse JSON content
    const jsonData = JSON.parse(fileContent);
    
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
  const equipmentTable = extractEquipmentTable(equipmentData, jsonData.alternateManufacturers);
  
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
        projectInfo.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value: value || 'N/A' });
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
  
  // Process alternate manufacturers separately
  let alternateManufacturersData = null;
  if (alternateManufacturers && alternateManufacturers.length > 0) {
    alternateManufacturersData = alternateManufacturers.map(item => {
      const componentType = item.componentType || '';
      const basisOfDesign = item.basisOfDesign || '';
      const alternateOptions = item.alternateOptions || [];
      
      return {
        componentType,
        basisOfDesign,
        alternateOptions: alternateOptions.map(alt => ({
          manufacturer: alt.manufacturer || '',
          model: alt.model || '',
          representative: alt.representativeInfo?.company || 'N/A',
          compatibilityNotes: alt.compatibilityNotes || ''
        }))
      };
    });
    
    // For backward compatibility, also add to the flat rows structure
    rows.push(['Alternate Manufacturers', '', '', '', '']);
    rows.push(['Component Type', 'BoD Manufacturer', 'Alternate Manufacturer', 'Model', 'Rep', 'Notes']);
    
    alternateManufacturers.forEach(item => {
      const componentType = item.componentType || '';
      const basisOfDesign = item.basisOfDesign || '';
      
      if (item.alternateOptions && item.alternateOptions.length > 0) {
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

module.exports = {
  parseJsonFile
};
