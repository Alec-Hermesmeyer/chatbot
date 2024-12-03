import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API Key.');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Ensure file uploads work correctly
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File; // Ensure the key is 'audio'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save the file temporarily
    const tempFilePath = path.join('/tmp', file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, fileBuffer);

    // Pass the file to OpenAI Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath) as any,
      model: 'whisper-1',
      response_format: 'json',
    });

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Error transcribing audio. Please check the server logs.' },
      { status: 500 }
    );
  }
}
