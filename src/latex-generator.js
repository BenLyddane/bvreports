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
  latex += '\\begin{tabular}{p{0.25\\textwidth} p{0.65\\textwidth}}\n';
  
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
      latex += `\\textbf{${escapeLatex(item.label)}} & \\href{${item.value}}{BuildVision Project Link} \\\\\n`;
    }
    // Regular handling for other fields
    else {
      // Use line breaks for long values
      const value = escapeLatex(item.value).replace(/https?:\/\/[^\s]+/g, '\\url{$&}');
      latex += `\\textbf{${escapeLatex(item.label)}} & ${value} \\\\\n`;
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
  const { headers, rows } = equipmentTable;
  
  let latex = `\\section*{\\textbf{Project Equipment}}\n\n`;
  
  // Check if we have data to display
  if (headers.length === 0 || rows.length === 0) {
    return latex + "No equipment data available.\n\n";
  }
  
  // Determine if we have the main equipment table and alternate manufacturers table
  // by checking for a row with "Alternate Manufacturers" in the first column
  let mainTableRows = rows;
  let alternateTableData = null;
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].includes("Alternate Manufacturers")) {
      // Split the tables
      mainTableRows = rows.slice(0, i);
      
      // Extract alternate manufacturers table data
      // Find headers row (should be the next row)
      if (i + 1 < rows.length) {
        const altHeaders = rows[i + 1];
        const altRows = rows.slice(i + 2); // Skip the "Alternate Manufacturers" row and headers row
        alternateTableData = { headers: altHeaders, rows: altRows };
      }
      break;
    }
  }
  
  // Generate main equipment table with responsive columns
  latex += `\\setlength{\\tabcolsep}{3pt}\n`;
  latex += `\\renewcommand{\\arraystretch}{1.2}\n`;
  
  // Determine the number of columns and create appropriate column specification
  const numColumns = headers.length;
  
  // Calculate column widths based on the number of columns
  // Use tabularx for better table formatting and automatic width adjustment
  latex += `\\begin{center}\n`;
  latex += `\\begin{tabularx}{\\textwidth}{|`;
  
  // First column (Equipment Tag) gets a bit more space to prevent cut-off
  latex += `p{0.18\\textwidth}|`;
  
  // Distribute remaining width among other columns
  const remainingWidth = (0.82 / (numColumns - 1)).toFixed(2);
  for (let i = 1; i < numColumns; i++) {
    latex += `p{${remainingWidth}\\textwidth}|`;
  }
  
  latex += `}\n`;
  latex += `\\hline\n`;
  
  // Add headers with proper formatting
  latex += headers.map(header => {
    // Replace ampersands with "and" to avoid LaTeX issues
    const safeHeader = header.replace(/&/g, ' and ');
    return `\\textbf{${escapeLatex(safeHeader)}}`;
  }).join(' & ') + ' \\\\\n';
  latex += '\\hline\n';
  
  // Add rows with proper formatting
  mainTableRows.forEach(row => {
    latex += row.map(cell => {
      // Replace ampersands with "and" to avoid LaTeX issues
      const safeCell = cell ? cell.replace(/&/g, ' and ') : '';
      return escapeLatex(safeCell);
    }).join(' & ') + ' \\\\\n';
    latex += '\\hline\n';
  });
  
  // End the table
  latex += '\\end{tabularx}\n';
  latex += '\\end{center}\n\n';
  
  // Generate alternate manufacturers table if it exists
  if (alternateTableData) {
    latex += `\\vspace{1em}\n`;
    latex += `\\section*{\\textbf{Alternate Manufacturers}}\n\n`;
    
    // Create a new table structure for alternate manufacturers
    // with each manufacturer on its own row
    
    // Define the headers we want to display
    const displayHeaders = ['Component Type', 'Basis of Design', 'Alternate Manufacturer', 'Model', 'Representative', 'Compatibility Notes'];
    
    // Use tabularx for better table formatting and automatic width adjustment
    latex += `\\begin{center}\n`;
    latex += `\\begin{tabularx}{\\textwidth}{|`;
    
    // Column widths for the new structure
    latex += `p{0.18\\textwidth}|`; // Component Type
    latex += `p{0.12\\textwidth}|`; // Basis of Design
    latex += `p{0.15\\textwidth}|`; // Alternate Manufacturer
    latex += `p{0.10\\textwidth}|`; // Model
    latex += `p{0.15\\textwidth}|`; // Representative
    latex += `p{0.30\\textwidth}|`; // Compatibility Notes
    
    latex += `}\n`;
    latex += `\\hline\n`;
    
    // Add headers with proper formatting
    latex += displayHeaders.map(header => {
      return `\\textbf{${escapeLatex(header)}}`;
    }).join(' & ') + ' \\\\\n';
    latex += '\\hline\n';
    
    // Process the alternate manufacturers data
    // The data is now structured with each alternate manufacturer on its own row
    // Skip the first two rows (the "Alternate Manufacturers" separator and the headers row)
    const altRows = alternateTableData.rows.slice(2);
    
    // Add each row to the table
    altRows.forEach(row => {
      // The row structure is [Component Type, BoD, Manufacturer, Model, Rep, Notes]
      // Make sure we have the right number of columns
      while (row.length < 6) {
        row.push('');
      }
      
      // Add the row to the table
      latex += row.map(cell => {
        const safeCell = cell ? cell.replace(/&/g, ' and ') : '';
        return escapeLatex(safeCell);
      }).join(' & ') + ' \\\\\n';
      latex += '\\hline\n';
    });
    
    // End the alternate table
    latex += '\\end{tabularx}\n';
    latex += '\\end{center}\n\n';
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
  
  // Use larger font and bold for section titles
  let latex = `\\section*{\\Large\\textbf{${escapeLatex(section.title)}}}\n\n`;
  
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
