const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEYS = {
  deepseek: process.env.DEEPSEEK_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  pinterest: process.env.PINTEREST_API_KEY
};

const themes = [
  {
    name: "Gut Health Solution",
    primary: "honey gut health remedies",
    secondary: ["how to fix gut health", "honey digestive health"],
    hook: "🍯 The 3-Day Honey Protocol That Fixed My Gut",
    textOverlay: "FIX YOUR GUT IN 3 DAYS"
  },
  {
    name: "Energy Boost Formula",
    primary: "honey energy benefits",
    secondary: ["low energy solutions", "raw honey energy boost"],
    hook: "⚡ Why Athletes Swear By This Honey Hack",
    textOverlay: "INSTANT ENERGY BOOST"
  },
  {
    name: "Weight Loss Science",
    primary: "best honey for weight loss",
    secondary: ["honey metabolism boost", "fat burning"],
    hook: "🔥 The Honey Trick That Speeds Up Fat Loss",
    textOverlay: "BURN FAT NATURALLY"
  }
];

async function generateContent(theme) {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.deepseek}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a Pinterest viral content expert.' },
          { role: 'user', content: `Create a Pinterest pin for: ${theme.name}. Return ONLY JSON: {"title": "...", "description": "...", "hashtags": ["..."]}` }
        ],
        temperature: 0.85,
        max_tokens: 500
      })
    });
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    return {
      title: `${theme.hook} | Free Honey Book`,
      description: `Discover ${theme.primary}! FREE Honey Book → https://amzn.to/4sklUiK`,
      hashtags: ['#honey', '#health', '#wellness']
    };
  }
}

async function postToPinterest(content, theme) {
  try {
    const pinData = {
      title: content.title,
      description: `${content.description}\n\n📖 FREE Honey Book: https://amzn.to/4sklUiK\n\n${content.hashtags.join(' ')}`,
      link: 'https://amzn.to/4sklUiK',
      media_source: {
        source_type: 'image_url',
        url: `https://via.placeholder.com/1000x1333/FFB800/000000?text=${encodeURIComponent(theme.textOverlay)}`
      }
    };

    const response = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.pinterest}`
      },
      body: JSON.stringify(pinData)
    });

    const data = await response.json();
    console.log('✅ Posted to Pinterest:', data.id);
    return { success: true };
  } catch (error) {
    console.error('Pinterest error:', error.message);
    return { success: false };
  }
}

async function runAutomation() {
  console.log('\n🚀 STARTING AUTOMATION');
  const theme = themes[Math.floor(Math.random() * themes.length)];
  console.log(`📌 Theme: ${theme.name}`);
  
  const content = await generateContent(theme);
  await postToPinterest(content, theme);
  
  console.log('✅ CYCLE COMPLETE\n');
}

app.get('/', (req, res) => {
  res.json({ status: 'running', message: 'Pinterest Automation LIVE!' });
});

app.post('/api/run', async (req, res) => {
  await runAutomation();
  res.json({ success: true });
});

cron.schedule('0 */3 * * *', runAutomation);

runAutomation();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
