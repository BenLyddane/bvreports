/**
 * BuildVision PDF Report Generator - Markdown Parser
 * 
 * This module handles parsing markdown files and extracting structured data.
 */

const fs = require('fs-extra');
const yamlFront = require('yaml-front-matter');
const marked = require('marked');
const { escapeLatex } = require('./utils');

/**
 * Parse a markdown file and extract structured data
 * @param {string} filePath - Path to markdown file
 * @returns {Promise<Object>} - Parsed data
 */
async function parseMarkdownFile(filePath) {
  try {
    // Read markdown file
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // Parse front matter if present
    const { __content, ...metadata } = yamlFront.loadFront(fileContent);
    const markdownContent = __content || fileContent;
    
    // Parse markdown to HTML (intermediate step)
    const html = marked.parse(markdownContent);
    
    // Extract structured data
    const structuredData = extractStructuredData(html);
    
    return {
      metadata,
      content: markdownContent,
      html,
      structuredData
    };
  } catch (err) {
    throw new Error(`Failed to parse markdown file: ${err.message}`);
  }
}

/**
 * Extract structured data from HTML
 * @param {string} html - HTML content
 * @returns {Object} - Structured data
 */
function extractStructuredData(html) {
  // Replace problematic ampersands in the HTML before extracting data
  html = html.replace(/Seismic Retrofit &amp; Historic Renovation/g, 'Seismic Retrofit and Historic Renovation');
  html = html.replace(/Seismic Retrofit & Historic Renovation/g, 'Seismic Retrofit and Historic Renovation');
  
  const data = {
    customerInfo: extractTableData(html, 'Customer Information'),
    projectInfo: extractTableData(html, 'Project Information'),
    sections: extractSections(html),
    equipmentTable: extractEquipmentTable(html)
  };
  
  return data;
}

/**
 * Extract table data from HTML
 * @param {string} html - HTML content
 * @param {string} sectionTitle - Title of the section containing the table
 * @returns {Array} - Table data
 */
function extractTableData(html, sectionTitle) {
  // Try to match both with and without heading level markers
  let regex = new RegExp(`<h[1-6][^>]*>${sectionTitle}<\\/h[1-6]>[\\s\\S]*?<table>([\\s\\S]*?)<\\/table>`, 'i');
  let match = html.match(regex);
  
  // If not found, try with strong tags (bold text)
  if (!match) {
    regex = new RegExp(`<strong>${sectionTitle}<\\/strong>[\\s\\S]*?<table>([\\s\\S]*?)<\\/table>`, 'i');
    match = html.match(regex);
  }
  
  // If still not found, try with just the title
  if (!match) {
    regex = new RegExp(`${sectionTitle}[\\s\\S]*?<table>([\\s\\S]*?)<\\/table>`, 'i');
    match = html.match(regex);
  }
  
  // If still not found, try with a more flexible approach for the Customer Information section
  if (!match && sectionTitle === 'Customer Information') {
    regex = new RegExp(`<p><strong>Customer Information<\\/strong><\\/p>[\\s\\S]*?<table>([\\s\\S]*?)<\\/table>`, 'i');
    match = html.match(regex);
    
    if (!match) {
      // Try an even more flexible approach
      regex = new RegExp(`Customer Information[\\s\\S]*?<table>([\\s\\S]*?)<\\/table>`, 'i');
      match = html.match(regex);
    }
  }
  
  if (!match) {
    console.log(`Could not find table for section: ${sectionTitle}`);
    return [];
  }
  
  const tableContent = match[1];
  const rows = tableContent.match(/<tr>([\s\S]*?)<\/tr>/g) || [];
  
  return rows.map(row => {
    const cells = row.match(/<t[dh]>([\s\S]*?)<\/t[dh]>/g) || [];
    
    if (cells.length >= 2) {
      const label = cells[0].replace(/<t[dh]>([\s\S]*?)<\/t[dh]>/, '$1').replace(/<[^>]*>/g, '');
      let value = cells[1].replace(/<t[dh]>([\s\S]*?)<\/t[dh]>/, '$1').replace(/<[^>]*>/g, '');
      
      // Replace ampersands with "and" to avoid LaTeX issues
      value = value.replace(/&amp;/g, ' and ');
      value = value.replace(/&/g, ' and ');
      
      return { label, value };
    }
    
    return null;
  }).filter(Boolean);
}

/**
 * Extract equipment table from HTML
 * @param {string} html - HTML content
 * @returns {Object} - Equipment table data
 */
