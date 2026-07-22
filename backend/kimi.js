const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Summarizes a single browsing node and extracts key concept tags using Gemini
 */
async function analyzeBrowsingNode(title, url) {
  try {
    console.log(`[INFO] Requesting AI analysis for: "${title}"`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the core intelligence engine of RabbitHole. Provide a highly precise, 1-sentence technical description of the core concepts covered on the target webpage. CRITICAL DEFINITIONS: Never use third-person pronouns. Absolutely ban the phrase 'The user is', 'The user wants', 'They are learning', or 'This page covers'. Start directly with strong action verbs or direct technical descriptions. Output must be strictly in this JSON format: {\"summary\": \"...\", \"tags\": [\"tag1\", \"tag2\", \"tag3\"]}"
      },
      contents: `Webpage Title: ${title}\nURL: ${url}`,
    });

    let aiResult = JSON.parse(response.text);

    if (aiResult.summary) {
      aiResult.summary = aiResult.summary
        .replace(/^(the user is learning about|the user is exploring|the user is looking at|the user is)\s+/i, '')
        .replace(/^(this webpage covers|this page helps the user to understand)\s+/i, '');
      aiResult.summary = aiResult.summary.charAt(0).toUpperCase() + aiResult.summary.slice(1);
    }

    return aiResult;
  } catch (error) {
    console.error('[ERROR] AI Engine node analysis failed:', error.message);
    return { summary: 'Analysis unavailable.', tags: [] };
  }
}

/**
 * Compiles a macro overview for the entire session trail
 */
async function analyzeSessionTrail(sessionTitle, uniqueTitlesList) {
  try {
    const sessionSummaryResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this collection of webpages visited during a learning session tracking topic: "${sessionTitle}". \nWebpages explored in sequence: [${uniqueTitlesList}]. \nProvide a clear, 2-sentence synthesis summarizing the overarching objective or core technical concepts being researched in this specific learning path. Do not include raw markdown formatting, just direct plain text output.`
    });
    return sessionSummaryResponse.text.trim();
  } catch (error) {
    console.error('[ERROR] AI Engine session overview failed:', error.message);
    return 'Session overview synthesis unavailable.';
  }
}

module.exports = { analyzeBrowsingNode, analyzeSessionTrail };