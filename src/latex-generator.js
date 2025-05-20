/**
 * BuildVision PDF Report Generator - LaTeX Generator
 * 
 * This module handles generating LaTeX code from parsed markdown data.
 */

const path = require('path');
const CONFIG = require('./config');
const { escapeLatex, getSectionIcon, formatDate } = require('./utils');

/**
 * Generate LaTeX code from parsed markdown data
 * @param {Object} parsedData - Parsed markdown data
 * @param {string} reportTitle - Title of the report
 * @returns {string} - LaTeX code
 */
function generateLatex(parsedData, reportTitle) {
  const { metadata, jsonData, structuredData } = parsedData;
  const { customerInfo, projectInfo, sections, equipmentTable } = structuredData;
  
  // Start with document class and preamble
  let latex = `\\documentclass{../templates/${CONFIG.latex.documentClass}}\n\n`;
  
  // Begin document
  latex += '\\begin{document}\n\n';
  
  // Add title page
  latex += generateTitlePage(reportTitle, metadata, jsonData);
  
  // Add customer and project information directly (without minipage)
  
  // Add customer and project information with slightly smaller font size
  latex += '\\small\n'; // Reduce font size for these sections
  
  // Add customer information
  if (customerInfo.length > 0) {
    latex += generateInfoSection('Customer Information', customerInfo, CONFIG.icons.info);
    // Add negative space to reduce gap between sections
    latex += '\\vspace{-10pt}\n';
  }
  
  // Add project information
  if (projectInfo.length > 0) {
    latex += generateInfoSection('Project Information', projectInfo, CONFIG.icons.document);
    // Add negative space to reduce gap between sections
    latex += '\\vspace{-10pt}\n';
  }
  
  // Reset font size to normal
  latex += '\\normalsize\n';
  
  // Add preparer information with the same format as other sections
  if (jsonData && jsonData.preparerInformation) {
    // Add section heading first (outside the box) with reduced spacing
    latex += `\\section*{\\textbf{Prepared By}}\n\\vspace{-5pt}\n`;
    
    // Then add the preparer info box (without the heading inside)
    const preparerInfo = formatPreparerInfo(jsonData.preparerInformation);
    latex += `\\bvpreparerinfo{${preparerInfo}}\n\n`;
  }
  
  // Add a page break before the equipment table
  latex += '\\clearpage\n\n';
  
  // Add equipment table if available
  if (equipmentTable.headers.length > 0 && equipmentTable.rows.length > 0) {
    latex += generateEquipmentTable(equipmentTable);
  }
  
  // Add content sections
  sections.forEach(section => {
    latex += generateSection(section);
  });
  
  // Add BuildVision logo and preparer information to the last page
  latex += '\\clearpage\n';
  latex += '\\vspace*{\\fill}\n';
  latex += '\\begin{center}\n';
  latex += `\\includegraphics[width=7cm]{${CONFIG.paths.buildVisionLogo}}\n`;
  
  // Add preparer information with better formatting
  if (jsonData && jsonData.preparerInformation) {
    const preparerInfo = formatPreparerInfo(jsonData.preparerInformation);
    latex += `\\vspace{1cm}\n`;
    latex += `\\bvpreparerinfo{${preparerInfo}}\n`;
  }
  
  latex += '\\end{center}\n';
  latex += '\\vspace*{\\fill}\n';
  
  // End document
  latex += '\\end{document}\n';
  
  return latex;
}

/**
 * Generate LaTeX code for the title page
 * @param {string} reportTitle - Title of the report
 * @param {Object} metadata - Metadata from the markdown file
 * @param {Object} jsonData - Original JSON data
 * @returns {string} - LaTeX code for the title page
 */
function generateTitlePage(reportTitle, metadata, jsonData) {
  const logoPath = '/Users/benjaminlyddane/Documents/Programming/BVReports/BuildVisionLogo.png';
  // Don't show the report title on the title page
  const subtitle = CONFIG.defaultMetadata.subtitle;
  const tagline = metadata.tagline || CONFIG.defaultMetadata.tagline;
  const description = metadata.description || CONFIG.defaultMetadata.description;
  
  // The Key Benefits section is now included directly in the bvtitlepage command in the class file
  return `\\bvtitlepage{${logoPath}}{}{${escapeLatex(subtitle)}}{${escapeLatex(tagline)}}{${escapeLatex(description)}}\n\n`;
}

/**
 * Format preparer information for display
 * @param {Object} preparerData - Preparer information from JSON
 * @returns {string} - Formatted preparer information
 */
