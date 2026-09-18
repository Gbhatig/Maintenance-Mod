const fs = require('fs');

const xml = fs.readFileSync('D:\\MM\\word\\document.xml', 'utf8');

// Replace XML tags to extract clean text while preserving paragraph breaks
// In docx XML: <w:p> is paragraph, <w:tr> is table row, <w:tc> is table cell, <w:t> is text node
let formatted = xml;

// Replace paragraph endings with newlines
formatted = formatted.replace(/<\/w:p>/g, '\n\n');
formatted = formatted.replace(/<\/w:tr>/g, '\n');
formatted = formatted.replace(/<\/w:tc>/g, ' | ');
formatted = formatted.replace(/<w:tr[^>]*>/g, '| ');

// Strip out all remaining XML tags
formatted = formatted.replace(/<[^>]+>/g, '');

// Unescape XML entities
formatted = formatted
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

// Clean up multiple spaces/lines
const lines = formatted
  .split('\n')
  .map(l => l.trim())
  .filter(l => l.length > 0);

const result = lines.join('\n');

fs.writeFileSync('D:\\MM\\MM_Development_Document.md', result, 'utf8');
console.log('Successfully extracted document text. Total lines:', lines.length);
console.log('\n--- FIRST 2000 CHARACTERS PREVIEW ---');
console.log(result.substring(0, 2000));
