import pdfParse from 'pdf-parse';

/**
 * extracts text from a PDF file
 * @param {File} file - PDF file to parse
 * @returns {Promise<string>} - extracted text
 */
export const extractTextFromPdf = async (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    
    fileReader.onload = async (event) => {
      try {
        const typedArray = new Uint8Array(event.target.result);
        const pdfData = await pdfParse(typedArray);
        resolve(pdfData.text);
      } catch (error) {
        reject(error);
      }
    };
    
    fileReader.onerror = (error) => {
      reject(error);
    };
    
    fileReader.readAsArrayBuffer(file);
  });
};

/**
 * xxtracts dates and associated events from text
 * @param {string} text - The text to analyze
 * @returns {Array<{date: Date, title: string, rawText: string}>} - arr of extracted dates and events
 */
export const extractDatesFromText = (text) => {
  const extractedDates = [];
  
  // regex for date patterns
  const datePatterns = [
    // MM/DD/YYYY
    /(\b\d{1,2}\/\d{1,2}\/\d{4}\b)/g,
    // MM-DD-YYYY
    /(\b\d{1,2}-\d{1,2}-\d{4}\b)/g,
    // Month DD, YYYY
    /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b)/gi,
    // Abbreviated month DD, YYYY
    /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b)/gi,
    // YYYY-MM-DD (ISO format)
    /(\b\d{4}-\d{2}-\d{2}\b)/g
  ];
  
  // regex for event keywords
  const eventKeywords = [
    /\b(?:due|deadline|assignment|homework|project|paper|exam|quiz|test|midterm|final|presentation)\b/gi
  ];
  
  const paragraphs = text.split(/\n\s*\n/);
  
  paragraphs.forEach(paragraph => {
    const containsEventKeyword = eventKeywords.some(pattern => pattern.test(paragraph));
    
    if (containsEventKeyword) {
      datePatterns.forEach(pattern => {
        const matches = paragraph.matchAll(pattern);
        
        for (const match of matches) {
          const rawDateText = match[0];
          const datePart = match[1] || match[0];
          
          try {
            const date = new Date(datePart);
            
            // vailidate date
            if (!isNaN(date.getTime())) {
              // title - 10 words before and after the date
              const words = paragraph.split(/\s+/);
              const dateIndex = words.findIndex(word => word.includes(rawDateText));
              
              const startIndex = Math.max(0, dateIndex - 10);
              const endIndex = Math.min(words.length, dateIndex + 10);
              
              const relevantText = words.slice(startIndex, endIndex).join(' ');
              
              // title based on relevant text and keywords
              let title = 'Event';
              
              if (relevantText.match(/\b(?:assignment|homework)\b/i)) {
                title = 'Assignment';
              } else if (relevantText.match(/\b(?:project)\b/i)) {
                title = 'Project';
              } else if (relevantText.match(/\b(?:exam|test|midterm|final)\b/i)) {
                title = 'Exam';
              } else if (relevantText.match(/\b(?:quiz)\b/i)) {
                title = 'Quiz';
              } else if (relevantText.match(/\b(?:paper)\b/i)) {
                title = 'Paper';
              } else if (relevantText.match(/\b(?:presentation)\b/i)) {
                title = 'Presentation';
              }
              
              extractedDates.push({
                date,
                title: `${title} due`,
                rawText: relevantText,
                type: title.toLowerCase(),
                priority: title === 'Exam' ? 'high' : title === 'Project' ? 'high' : 'medium',
                course: 'Unknown' // set by the user later
              });
            }
          } catch (error) {
            console.error('Error parsing date:', error);
          }
        }
      });
    }
  });
  
  return extractedDates.sort((a, b) => a.date - b.date);
};

/**
 * Extracts course information from text
 * @param {string} text - text to analyze
 * @returns {Object} - extracted course information
 */
export const extractCourseInfo = (text) => {
  // default
  const courseInfo = {
    code: 'Unknown',
    name: 'Unknown Course',
    instructor: 'Unknown'
  };
  
  // course display format
  const courseCodePattern = /\b([A-Z]{2,4})\s*[-\s]?\s*(\d{3,4}[A-Z]?)\b/;
  const courseNamePattern = /\b(?:Course|Class)(?:\s+Title)?:\s*(.*?)(?:\n|$)/i;
  const instructorPattern = /\b(?:Instructor|Professor|Teacher|Faculty):\s*((?:[A-Z][a-z]*\.?\s*)+)(?:\n|$)/i;
  
  const courseCodeMatch = text.match(courseCodePattern);
  if (courseCodeMatch) {
    courseInfo.code = `${courseCodeMatch[1]}${courseCodeMatch[2]}`;
  }
  
  const courseNameMatch = text.match(courseNamePattern);
  if (courseNameMatch && courseNameMatch[1].trim()) {
    courseInfo.name = courseNameMatch[1].trim();
  }
  
  const instructorMatch = text.match(instructorPattern);
  if (instructorMatch && instructorMatch[1].trim()) {
    courseInfo.instructor = instructorMatch[1].trim();
  }
  
  return courseInfo;
};

/**
 * Main function to parse PDF file and extract dates and course info
 * @param {File} file - PDF file to parse
 * @returns {Promise<{dates: Array, courseInfo: Object}>} - extracted dates and course info
 */
export const parsePdfForDates = async (file) => {
  try {
    const extractedText = await extractTextFromPdf(file);
    const dates = extractDatesFromText(extractedText);
    const courseInfo = extractCourseInfo(extractedText);
    
    // add course info to each date
    const enrichedDates = dates.map(date => ({
      ...date,
      course: courseInfo.code
    }));
    
    return {
      dates: enrichedDates,
      courseInfo
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
};