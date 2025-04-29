import axios from 'axios';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export const parseSyllabusWithAI = async (text) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts assignment dates from syllabi. Return a JSON array of events with title, start date, and description.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const events = JSON.parse(content);
    return events;
  } catch (error) {
    console.error('Error parsing syllabus with AI:', error);
    throw error;
  }
}; 