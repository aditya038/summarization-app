'use server';

/**
 * @fileOverview This file defines a Genkit flow for transliterating text from one script to another using AI.
 *
 * - transliterateText - A function that handles the text transliteration process.
 * - TransliterateTextInput - The input type for the transliterateText function.
 * - TransliterateTextOutput - The return type for the transliterateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransliterateTextInputSchema = z.object({
  text: z.string().describe('The text to transliterate.'),
  targetScript: z.string().describe('The target script for transliteration (e.g., Devanagari, Latin).'),
});
export type TransliterateTextInput = z.infer<typeof TransliterateTextInputSchema>;

const TransliterateTextOutputSchema = z.object({
  transliteratedText: z.string().describe('The transliterated text in the target script.'),
});
export type TransliterateTextOutput = z.infer<typeof TransliterateTextOutputSchema>;

export async function transliterateText(input: TransliterateTextInput): Promise<TransliterateTextOutput> {
  return transliterateTextFlow(input);
}

const transliterateTextPrompt = ai.definePrompt({
  name: 'transliterateTextPrompt',
  input: {schema: TransliterateTextInputSchema},
  output: {schema: TransliterateTextOutputSchema},
  prompt: `You are an expert in transliterating text from one script to another.

  The user will provide text and the target script. You will transliterate the text into the target script.

  Text: {{{text}}}
  Target Script: {{{targetScript}}}

  Transliterated Text:`,
});

const transliterateTextFlow = ai.defineFlow(
  {
    name: 'transliterateTextFlow',
    inputSchema: TransliterateTextInputSchema,
    outputSchema: TransliterateTextOutputSchema,
  },
  async input => {
    const {output} = await transliterateTextPrompt(input);
    return output!;
  }
);
