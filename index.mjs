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

  // List of all category keys from your current questionBins
  const categoryList = Object.keys(questionBins);

  const systemPrompt = `
You are a political alignment assistant.

Given a user's answers, return a JSON object like:
{
  "summary": "A short summary of the user's political leaning.",
  "figures": ["List of 5 public political figures associated with similar ideological positions"],
  "coordinates": { "x": 0.0, "y": 0.0 },
  "categoryScores": {
    // For each category, a float from -1 (anti) to 1 (pro) for the user's stance on that category's general theme.
    // Example:
    //   "immigration_foreign_policy": 0.7,
    //   "environment": -0.2,
    //   ... (all 11 categories)
  }
}

The figures should represent well-known ideological proximity — not moral alignment.
It's okay to include controversial political figures (e.g., Donald Trump, Karl Marx, Adolf Hitler, Benito Mussolini), but DO NOT editorialize or imply direct comparisons.
Do not include disclaimers — just return clean JSON as requested.

The coordinates field must be present and should be an object with two numbers:
- x: from -1 (far left) to 1 (far right)
- y: from -1 (authoritarian) to 1 (libertarian)

The categoryScores object must include a key for each of these categories: ${categoryList.map(c => `"${c}"`).join(", ")}, with a float from -1 (anti) to 1 (pro) for each.
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
      parsed = { summary: result, figures: [], coordinates: { x: 0, y: 0 }, categoryScores: {} };
    }
    // Ensure coordinates field exists and is valid
    if (!parsed.coordinates || typeof parsed.coordinates.x !== 'number' || typeof parsed.coordinates.y !== 'number') {
      parsed.coordinates = { x: 0, y: 0 };
    }
    // Ensure categoryScores exists and has all categories
    if (!parsed.categoryScores || typeof parsed.categoryScores !== 'object') {
      parsed.categoryScores = {};
    }
    for (const cat of categoryList) {
      if (typeof parsed.categoryScores[cat] !== 'number') {
        parsed.categoryScores[cat] = 0;
      }
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
  const allQuestions = Array.from(new Set(bins.flat())); // Remove duplicates across bins
  const selected = [];

  // First, try to take 1 random question from each bin (if possible)
  for (const bin of bins) {
    if (bin.length > 0 && selected.length < count) {
      // Pick a random question from this bin that hasn't been selected yet
      const available = bin.filter(q => !selected.includes(q));
      if (available.length > 0) {
        const randIndex = Math.floor(Math.random() * available.length);
        selected.push(available[randIndex]);
      }
    }
  }

  // Fill the rest with random picks from all unique questions
  const remaining = allQuestions.filter(q => !selected.includes(q));
  while (selected.length < count && remaining.length > 0) {
    const randIndex = Math.floor(Math.random() * remaining.length);
    selected.push(remaining.splice(randIndex, 1)[0]);
  }

  return selected;
}

app.get('/api/questions', (req, res) => {
  const count = parseInt(req.query.count) || 10;
  const questions = getRandomQuestions(count);
  res.json({ questions });
});
