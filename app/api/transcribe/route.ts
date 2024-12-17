import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import fileType from 'file-type';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);

export async function POST(req: NextRequest) {
  try {
    const OPENAI_API_KEY = process.env.NEXT_PUBLIC_MESSAGE_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing.');
    }

    // Parse the incoming file
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save the uploaded file
    const tempWebmPath = path.join('/tmp', file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempWebmPath, fileBuffer);

    // Convert to WAV
    const outputWavPath = path.join('/tmp', 'output.wav');
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempWebmPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .output(outputWavPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Verify file type
    const fileTypeResult = await fileType.fromFile(outputWavPath);
    console.log('Converted file type:', fileTypeResult);

    // Prepare for Whisper API
    const openAIForm = new FormData();
    openAIForm.append('file', fs.createReadStream(outputWavPath), 'output.wav');
    openAIForm.append('model', 'whisper-1');

    const openAIResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        ...openAIForm.getHeaders(),
      },
      body: openAIForm as unknown as BodyInit,
    });

    // Cleanup
    fs.unlinkSync(tempWebmPath);
    fs.unlinkSync(outputWavPath);

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      throw new Error(`OpenAI Error: ${errorData}`);
    }

    const { text } = await openAIResponse.json();
    return NextResponse.json({ transcription: text }, { status: 200 });
  } catch (error) {
    console.error('Error processing transcription:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio. Check server logs.' },
      { status: 500 }
    );
  }
}
