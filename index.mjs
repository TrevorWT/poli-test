import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { questionBins } from './questions.mjs';

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
  "figures": ["List of 5 public political figures associated with similar ideological positions"],
  "coordinates": { "x": 0.0, "y": 0.0 }
}

The figures should represent well-known ideological proximity — not moral alignment.
It's okay to include controversial political figures (e.g., Donald Trump, Karl Marx, Adolf Hitler, Benito Mussolini), but DO NOT editorialize or imply direct comparisons.
Do not include disclaimers — just return clean JSON as requested.

The coordinates field must be present and should be an object with two numbers:
- x: from -1 (far left) to 1 (far right)
- y: from -1 (authoritarian) to 1 (libertarian)
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: compiledInput }
      ]
    });

    let result = response.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (e) {
      parsed = { summary: result, figures: [], coordinates: { x: 0, y: 0 } };
    }
    // Ensure coordinates field exists and is valid
    if (!parsed.coordinates || typeof parsed.coordinates.x !== 'number' || typeof parsed.coordinates.y !== 'number') {
      parsed.coordinates = { x: 0, y: 0 };
    }
    res.json({ result: JSON.stringify(parsed) });
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function getRandomQuestions(count) {
  const bins = Object.values(questionBins);
  const selected = [];

  // First, take 1 from each bin (if possible)
  for (const bin of bins) {
    if (bin.length > 0 && selected.length < count) {
      const randIndex = Math.floor(Math.random() * bin.length);
      selected.push(bin[randIndex]);
    }
  }

  // Fill the rest with random picks from all bins
  const flat = bins.flat();
  while (selected.length < count && flat.length > 0) {
    const randIndex = Math.floor(Math.random() * flat.length);
    const q = flat.splice(randIndex, 1)[0];
    if (!selected.includes(q)) selected.push(q);
  }

  return selected;
}

app.get('/api/questions', (req, res) => {
  const count = parseInt(req.query.count) || 10;
  const questions = getRandomQuestions(count);
  res.json({ questions });
});
