// route.ts

import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';



export async function POST(req: NextRequest) {
  try {
    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get('file') as File; // Ensure the key is 'file'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save the uploaded file to a temporary location
    const tempFilePath = path.join('/tmp', file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, fileBuffer);

    // Prepare form data to send to the Flask server
    const form = new FormData();
    form.append('file', fs.createReadStream(tempFilePath), file.name);

    // Send the file to the Flask server's /transcribe endpoint
    const flaskResponse = await fetch('http://127.0.0.1:5000/transcribe', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(), // Important for multipart/form-data
    });

    // Remove the temporary file after sending
    fs.unlinkSync(tempFilePath);

    if (!flaskResponse.ok) {
      const errorText = await flaskResponse.text();
      console.error('Error from Flask server:', errorText);
      return NextResponse.json(
        { error: 'Error transcribing audio. Please check the server logs.' },
        { status: 500 }
      );
    }

    const data = await flaskResponse.json();
    // Return the transcription result to the client
    return NextResponse.json({ transcription: (data as any).transcription }, { status: 200 });
  } catch (error) {
    console.error('Error processing transcription:', error);
    return NextResponse.json(
      { error: 'Internal Server Error. Please check the server logs.' },
      { status: 500 }
    );
  }
}
