/**
 * BuildVision PDF Report Generator - Legacy Entry Point
 * 
 * This file is maintained for backward compatibility.
 * It re-exports the main module from main.js.
 */

const { main } = require('./main');
const { generatePDF } = require('./pdf-generator');
const { parseJsonFile } = require('./json-parser');

module.exports = {
  main,
  generatePDF,
  parseJsonFile
};