function formatPreparerInfo(preparerData) {
  if (!preparerData || !preparerData.preparers || preparerData.preparers.length === 0) {
    return escapeLatex('BuildVision');
  }
  
  let result = '';
  
  // Add each preparer's information
  preparerData.preparers.forEach((preparer, index) => {
    if (index > 0) {
      result += ' \\\\ [0.3cm] '; // Add vertical space between preparers
    }
    
    result += escapeLatex(preparer.name);
    
    if (preparer.email) {
      result += ' \\\\ ' + escapeLatex(preparer.email);
    }
    
    if (preparer.phone) {
      result += ' \\\\ ' + escapeLatex(preparer.phone);
    }
  });
  
  // Add preparation date if available
  if (preparerData.preparationDate) {
    result += ' \\\\ [0.5cm] Date: ' + escapeLatex(preparerData.preparationDate);
  }
  
  return result;
}

/**
 * Break camelCase or PascalCase text into separate words
 * @param {string} text - The camelCase or PascalCase text to break
 * @returns {string} - Text with spaces inserted at word boundaries
 */
function formatCamelCaseText(text) {
  if (!text) return '';
  
  // Insert a space before each uppercase letter that follows a lowercase letter
  // or a number and is not the first character
  return text.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/**
 * Generate LaTeX code for an information section (customer or project info)
 * @param {string} title - Section title
 * @param {Array} infoData - Information data
 * @param {string} icon - Icon for the section
 * @returns {string} - LaTeX code for the information section
 */
function generateInfoSection(title, infoData, icon) {
  // Use section* with less space between heading and content
  let latex = `\\section*{\\textbf{${escapeLatex(title)}}}\n\\vspace{-5pt}\n`;
  
  latex += '\\begin{tcolorbox}[\n';
  latex += '  enhanced,\n';
  latex += '  colback=white,\n';
  latex += '  colframe=bvNeutralBorder,\n';
  latex += '  arc=5pt,\n';
  latex += '  boxrule=1pt,\n';
  latex += '  left=15pt,\n';
  latex += '  right=15pt,\n';
  latex += '  top=10pt,\n';
  latex += '  bottom=10pt,\n';
  latex += '  width=\\textwidth,\n';
  latex += '  breakable=true\n';
  latex += ']\n';
  
  // Optimize row height for more compact layout
  latex += '\\renewcommand{\\arraystretch}{1.3}\n'; // Slightly reduced row height
  
  // Use narrower first column and allow more space for values in second column
  // Also force line breaking in labels with parbox to handle very long labels
  latex += '\\begin{tabular}{p{0.15\\textwidth} p{0.75\\textwidth}}\n';
  
  // Store project URL for later use with BuildVision link
  let projectUrl = '';
  
  // Filter out ProjectLink from Customer Information
  const filteredInfoData = infoData.filter(item => {
    if (item.label === 'ProjectLink') {
      // Store the URL for later use
      projectUrl = item.value;
      // Filter out this item
      return false;
    }
    return true;
  });
  
  filteredInfoData.forEach(item => {
    // Special handling for project URL to show "BuildVision Project Link" but keep the full URL in the hyperlink
    if (item.label === 'Project URL' && item.value.startsWith('http')) {
      // Process label to split camelCase/PascalCase
      const formattedLabelText = formatCamelCaseText(item.label);
      const labelText = escapeLatex(formattedLabelText);
      // Use parbox inside makecell for project URL too
      latex += `\\textbf{\\makecell[l]{\\parbox[t]{0.14\\textwidth}{${labelText}}}} & \\href{${item.value}}{BuildVision Project Link} \\\\\n`;
    }
    // Regular handling for other fields
    else {
      // Process label to split camelCase/PascalCase and wrap long words
      const formattedLabelText = formatCamelCaseText(item.label);
      const labelText = escapeLatex(formattedLabelText);
      // Use parbox inside makecell to force wrapping of long labels
      const formattedLabel = `\\textbf{\\makecell[l]{\\parbox[t]{0.14\\textwidth}{${labelText}}}}`;
      
      // Use line breaks for long values
      const value = escapeLatex(item.value).replace(/https?:\/\/[^\s]+/g, '\\url{$&}');
      latex += `${formattedLabel} & ${value} \\\\\n`;
    }
  });
  
  latex += '\\end{tabular}\n';
  latex += '\\end{tcolorbox}\n\n';
  
  return latex;
}

/**
 * Generate LaTeX code for the equipment table
 * @param {Object} equipmentTable - Equipment table data
 * @returns {string} - LaTeX code for the equipment table
 */
function generateEquipmentTable(equipmentTable) {
  const { headers, groupedEquipment, alternateManufacturers } = equipmentTable;
  
  let latex = `\\section*{\\textbf{Project Equipment}}\n\n`;
  
  // Check if we have data to display
  if (!groupedEquipment || groupedEquipment.length === 0) {
    return latex + "No equipment data available.\n\n";
  }
  
  // Define colors for the table - using existing BuildVision colors
  const gridColor = 'bvNeutralBorder'; // Use existing neutral border color
  const headerBg = 'bvPrimaryLighter'; // Use existing light primary color
  
  // Set table spacing
  latex += `\\setlength{\\tabcolsep}{5pt}\n`;
  latex += `\\renewcommand{\\arraystretch}{1.2}\n`;
  
  // Generate a mini-table for each component type
  groupedEquipment.forEach(group => {
    // Add component type header with styling similar to section headers
    latex += `\\subsection*{\\textbf{${escapeLatex(group.componentType)}}}\n\n`;
    
    // Create a tcolorbox for the table with shadow and modern styling
    // Make it breakable to allow page breaks
    latex += `\\begin{tcolorbox}[
      enhanced,
      breakable=true,
      colback=white,
      colframe=white,
      arc=3pt,
      boxrule=0pt,
      shadow={0.5mm}{0.5mm}{2mm}{black!15},
      left=0pt,
      right=0pt,
      top=0pt,
      bottom=0pt,
      width=\\textwidth,
      boxsep=0pt
    ]\n`;
    
    // Use longtable instead of tabularx to allow page breaks
    latex += `\\begin{longtable}{|`;
    
    // Column specifications with adjusted widths to prevent overfull hbox
    latex += `p{0.25\\textwidth}|`; // Equipment Tag - widened
    latex += `p{0.35\\textwidth}|`; // Manufacturer - widened
    latex += `p{0.40\\textwidth}|`; // Model - widened
    latex += `}\n`;
    
    // Define header that repeats on each page
    latex += `\\hline\n`;
    latex += `\\rowcolor{${headerBg}}\n`;
    latex += headers.map(header => {
      return `\\textbf{${escapeLatex(header)}}`;
    }).join(' & ') + ' \\\\\n';
    latex += '\\hline\n';
    latex += '\\endhead\n\n';
    
    // Define footer that repeats on each page (optional)
    latex += '\\hline\n';
    latex += `\\multicolumn{3}{|r|}{\\textit{Continued on next page...}} \\\\\n`;
    latex += '\\hline\n';
    latex += '\\endfoot\n\n';
    
    // Define last footer (no "continued" text)
    latex += '\\hline\n';
    latex += '\\endlastfoot\n\n';
    
    // Add rows with proper formatting
    group.equipment.forEach(item => {
      const row = [
        item.equipmentTag,
        item.manufacturer,
        item.model
      ];
      
      latex += row.map(cell => {
        return escapeLatex(cell);
      }).join(' & ') + ' \\\\\n';
      latex += '\\hline\n';
    });
    
    // End the table
    latex += '\\end{longtable}\n';
    latex += '\\end{tcolorbox}\n\n';
    
    // Add notes section below the table if notes exist
    if (group.notes && group.notes.trim()) {
      latex += `\\begin{tcolorbox}[
        enhanced,
        colback=white!95!bvPrimaryLighter,
        colframe=bvNeutralBorder,
        arc=3pt,
        boxrule=0.5pt,
        left=10pt,
        right=10pt,
        top=8pt,
        bottom=8pt,
        width=\\textwidth,
        boxsep=0pt,
        title=\\textcolor{bvPrimary}{\\textbf{Notes}}
      ]
      ${escapeLatex(group.notes)}
      \\end{tcolorbox}\n\n`;
    }
    
    latex += '\\vspace{1em}\n\n';
  });
  
  // Generate suppliers table if it exists
  if (alternateManufacturers && alternateManufacturers.length > 0) {
    latex += `\\section*{\\textbf{Suppliers}}\n\n`;
    
    // Process each component type separately
    alternateManufacturers.forEach(item => {
      // Add component type header
      latex += `\\subsection*{\\textbf{${escapeLatex(item.componentType)}}}\n\n`;
      
      // Create a single tcolorbox containing both the basis of design and the table
      // Make it breakable to allow page breaks
      latex += `\\begin{tcolorbox}[
        enhanced,
        breakable=true,
        colback=white,
        colframe=white,
        arc=3pt,
        boxrule=0pt,
        shadow={0.5mm}{0.5mm}{2mm}{black!15},
        left=0pt,
        right=0pt,
        top=0pt,
        bottom=0pt,
        width=\\textwidth,
        boxsep=0pt
      ]\n`;
      
      // Use longtable instead of tabularx to allow page breaks
      latex += `\\begin{longtable}{|`;
      
      // Column specifications
      latex += `p{0.15\\textwidth}|`; // Manufacturer
      latex += `p{0.15\\textwidth}|`; // Model
      latex += `p{0.15\\textwidth}|`; // Representative
      latex += `p{0.15\\textwidth}|`; // AI Estimated Cost Difference
      latex += `p{0.30\\textwidth}|`; // Compatibility Notes
      latex += `p{0.10\\textwidth}|`; // Basis of Design
      latex += `}\n`;
      
      // Add disclaimer for AI cost estimates
      latex += `\\multicolumn{6}{p{\\textwidth}}{\\small\\textit{Note: Cost differences are AI-estimated percentages relative to Basis of Design and are not based on actual project data. Always obtain accurate quotes from vendors directly via \\href{https://buildvision.io}{buildvision.io}.}}\\\\[5pt]\n`;
      
      // Define header that repeats on each page
      latex += `\\hline\n`;
      latex += `\\rowcolor{${headerBg}}\n`;
      
      // Add headers with proper formatting and background color
      const altHeaders = ['Manufacturer', 'Model', 'Representative', 'AI Est. Cost Diff.', 'Compatibility Notes', 'BoD'];
      latex += altHeaders.map(header => {
        // Use makecell to allow line breaks in headers
        return `\\textbf{\\makecell{${escapeLatex(header)}}}`;
      }).join(' & ') + ' \\\\\n';
      latex += '\\hline\n';
      latex += '\\endhead\n\n';
      
      // Define footer that repeats on each page (optional)
      latex += '\\hline\n';
      latex += `\\multicolumn{6}{|r|}{\\textit{Continued on next page...}} \\\\\n`;
      latex += '\\hline\n';
      latex += '\\endfoot\n\n';
      
      // Define last footer (no "continued" text)
      latex += '\\hline\n';
      latex += '\\endlastfoot\n\n';
      
      // First extract the basis of design supplier from the JSON data
      let bodSupplier = null;
      if (item.basisOfDesign) {
        // For backward compatibility with the old format
        bodSupplier = {
          manufacturer: item.basisOfDesign.split(' ')[0] || '',
          model: item.basisOfDesign.split(' ').slice(1).join(' ') || '',
          representative: 'N/A',
          compatibilityNotes: 'Basis of Design',
          isBasisOfDesign: true
        };
      }
      
      // Combine basis of design and alternates into one array for display
      const allSuppliers = [];
      
      // For the new format (where we have filtered alternateOptions already)
      if (item.suppliers && item.suppliers.length > 0) {
        // First, add the basis of design supplier (from the item.suppliers array)
        const bodSupplier = item.suppliers.find(s => s.isBasisOfDesign === true);
        if (bodSupplier) {
          allSuppliers.push({
            manufacturer: bodSupplier.manufacturer || '',
            model: bodSupplier.model || '',
            representative: bodSupplier.representativeInfo?.company || 'N/A',
            compatibilityNotes: bodSupplier.compatibilityNotes || 'Basis of Design',
            isBasisOfDesign: true
          });
        }
        
        // Then add the alternate options (already filtered in json-parser.js)
        item.alternateOptions.forEach(alt => {
          allSuppliers.push({
            ...alt,
            isBasisOfDesign: false
          });
        });
      } 
      // For the old format
      else {
        // Add the basis of design supplier if found in the old format
        if (bodSupplier) {
          allSuppliers.push(bodSupplier);
        }
        
        // Add all alternate options from the old format
        item.alternateOptions.forEach(alt => {
          allSuppliers.push({
            ...alt,
            isBasisOfDesign: false
          });
        });
      }
      
      // Sort the suppliers to make sure BoD appears first
      allSuppliers.sort((a, b) => {
        if (a.isBasisOfDesign) return -1;
        if (b.isBasisOfDesign) return 1;
        return 0;
      });
      
      // Add rows for each supplier
      allSuppliers.forEach(supplier => {
        // Create special handling for BoD cell to prevent escaping LaTeX commands
        const bodCell = supplier.isBasisOfDesign ? 'Yes' : 'No';
        
        // Apply highlighting to the basis of design row
        if (supplier.isBasisOfDesign) {
          latex += `\\rowcolor{bvNeutralLight}\n`;
        }
        
        const row = [
          supplier.manufacturer,
          supplier.model,
          supplier.representative,
          supplier.costDifference || '',
          supplier.compatibilityNotes
        ];
        
        // Escape all cells except the last one (BoD indicator)
        const escapedCells = row.map(cell => escapeLatex(cell)).join(' & ');
        
        // Add the BoD cell separately with special formatting based on supplier type
        let formattedBodCell;
        if (supplier.isBasisOfDesign) {
          formattedBodCell = '\\textbf{Yes}';
        } else if (supplier.isListedAlternate) {
          formattedBodCell = 'Listed';
        } else {
          formattedBodCell = 'No';
        }
        
        latex += escapedCells + ` & ${formattedBodCell}` + ' \\\\\n';
        latex += '\\hline\n';
      });
      
      // End the table
      latex += '\\end{longtable}\n';
      latex += '\\end{tcolorbox}\n\n';
      latex += '\\vspace{1em}\n\n';
    });
  }
  
  return latex;
}

/**
 * Generate LaTeX code for a content section
 * @param {Object} section - Section data
 * @returns {string} - LaTeX code for the section
 */
function generateSection(section) {
  const icon = getSectionIcon(section.title);
  
  // Check if this is the Design Notes section and add a page break if it is
  let latex = '';
  if (section.title === 'Design Notes') {
    latex += `\\clearpage\n`;
  }
  
  // Use larger font and bold for section titles
  latex += `\\section*{\\Large\\textbf{${escapeLatex(section.title)}}}\n\n`;
  
  // Add section content with proper spacing and formatting
  if (section.content.trim()) {
    // Use tcolorbox for better content formatting and to prevent text overflow
    latex += `\\begin{tcolorbox}[
      enhanced,
      colback=white,
      colframe=bvNeutralBorder,
      arc=5pt,
      boxrule=0.5pt,
      left=10pt,
      right=10pt,
      top=10pt,
      bottom=10pt,
      breakable=true,
      width=\\textwidth
    ]\n`;
    
    // Apply smaller font for body text
    latex += `\\small\\normalfont\\RaggedRight\n${section.content}\n`;
    
    latex += `\\end{tcolorbox}\n\n`;
    latex += `\\vspace{1em}\n\n`;
  }
  
  // Add subsections with proper spacing and formatting
  section.subsections.forEach(subsection => {
    // Make subsection title bold and larger
    latex += `\\subsection*{\\large\\textbf{${escapeLatex(subsection.title)}}}\n\n`;
    
    // Use tcolorbox for better content formatting and to prevent text overflow
    latex += `\\begin{tcolorbox}[
      enhanced,
      colback=white,
      colframe=bvNeutralBorder,
      arc=5pt,
      boxrule=0.5pt,
      left=10pt,
      right=10pt,
      top=10pt,
      bottom=10pt,
      breakable=true,
      width=\\textwidth
    ]\n`;
    
    // Apply smaller font for body text
    latex += `\\small\\normalfont\\RaggedRight\n${subsection.content}\n`;
    
    latex += `\\end{tcolorbox}\n\n`;
    latex += `\\vspace{1em}\n\n`;
  });
  
  return latex;
}

/**
 * Generate a LaTeX table from data
 * @param {Array} headers - Table headers
 * @param {Array} rows - Table rows
 * @returns {string} - LaTeX table code
 */
function generateTable(headers, rows) {
  const numColumns = headers.length;
  const colSpec = Array(numColumns).fill('p{\\dimexpr(\\textwidth-2em)/' + numColumns + '}').join(' ');
  
  let latex = `\\begin{longtable}{${colSpec}}\n`;
  
  // Add headers
  latex += '\\rowcolor{bvPrimaryLight}\n';
  latex += headers.map(header => `\\textbf{${escapeLatex(header)}}`).join(' & ') + ' \\\\\n';
  latex += '\\hline\n';
  
  // Add rows
  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      latex += '\\rowcolor{white}\n';
    } else {
      latex += '\\rowcolor{bvNeutralLight}\n';
    }
    
    latex += row.map(cell => escapeLatex(cell)).join(' & ') + ' \\\\\n';
  });
  
  latex += '\\end{longtable}\n\n';
  
  return latex;
}

module.exports = {
  generateLatex
};
