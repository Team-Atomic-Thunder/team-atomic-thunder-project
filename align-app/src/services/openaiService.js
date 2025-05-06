import axios from 'axios';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const parseSyllabusWithAI = async (text) => {
  try {
    console.log('Sending text to AI for parsing. Text length:', text.length);
    console.log('First 500 characters of text:', text.substring(0, 500));
    console.log('API Key available:', !!OPENAI_API_KEY); // Log if API key is set (without revealing the key)

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o-mini",
        store: true,
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that extracts assignment dates from syllabi. Your task is to:
1. Look for any dates in the text
2. For each date, check if it's associated with an assignment, exam, or important deadline
3. Extract the title of the assignment/exam
4. Format the date in ISO format
5. Include any relevant description

Return ONLY a JSON array of objects with these fields:
- title: The name of the assignment/exam
- start: The date in ISO format (e.g., "2024-03-15T00:00:00.000Z")
- description: Any additional details about the assignment
- type: The type of event (assignment, exam, quiz, etc.)

Example response:
[{"title": "Homework 1", "start": "2024-03-15T00:00:00.000Z", "description": "Complete problems 1-5", "type": "assignment"}]

Important:
- Look for dates in any format (MM/DD/YYYY, Month DD, YYYY, etc.)
- Check for keywords like "due", "deadline", "assignment", "exam", "quiz", "project"
- If no events are found, return an empty array []
- Do not include any markdown formatting or additional text`
          },
          {
            role: "user",
            content: `Here is the syllabus text. Please extract all assignments and their due dates: ${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // Extract the JSON from the AI response
    const content = response.data.choices[0].message.content;
    console.log('Raw AI Response:', content);
    
    // Clean up the response if it contains markdown
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonContent = content.split('```')[1].split('```')[0].trim();
    }
    
    console.log('Cleaned JSON content:', jsonContent);
    
    // Parse the JSON response
    const events = JSON.parse(jsonContent);
    console.log('Parsed events:', events);
    
    return events;
  } catch (error) {
    console.error('Error parsing syllabus with AI:', error);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
    throw error;
  }
}; 