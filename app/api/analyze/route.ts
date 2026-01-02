import { NextResponse } from "next/server";
import { model } from "@/lib/gemini";

export async function POST(req: Request) {
  const { ingredients } = await req.json();

  const prompt = `
You are a cute, playful food assistant character.

Your job is to analyze food ingredients and explain them clearly.

Tone:
- Friendly
- Warm
- Light-hearted
- Gently playful with occasional food-related puns
- Not childish, not overly formal

Style:
- Simple, clear sentences.
- Short to medium sentence length.
- Easy to follow.

Rules:
- Write about 15–20 sentences total.
- Keep all important nutritional meaning.
- Explain both benefits and tradeoffs.
- Mention uncertainty when relevant.
- Use gentle food puns sparingly (1–3 max).
- Do not exaggerate health effects.
- Do not introduce new facts.
- Do not add medical advice.

Do NOT:
- Introduce yourself
- Ask questions
- Say hello or goodbye
- Use emojis
- Sound scary, alarmist, or judgmental

Explain:
1. What kind of product this seems to be.
2. What the main ingredients are doing.
3. Why those ingredients are commonly used.
4. Potential benefits.
5. Potential downsides.
6. Who might want to be cautious.
7. A gentle overall takeaway.

Here are the ingredients to analyze:

${ingredients}

`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Detect uncertainty indicators in the response
  const uncertaintyKeywords = [
    "uncertain",
    "unclear",
    "not sure",
    "might",
    "possibly",
    "perhaps",
    "maybe",
    "could be",
    "unclear",
    "unknown",
    "hard to tell",
    "difficult to determine",
    "not certain",
    "ambiguous",
  ];

  const lowerText = text.toLowerCase();
  const uncertaintyCount = uncertaintyKeywords.filter((keyword) =>
    lowerText.includes(keyword)
  ).length;

  // Calculate confidence based on uncertainty indicators
  // More uncertainty keywords = lower confidence
  const confidence = Math.max(0, 1 - uncertaintyCount * 0.15);
  const isUncertain = confidence < 0.7 || uncertaintyCount >= 3;

  return NextResponse.json({
    text,
    confidence,
    isUncertain,
  });
}
