import { config } from 'dotenv';
config();

import '@/ai/flows/generate-transcript.ts';
import '@/ai/flows/translate-text.ts';
import '@/ai/flows/transliterate-text.ts';
import '@/ai/flows/summarize-text.ts';