import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from "ffmpeg-static";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.error("ffmpeg-static path is null");
}

export const dynamic = "force-dynamic"; // Prevent static generation during build

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      console.error("OpenAI API Key missing");
      return NextResponse.json(
        { error: "OpenAI API key not found" },
        { status: 500 }
      );
    }

    console.log("Processing transcription request...");

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const tempWebmPath = path.join('/tmp', file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempWebmPath, fileBuffer);

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

    const openAIForm = new FormData();
    openAIForm.append('file', fs.createReadStream(outputWavPath), 'output.wav');
    openAIForm.append('model', 'whisper-1');

    const openAIResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        ...openAIForm.getHeaders(),
      },
      body: openAIForm as unknown as BodyInit,
    });

    fs.unlinkSync(tempWebmPath);
    fs.unlinkSync(outputWavPath);

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error("OpenAI Error:", errorData);
      return NextResponse.json(
        { error: "OpenAI transcription failed" },
        { status: 500 }
      );
    }

    const { text } = await openAIResponse.json();
    return NextResponse.json({ transcription: text }, { status: 200 });
  } catch (error) {
    console.error("Error during transcription:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