function extractEquipmentTable(html) {
  // Find all tables after the Project Equipment heading
  const regex = /<h[1-6][^>]*>Project Equipment<\/h[1-6]>([\s\S]*?)(?=<h[1-6]|$)/i;
  const match = html.match(regex);
  
  if (!match) return { headers: [], rows: [] };
  
  const sectionContent = match[1];
  
  // Find all tables in the section
  const tableRegex = /<table>([\s\S]*?)<\/table>/g;
  let tableMatch;
  const tables = [];
  
  while ((tableMatch = tableRegex.exec(sectionContent)) !== null) {
    tables.push(tableMatch[1]);
  }
  
  if (tables.length === 0) return { headers: [], rows: [] };
  
  // Process all tables and combine them
  let allRows = [];
  
  tables.forEach(tableContent => {
    const rows = tableContent.match(/<tr>([\s\S]*?)<\/tr>/g) || [];
    if (rows.length > 0) {
      // Process each row
      const processedRows = rows.map(row => {
        // Check if this is a header row (contains <th> tags)
        if (row.includes('<th>')) {
          const headers = (row.match(/<th>([\s\S]*?)<\/th>/g) || [])
            .map(header => header.replace(/<th>([\s\S]*?)<\/th>/, '$1').replace(/<[^>]*>/g, '').trim());
          return { isHeader: true, cells: headers };
        } else {
          // Data row
          const cells = (row.match(/<td>([\s\S]*?)<\/td>/g) || [])
            .map(cell => {
              let cellContent = cell.replace(/<td>([\s\S]*?)<\/td>/, '$1').replace(/<[^>]*>/g, '').trim();
              // Replace ampersands with "and" to avoid LaTeX issues
              cellContent = cellContent.replace(/&amp;/g, ' and ');
              cellContent = cellContent.replace(/&/g, ' and ');
              return cellContent;
            });
          return { isHeader: false, cells };
        }
      });
      
      allRows = allRows.concat(processedRows);
    }
  });
  
  // Extract headers from the first header row
  const headerRowIndex = allRows.findIndex(row => row.isHeader);
  let headers = [];
  
  if (headerRowIndex >= 0) {
    headers = allRows[headerRowIndex].cells;
    // Remove the header row from allRows
    allRows.splice(headerRowIndex, 1);
  }
  
  // Convert remaining rows to the format expected by the LaTeX generator
  const dataRows = allRows.map(row => row.cells);
  
  return { headers, rows: dataRows };
}

/**
 * Extract sections from HTML
 * @param {string} html - HTML content
 * @returns {Array} - Sections data
 */
function extractSections(html) {
  // Remove customer and project info sections
  let content = html
    .replace(/<h[1-6][^>]*>Customer Information<\/h[1-6]>[\s\S]*?<table>[\s\S]*?<\/table>/i, '')
    .replace(/<h[1-6][^>]*>Project Information<\/h[1-6]>[\s\S]*?<table>[\s\S]*?<\/table>/i, '')
    .replace(/<h[1-6][^>]*>Project Equipment<\/h[1-6]>[\s\S]*?<table>[\s\S]*?<\/table>/i, '');
  
  // Extract sections
  const sectionRegex = /<h2>(.*?)<\/h2>([\s\S]*?)(?=<h2>|$)/g;
  const sections = [];
  let match;
  
  while ((match = sectionRegex.exec(content)) !== null) {
    const title = match[1].replace(/<[^>]*>/g, '');
    const sectionContent = match[2];
    
    // Extract subsections
    const subsections = [];
    const subsectionRegex = /<h3>(.*?)<\/h3>([\s\S]*?)(?=<h3>|<h2>|$)/g;
    let subsectionMatch;
    
    while ((subsectionMatch = subsectionRegex.exec(sectionContent)) !== null) {
      const subsectionTitle = subsectionMatch[1].replace(/<[^>]*>/g, '');
      const subsectionContent = subsectionMatch[2];
      
      subsections.push({
        title: subsectionTitle,
        content: cleanHtml(subsectionContent)
      });
    }
    
    // Clean section content (remove subsections)
    let cleanedContent = sectionContent;
    subsections.forEach(subsection => {
      cleanedContent = cleanedContent.replace(`<h3>${subsection.title}</h3>${subsection.content}`, '');
    });
    
    sections.push({
      title,
      content: cleanHtml(cleanedContent),
      subsections
    });
  }
  
  return sections;
}

/**
 * Clean HTML content
 * @param {string} html - HTML content
 * @returns {string} - Cleaned content
 */
