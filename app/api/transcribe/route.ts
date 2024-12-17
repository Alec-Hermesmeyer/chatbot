// // route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import FormData from 'form-data';
// import fetch from 'node-fetch';
// import fs from 'fs';
// import path from 'path';



// export async function POST(req: NextRequest) {
//   try {
//     // Parse the incoming form data
//     const formData = await req.formData();
//     const file = formData.get('file') as File; // Ensure the key is 'file'

//     if (!file) {
//       return NextResponse.json({ error: 'No file provided' }, { status: 400 });
//     }

//     // Save the uploaded file to a temporary location
//     const tempFilePath = path.join('/tmp', file.name);
//     const fileBuffer = Buffer.from(await file.arrayBuffer());
//     fs.writeFileSync(tempFilePath, fileBuffer);

//     // Prepare form data to send to the Flask server
//     const form = new FormData();
//     form.append('file', fs.createReadStream(tempFilePath), file.name);

//     // Send the file to the Flask server's /transcribe endpoint
//     const flaskResponse = await fetch('http://127.0.0.1:5000/transcribe' || ' https://alec-hermesmeyer.github.io/whisperPBE/transcribe', {
//       method: 'POST',
//       body: form,
//       headers: form.getHeaders(), // Important for multipart/form-data
//     });

//     // Remove the temporary file after sending
//     fs.unlinkSync(tempFilePath);

//     if (!flaskResponse.ok) {
//       const errorText = await flaskResponse.text();
//       console.error('Error from Flask server:', errorText);
//       return NextResponse.json(
//         { error: 'Error transcribing audio. Please check the server logs.' },
//         { status: 500 }
//       );
//     }

//     const data = await flaskResponse.json();
//     // Return the transcription result to the client
//     return NextResponse.json({ transcription: (data as any).transcription }, { status: 200 });
//   } catch (error) {
//     console.error('Error processing transcription:', error);
//     return NextResponse.json(
//       { error: 'Internal Server Error. Please check the server logs.' },
//       { status: 500 }
//     );
//   }
// }
// route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import FormData from 'form-data';
// import fs from 'fs';
// import path from 'path';
// import fetch from 'node-fetch';

// export async function POST(req: NextRequest) {
//   try {
    // const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
//     if (!OPENAI_API_KEY) {
//       return NextResponse.json(
//         { error: 'OpenAI API key not configured on the server.' },
//         { status: 500 }
//       );
//     }

//     // Parse the incoming form data
//     const formData = await req.formData();
//     const file = formData.get('file') as File; // Ensure the key is 'file'

//     if (!file) {
//       return NextResponse.json({ error: 'No file provided' }, { status: 400 });
//     }

//     // Save the uploaded file to a temporary location
//     const tempFilePath = path.join('/tmp', file.name);
//     const fileBuffer = Buffer.from(await file.arrayBuffer());
//     fs.writeFileSync(tempFilePath, fileBuffer);

//     // Prepare form data to send to OpenAI Whisper API
//     const openAIForm = new FormData();
//     openAIForm.append('file', fs.createReadStream(tempFilePath), file.name);
//     openAIForm.append('model', 'whisper-1');

//     // Call the OpenAI Whisper transcription endpoint
//     const openAIResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${OPENAI_API_KEY}`,
//         ...openAIForm.getHeaders()
//       },
//       body: openAIForm as any
//     });

//     // Remove the temporary file
//     fs.unlinkSync(tempFilePath);

//     if (!openAIResponse.ok) {
//       const errorData = await openAIResponse.json();
//       console.error('OpenAI API Error:', errorData);
//       return NextResponse.json(
//         { error: 'Error transcribing audio with OpenAI Whisper.' },
//         { status: 500 }
//       );
//     }
//     const result = await openAIResponse.json() as { text: string };
//     const transcription = result.text;

//     // Return the transcription result to the client
//     return NextResponse.json({ transcription }, { status: 200 });
//   } catch (error) {
//     console.error('Error processing transcription:', error);
//     return NextResponse.json(
//       { error: 'Internal Server Error. Please check the server logs.' },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import fileType from 'file-type';

export async function POST(req: NextRequest) {
  try {
    const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found.');
    }
    console.log('OpenAI API Key:', OPENAI_API_KEY); // Log the API key for debugging
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not found.' }, { status: 500 });
    }

    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get('file') as File; // Ensure the key is 'file'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save the uploaded file to a temporary location
    const tempWebmPath = path.join('/tmp', file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempWebmPath, fileBuffer);

    console.log('Uploaded file type:', file.type);

// Convert the file to WAV for better compatibility
const outputWavPath = path.join('/tmp', 'output.wav');
execSync(`ffmpeg -i ${tempWebmPath} -ar 16000 -ac 1 -y ${outputWavPath}`, { stdio: 'inherit' });
console.log('Converted file:', outputWavPath); // Log the output file path

// Check if the converted file exists
if (!fs.existsSync(outputWavPath)) {
  console.error('Converted file does not exist:', outputWavPath);
  return NextResponse.json({ error: 'Converted file not found.' }, { status: 500 });
}

// Verify the output file type
const fileType = await fromFile(outputWavPath);
console.log('Output file type:', fileType); // Log the file type

// Prepare the form data for the OpenAI API
const openAIForm = new FormData();
openAIForm.append('file', fs.createReadStream(outputWavPath), 'output.wav');
console.log('Sending file to OpenAI:', outputWavPath); // Log the file being sent

const openAIResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_MESSAGE_API_KEY}`,        
    ...openAIForm.getHeaders(),
  },
  body: openAIForm as unknown as BodyInit,
});

    // Remove the WAV file
    fs.unlinkSync(outputWavPath);

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API Error:', errorData);
      return NextResponse.json(
        { error: 'Error transcribing audio with OpenAI Whisper.' },
        { status: 500 }
      );
    }

    const result = await openAIResponse.json() as { text: string };
    const transcription = result.text;

    // Return the transcription result to the client
    return NextResponse.json({ transcription }, { status: 200 });
  } catch (error) {
    console.error('Error processing transcription:', error);
    return NextResponse.json(
      { error: 'Internal Server Error. Please check the server logs.' },
      { status: 500 }
    );
  }
}

function fromFile(outputWavPath: string) {
  throw new Error('Function not implemented.');
}
