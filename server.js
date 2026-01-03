const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEYS = {
  deepseek: process.env.DEEPSEEK_API_KEY,
  pinterest: process.env.PINTEREST_API_KEY
};

const themes = [
  {
    name: "Gut Health Solution",
    primary: "honey gut health remedies",
    hook: "🍯 The 3-Day Honey Protocol That Fixed My Gut",
    textOverlay: "FIX YOUR GUT IN 3 DAYS"
  },
  {
    name: "Energy Boost Formula",
    primary: "honey energy benefits",
    hook: "⚡ Why Athletes Swear By This Honey Hack",
    textOverlay: "INSTANT ENERGY BOOST"
  },
  {
    name: "Weight Loss Science",
    primary: "best honey for weight loss",
    hook: "🔥 The Honey Trick That Speeds Up Fat Loss",
    textOverlay: "BURN FAT NATURALLY"
  },
  {
    name: "Immune System Armor",
    primary: "honey immune system",
    hook: "🛡️ Build Unstoppable Immunity in 7 Days",
    textOverlay: "BULLETPROOF IMMUNITY"
  }
];

let postQueue = [];
let stats = {
  totalGenerated: 0,
  lastGenerated: null
};

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
          { 
            role: 'system', 
            content: 'You are a Pinterest viral content expert. Create engaging pins with SEO optimization. Return ONLY valid JSON.'
          },
          { 
            role: 'user', 
            content: `Create a Pinterest pin for: ${theme.name}

Hook: ${theme.hook}
Primary Keyword: ${theme.primary}

Return ONLY this JSON structure:
{
  "title": "compelling title under 100 chars with numbers or hooks",
  "description": "engaging description with clear CTA to download free Honey Book",
  "hashtags": ["#honey", "#health", "#wellness", "#natural", "#benefits"]
}`
          }
        ],
        temperature: 0.85,
        max_tokens: 500
      })
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    console.log('✅ Content generated:', content.title);
    return content;
  } catch (error) {
    console.error('DeepSeek error:', error.message);
    return {
      title: `${theme.hook} | Free Honey Book`,
      description: `Discover the power of ${theme.primary}! Download your FREE comprehensive Honey Book packed with science-backed benefits. Get instant access → https://amzn.to/4sklUiK Learn everything about honey's amazing properties!`,
      hashtags: ['#honey', '#health', '#wellness', '#natural', '#freeebook', '#honeybenefits', '#healthylifestyle', '#naturalremedies']
    };
  }
}

async function generatePinReady(theme, content) {
  const pinData = {
    theme: theme.name,
    title: content.title,
    description: `${content.description}\n\n📖 Get Your FREE Honey Book on Amazon: https://amzn.to/4sklUiK\n\n${content.hashtags.join(' ')}\n\n#honeylove #beekeeping #naturalwellness`,
    link: 'https://amzn.to/4sklUiK',
    imageUrl: `https://via.placeholder.com/1000x1333/FFB800/1a1a1a?text=${encodeURIComponent(theme.textOverlay)}`,
    textOverlay: theme.textOverlay,
    keywords: theme.primary,
    generatedAt: new Date().toISOString()
  };
  
  return pinData;
}

async function runAutomation() {
  console.log('\n🚀 ===== STARTING CONTENT GENERATION =====');
  console.log('⏰ Time:', new Date().toLocaleString());
  
  try {
    const theme = themes[Math.floor(Math.random() * themes.length)];
    console.log(`📌 Selected theme: ${theme.name}`);
    console.log(`🎯 Primary keyword: ${theme.primary}`);
    
    const content = await generateContent(theme);
    const pinReady = await generatePinReady(theme, content);
    
    postQueue.push(pinReady);
    stats.totalGenerated++;
    stats.lastGenerated = new Date().toISOString();
    
    console.log('✅ CONTENT READY FOR POSTING!');
    console.log('📊 Total generated:', stats.totalGenerated);
    console.log('📝 Title:', pinReady.title);
    console.log('🔗 Link:', pinReady.link);
    console.log('================================\n');
    
    return { success: true, theme: theme.name };
  } catch (error) {
    console.error('❌ Generation error:', error);
    return { success: false, error: error.message };
  }
}

// API Endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'Pinterest Content Generator LIVE!',
    stats: stats,
    queuedPins: postQueue.length,
    themes: themes.length,
    schedule: 'Every 3 hours'
  });
});

app.get('/api/queue', (req, res) => {
  res.json({
    total: postQueue.length,
    pins: postQueue
  });
});

app.get('/api/next', (req, res) => {
  if (postQueue.length === 0) {
    return res.json({ message: 'Queue is empty' });
  }
  res.json(postQueue[0]);
});

app.post('/api/run', async (req, res) => {
  console.log('🔵 Manual trigger received');
  const result = await runAutomation();
  res.json(result);
});

app.get('/api/stats', (req, res) => {
  res.json({ 
    status: 'active',
    stats: stats,
    queueSize: postQueue.length,
    themes: themes.length,
    uptime: process.uptime()
  });
});

// Schedule automation every 3 hours
cron.schedule('0 */3 * * *', () => {
  console.log('⏰ ===== SCHEDULED RUN TRIGGERED =====');
  runAutomation();
});

// Run immediately on startup
console.log('🚀 Server starting...');
runAutomation();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ ===== SERVER RUNNING =====`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`📅 Content Generation: Every 3 hours`);
  console.log(`🎯 Themes loaded: ${themes.length}`);
  console.log(`📊 Ready to generate viral Pinterest content!`);
  console.log(`================================\n`);
});