function cleanHtml(html) {
  // First, handle HTML entities
  html = html.replace(/&amp;/g, '\\&');
  html = html.replace(/&#39;/g, "'");
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  
  // Process HTML tags and convert to LaTeX
  let cleanedHtml = html
    // Ensure paragraphs have proper spacing
    .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
    
    // Handle formatting
    .replace(/<strong>([\s\S]*?)<\/strong>/g, '\\textbf{$1}')
    .replace(/<b>([\s\S]*?)<\/b>/g, '\\textbf{$1}')
    .replace(/<em>([\s\S]*?)<\/em>/g, '\\textit{$1}')
    .replace(/<i>([\s\S]*?)<\/i>/g, '\\textit{$1}')
    
    // Handle links
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/g, '$1')
    
    // Handle lists - ensure proper formatting
    .replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
      // Process list items
      const processedContent = content.replace(/<li>([\s\S]*?)<\/li>/g, '\\item $1\n');
      return '\\begin{itemize}\n' + processedContent + '\\end{itemize}\n\n';
    })
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) => {
      // Process list items
      const processedContent = content.replace(/<li>([\s\S]*?)<\/li>/g, '\\item $1\n');
      return '\\begin{enumerate}\n' + processedContent + '\\end{enumerate}\n\n';
    })
    
    // Handle line breaks
    .replace(/<br\s*\/?>/g, '\\\\\n')
    
    // Handle tables - convert to LaTeX tabular
    .replace(/<table>([\s\S]*?)<\/table>/g, (match, content) => {
      // Extract rows
      const rows = content.match(/<tr>([\s\S]*?)<\/tr>/g) || [];
      if (rows.length === 0) return '';
      
      // Process rows
      let tableContent = '';
      rows.forEach(row => {
        // Extract cells
        const cells = row.match(/<t[dh]>([\s\S]*?)<\/t[dh]>/g) || [];
        if (cells.length === 0) return;
        
        // Process cells
        const cellsContent = cells.map(cell => {
          return cell.replace(/<t[dh]>([\s\S]*?)<\/t[dh]>/g, '$1').replace(/<[^>]*>/g, '');
        }).join(' & ');
        
        tableContent += cellsContent + ' \\\\\n';
      });
      
      // Create tabular environment
      return '\\begin{tabular}{|' + 'l|'.repeat(rows[0].match(/<t[dh]>/g).length) + '}\n\\hline\n' +
             tableContent + '\\hline\n\\end{tabular}\n\n';
    })
    
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n');
  
  // Ensure proper line breaks for LaTeX
  cleanedHtml = cleanedHtml
    // Add proper paragraph spacing
    .replace(/\n\n/g, '\n\n\\par\n')
    
    // Clean up any excessive spacing that might have been introduced
    .replace(/\\par\n\\par/g, '\\par')
    .replace(/\n{3,}/g, '\n\n')
    
    // Fix any broken LaTeX commands
    .replace(/\\\\/g, '\\\\')
    .replace(/\\textbf\s*\{([^{}]*)\}/g, '\\textbf{$1}')
    .replace(/\\textit\s*\{([^{}]*)\}/g, '\\textit{$1}')
    
    // Trim whitespace
    .trim();
  
  return cleanedHtml;
}

/**
 * Convert markdown to LaTeX
 * @param {string} markdown - Markdown content
 * @returns {string} - LaTeX content
 */
function markdownToLatex(markdown) {
  // First convert markdown to HTML
  const html = marked.parse(markdown);
  
  // Then convert HTML to LaTeX
  let latex = html
    // Paragraphs
    .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
    
    // Headings
    .replace(/<h1>([\s\S]*?)<\/h1>/g, '\\section{$1}\n')
    .replace(/<h2>([\s\S]*?)<\/h2>/g, '\\section{$1}\n')
    .replace(/<h3>([\s\S]*?)<\/h3>/g, '\\subsection{$1}\n')
    .replace(/<h4>([\s\S]*?)<\/h4>/g, '\\subsubsection{$1}\n')
    .replace(/<h5>([\s\S]*?)<\/h5>/g, '\\paragraph{$1}\n')
    .replace(/<h6>([\s\S]*?)<\/h6>/g, '\\subparagraph{$1}\n')
    
    // Formatting
    .replace(/<strong>([\s\S]*?)<\/strong>/g, '\\textbf{$1}')
    .replace(/<b>([\s\S]*?)<\/b>/g, '\\textbf{$1}')
    .replace(/<em>([\s\S]*?)<\/em>/g, '\\textit{$1}')
    .replace(/<i>([\s\S]*?)<\/i>/g, '\\textit{$1}')
    
    // Lists
    .replace(/<ul>([\s\S]*?)<\/ul>/g, '\\begin{itemize}\n$1\\end{itemize}\n')
    .replace(/<ol>([\s\S]*?)<\/ol>/g, '\\begin{enumerate}\n$1\\end{enumerate}\n')
    .replace(/<li>([\s\S]*?)<\/li>/g, '\\item $1\n')
    
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '\\href{$1}{$2}')
    
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Escape LaTeX special characters in the content
  latex = escapeLatex(latex);
  
  return latex;
}

module.exports = {
  parseMarkdownFile,
  markdownToLatex
};
