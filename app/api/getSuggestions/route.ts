import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { conversation } = await req.json();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation data is required" }, { status: 400 });
  }

  const prompt = `
    Based on the following conversation, suggest four next possible actions a user might want to take. Provide the suggestions in JSON format with "title", "label", and "action" fields.

    Conversation:
    ${JSON.stringify(conversation)}

    Suggestions:
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
    });

    const suggestions = JSON.parse(completion.choices[0].message.content || "[]");

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 });
  }
}
