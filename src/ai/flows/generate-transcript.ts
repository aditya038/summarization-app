// Implemented a Genkit flow to generate a transcript from an audio or video file.

'use server';

/**
 * @fileOverview Generates a transcript from an audio or video file using AI.
 *
 * - generateTranscript - A function that handles the transcript generation process.
 * - GenerateTranscriptInput - The input type for the generateTranscript function.
 * - GenerateTranscriptOutput - The return type for the generateTranscript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTranscriptInputSchema = z.object({
  audioVideoDataUri: z
    .string()
    .describe(
      "An audio or video file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateTranscriptInput = z.infer<typeof GenerateTranscriptInputSchema>;

const GenerateTranscriptOutputSchema = z.object({
  transcript: z.string().describe('The generated transcript of the audio or video file.'),
});
export type GenerateTranscriptOutput = z.infer<typeof GenerateTranscriptOutputSchema>;

export async function generateTranscript(input: GenerateTranscriptInput): Promise<GenerateTranscriptOutput> {
  return generateTranscriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTranscriptPrompt',
  input: {schema: GenerateTranscriptInputSchema},
  output: {schema: GenerateTranscriptOutputSchema},
  prompt: `You are an expert transcriptionist.

You will generate a transcript from the provided audio or video file.

Audio/Video: {{media url=audioVideoDataUri}}

Transcript:`,
});

const generateTranscriptFlow = ai.defineFlow(
  {
    name: 'generateTranscriptFlow',
    inputSchema: GenerateTranscriptInputSchema,
    outputSchema: GenerateTranscriptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
