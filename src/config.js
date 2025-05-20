/**
 * BuildVision PDF Report Generator - Configuration
 * 
 * This file contains all configuration settings for the BuildVision PDF report generator.
 * It centralizes colors, paths, and other settings used throughout the application.
 */

const path = require('path');
const { getBestLatexPath } = require('./latex-setup');

// Configuration object
const CONFIG = {
  // Directory paths
  paths: {
    projectsDir: path.join(__dirname, '..', 'projects'),
    outputDir: path.join(__dirname, '..', 'output'),
    templatesDir: path.join(__dirname, '..', 'templates'),
    assetsDir: path.join(__dirname, '..', 'assets'),
    processedListFile: path.join(__dirname, '..', 'processed-files.json'),
    buildVisionLogo: path.join(__dirname, '..', 'BuildVisionLogo.png'),
  },
  
  // LaTeX settings
  latex: {
    documentClass: 'buildvision',
    compiler: getBestLatexPath(), // Dynamically find the best LaTeX compiler path
    compilerOptions: [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-file-line-error'
    ],
    tempDir: path.join(__dirname, '..', 'temp'),
  },
  
  // BuildVision branding colors
  colors: {
    primary: {
      main: '#4A3AFF',      // Primary 400
      dark: '#3528BE',      // Primary 600
      light: '#ABBBFF',     // Primary 200
      lighter: '#E8EBFF'    // Primary 50
    },
    neutral: {
      dark: '#2A2A2F',      // Neutral 800
      medium: '#8C8C92',    // Neutral 500
      light: '#F8F8F8',     // Neutral 50
      border: '#C9CBCF',    // Neutral 200
      background: '#FFFFFF' // White
    },
    success: '#16DA7C',     // Green 400
    warning: '#FFCC17',     // Yellow 400
    error: '#EC4343',       // Red 400
    text: {
      primary: '#1A1A1F',   // Almost black
      secondary: '#4F4F55', // Dark gray
      tertiary: '#8C8C92'   // Medium gray
    }
  },
  
  // Spacing values (in points for LaTeX)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  
  // Icons for different sections (using text alternatives instead of emoji)
  icons: {
    document: 'DOC',
    info: 'INFO',
    equipment: 'EQUIP',
    design: 'DESIGN',
    heating: 'HEAT',
    pump: 'PUMP',
    air: 'AIR',
    distribution: 'DIST',
    humidity: 'HUMID',
    refrigerant: 'REFRIG',
    fan: 'FAN',
    recommendation: 'REC',
    conclusion: 'CONCL',
    time: 'TIME',
    cost: 'COST',
    visibility: 'VIS'
  },
  
  // Default report metadata
  defaultMetadata: {
    title: 'BuildVision Report',
    subtitle: 'Custom Procurement Report',
    author: 'BuildVision',
    subject: 'BuildVision Project Report',
    keywords: 'buildvision, construction, report',
    tagline: 'Control How You Source Building Systems',
    description: 'Directly access suppliers and automate sourcing, procurement, and financing—all from one platform'
  }
};

module.exports = CONFIG;
