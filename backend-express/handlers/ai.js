const { GoogleGenerativeAI } = require('@google/generative-ai');

async function consultAI(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = 
      "You are a highly motivating, energetic, and slightly demanding productivity coach. " +
      "Your goal is to encourage the user to stay on track, complete their tasks, and achieve their financial goals. " +
      "Be concise, direct, and focused on action. You can provide tough love if needed.";

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction,
    });

    const result = await model.generateContent(message);
    const response = await result.response;
    const replyText = response.text();

    if (!replyText) {
      return res.status(200).json({
        reply: "I couldn't generate a response. Keep pushing forward anyway!"
      });
    }

    return res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error('Error in consultAI:', err);
    return res.status(500).json({ error: 'Failed to generate AI response: ' + err.message });
  }
}

module.exports = {
  consultAI,
};
