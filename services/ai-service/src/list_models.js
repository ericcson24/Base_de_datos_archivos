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
    // Note: The SDK might not expose listModels directly on the main class in all versions
    // But usually we can use the model to just try generation or use the API manually via fetch if needed.
    // Actually, newer SDKs don't have listModels easily accessible via the main helper sometimes.
    // Let's try to infer availability by trying a simple generation on a few common models.
    
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-monitor' // unlikely
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
             console.log(`⚠️ Model ${modelName} ERROR: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

listModels();
