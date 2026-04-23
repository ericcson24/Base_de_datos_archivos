const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log('No API KEY found');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-monitor'
    ];

    console.log(`Testing models with key: ${apiKey.substring(0, 5)}...`);

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        console.log(`✅ Model ${modelName} is AVAILABLE. Response: ${result.response.text().substring(0, 20)}...`);
      } catch (error) {
        if (error.message.includes('404')) {
             console.log(`❌ Model ${modelName} NOT FOUND (404)`);
        } else {
             console.log(`[Warning] Model ${modelName} ERROR: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

listModels();
