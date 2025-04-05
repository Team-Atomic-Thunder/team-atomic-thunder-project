const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// Date patterns for extraction
const datePatterns = [
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gi,
  /\b\d{1,2}-\d{1,2}(?:-\d{2,4})?\b/gi,
  /\b\d{4}-\d{1,2}-\d{1,2}\b/gi,
  /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}\b/gi,
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/gi
];

const assignmentKeywords = [
  'assignment', 'homework', 'project', 'exam', 'test', 'quiz', 
  'due', 'deadline', 'submit', 'submission', 'turn in', 'paper',
  'report', 'presentation', 'task', 'midterm', 'final'
];

async function parsePdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return extractDatesFromText(data.text);
}

function extractDatesFromText(text) {
  const dates = [];
  const lines = text.split('\n');
  const contextWindow = 2;

  // First pass: Find lines with assignment keywords
  const keywordLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim().length >= 3)
    .filter(({ line }) => assignmentKeywords.some(keyword => 
      line.toLowerCase().includes(keyword)
    ));

  // Second pass: Extract dates from context
  keywordLines.forEach(({ line, index }) => {
    const startIdx = Math.max(0, index - contextWindow);
    const endIdx = Math.min(lines.length - 1, index + contextWindow);
    const contextBlock = lines.slice(startIdx, endIdx + 1).join(' ');

    datePatterns.forEach(pattern => {
      const matches = contextBlock.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const dateObj = parseDate(match);
          if (dateObj) {
            dates.push({
              title: line.trim(),
              start: dateObj.toISOString(),
              allDay: true,
              original: match
            });
          }
        });
      }
    });
  });

  return dates;
}

function parseDate(dateStr) {
  try {
    let dateObj;
    if (!dateStr.match(/\d{4}/)) {
      const monthMatch = dateStr.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i);
      if (monthMatch) {
        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        const month = monthMap[monthMatch[0].toLowerCase().substring(0, 3)];
        const day = parseInt(dateStr.match(/\d{1,2}/)[0]);
        dateObj = new Date(new Date().getFullYear(), month, day);
      } else {
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length >= 2) {
          dateObj = new Date(new Date().getFullYear(), parseInt(parts[0]) - 1, parseInt(parts[1]));
        }
      }
    } else {
      dateObj = new Date(dateStr);
    }
    return !isNaN(dateObj.getTime()) ? dateObj : null;
  } catch (error) {
    console.error(`Error parsing date ${dateStr}:`, error);
    return null;
  }
}

module.exports = {
  parsePdf,
  extractDatesFromText
}; 