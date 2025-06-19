import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/analyze', async (req, res) => {
  const { userAnswers } = req.body;

  const compiledInput = userAnswers.map((qna, i) =>
    `Q${i + 1}: ${qna.question}\nA${i + 1}: ${qna.answer}`
  ).join('\n\n');

  const systemPrompt = `
You are a political alignment assistant.

Given a user's answers, return a JSON object like:
{
  "summary": "A short summary of the user's political leaning.",
  "figures": ["List of 5 public political figures associated with similar ideological positions"]
}

The figures should represent well-known ideological proximity — not moral alignment.
It's okay to include controversial political figures (e.g., Donald Trump, Karl Marx, Adolf Hitler, Benito Mussolini), but DO NOT editorialize or imply direct comparisons.
Do not include disclaimers — just return clean JSON as requested.
`.trim();



  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: compiledInput }
      ]
    });

    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong with OpenAI." });
  }
});


app.get('/ping', async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a friendly assistant.' },
        { role: 'user', content: 'Say hello and confirm you are online.' }
      ]
    });

    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GPT ping failed.' });
  }
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});