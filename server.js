const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEYS = {
  deepseek: process.env.DEEPSEEK_API_KEY,
  pinterest: process.env.PINTEREST_API_KEY,
  twitter: process.env.TWITTER_BEARER_TOKEN,
  threads: process.env.THREADS_ACCESS_TOKEN
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

let stats = {
  totalPosts: 0,
  pinterest: 0,
  twitter: 0,
  threads: 0,
  lastPost: null
};

// Generate platform-optimized content with DeepSeek
async function generateMultiPlatformContent(theme) {
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
            content: 'You are a multi-platform social media expert. Create optimized content for Pinterest, Twitter/X, and Threads. Each platform needs different styles. Return ONLY valid JSON.'
          },
          { 
            role: 'user', 
            content: `Create content for all 3 platforms about: ${theme.name}

Hook: ${theme.hook}
Keyword: ${theme.primary}
Book Link: https://amzn.to/4sklUiK

Return ONLY this JSON:
{
  "pinterest": {
    "title": "SEO-optimized Pinterest title (60-100 chars, numbers/hooks)",
    "description": "Detailed Pinterest description with hashtags and CTA (max 500 chars)",
    "hashtags": ["#honey", "#health", "#wellness", "#natural", "#freeebook"]
  },
  "twitter": {
    "text": "Engaging tweet with hook, value, and CTA. Use emojis. Max 280 chars. Include link.",
    "hashtags": ["#Honey", "#Health", "#Wellness"]
  },
  "threads": {
    "text": "Conversational Threads post. More personal, storytelling. 2-3 sentences. Include link and emojis.",
    "hashtags": ["#HoneyBenefits", "#NaturalHealth"]
  }
}`
          }
        ],
        temperature: 0.9,
        max_tokens: 800
      })
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    console.log('✅ Multi-platform content generated');
    return content;
  } catch (error) {
    console.error('DeepSeek error:', error.message);
    // Fallback content
    return {
      pinterest: {
        title: `${theme.hook} | Free Honey Book`,
        description: `Discover ${theme.primary}! Get your FREE Honey Book → https://amzn.to/4sklUiK #honey #health #wellness #natural #freeebook`,
        hashtags: ['#honey', '#health', '#wellness', '#natural', '#freeebook']
      },
      twitter: {
        text: `${theme.hook}\n\nGet the FREE Honey Book 📖\n👉 https://amzn.to/4sklUiK\n\n#Honey #Health #Wellness`,
        hashtags: ['#Honey', '#Health', '#Wellness']
      },
      threads: {
        text: `Just discovered something amazing about honey! ${theme.hook.replace(/[🍯⚡🔥🛡️]/g, '').trim()}\n\nCheck out my free book → https://amzn.to/4sklUiK 🍯`,
        hashtags: ['#HoneyBenefits', '#NaturalHealth']
      }
    };
  }
}

// Generate image (same for all platforms)
async function generateImage(theme) {
  console.log('🎨 Generating image for:', theme.name);
  
  // Using placeholder - replace with Google Imagen if needed
  const imageUrl = `https://via.placeholder.com/1200x630/FFB800/1a1a1a?text=${encodeURIComponent(theme.textOverlay)}`;
  
  return {
    url: imageUrl,
    alt: theme.textOverlay
  };
}

// Post to Pinterest
async function postToPinterest(content, image, theme) {
  if (!API_KEYS.pinterest) {
    console.log('⚠️ Pinterest API key not set');
    return { success: false, platform: 'pinterest' };
  }

  try {
    const pinData = {
      title: content.pinterest.title,
      description: content.pinterest.description,
      link: 'https://amzn.to/4sklUiK',
      media_source: {
        source_type: 'image_url',
        url: image.url
      },
      alt_text: image.alt
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
    
    if (response.ok) {
      console.log('📌 Posted to Pinterest:', data.id);
      stats.pinterest++;
      return { success: true, platform: 'pinterest', id: data.id };
    } else {
      throw new Error(data.message || 'Pinterest API error');
    }
  } catch (error) {
    console.error('❌ Pinterest error:', error.message);
    return { success: false, platform: 'pinterest', error: error.message };
  }
}

// Post to Twitter/X
async function postToTwitter(content, image) {
  if (!API_KEYS.twitter) {
    console.log('⚠️ Twitter API key not set');
    return { success: false, platform: 'twitter' };
  }

  try {
    // Step 1: Upload media
    const mediaResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.twitter}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        media_data: image.url // In production, convert image to base64
      })
    });

    // Step 2: Create tweet with media
    const tweetData = {
      text: content.twitter.text,
      // media: { media_ids: [mediaId] } // Add after media upload works
    };

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.twitter}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tweetData)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('🐦 Posted to Twitter:', data.data.id);
      stats.twitter++;
      return { success: true, platform: 'twitter', id: data.data.id };
    } else {
      throw new Error(data.detail || 'Twitter API error');
    }
  } catch (error) {
    console.error('❌ Twitter error:', error.message);
    return { success: false, platform: 'twitter', error: error.message };
  }
}

// Post to Threads
async function postToThreads(content, image) {
  if (!API_KEYS.threads) {
    console.log('⚠️ Threads API key not set');
    return { success: false, platform: 'threads' };
  }

  try {
    // Threads uses Instagram Graph API
    const response = await fetch(`https://graph.threads.net/v1.0/me/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: API_KEYS.threads,
        media_type: 'IMAGE',
        image_url: image.url,
        text: content.threads.text
      })
    });

    const data = await response.json();
    
    // Step 2: Publish the thread
    if (data.id) {
      const publishResponse = await fetch(`https://graph.threads.net/v1.0/me/threads_publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: API_KEYS.threads,
          creation_id: data.id
        })
      });

      const publishData = await publishResponse.json();
      
      if (publishResponse.ok) {
        console.log('🧵 Posted to Threads:', publishData.id);
        stats.threads++;
        return { success: true, platform: 'threads', id: publishData.id };
      }
    }
    
    throw new Error(data.error?.message || 'Threads API error');
  } catch (error) {
    console.error('❌ Threads error:', error.message);
    return { success: false, platform: 'threads', error: error.message };
  }
}

// Main automation function
async function runMultiPlatformPost() {
  console.log('\n🚀 ===== STARTING MULTI-PLATFORM POST =====');
  console.log('⏰ Time:', new Date().toLocaleString());
  
  try {
    // Select random theme
    const theme = themes[Math.floor(Math.random() * themes.length)];
    console.log(`📌 Theme: ${theme.name}`);
    
    // Generate platform-optimized content
    console.log('🤖 Generating multi-platform content...');
    const content = await generateMultiPlatformContent(theme);
    
    // Generate single image for all platforms
    const image = await generateImage(theme);
    
    // Post to all platforms simultaneously
    console.log('📤 Posting to all platforms...');
    const results = await Promise.all([
      postToPinterest(content, image, theme),
      postToTwitter(content, image),
      postToThreads(content, image)
    ]);
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n✅ ===== POST COMPLETE =====');
    console.log(`✅ Successful: ${successful}/3 platforms`);
    console.log(`❌ Failed: ${failed}/3 platforms`);
    
    results.forEach(result => {
      if (result.success) {
        console.log(`  ✓ ${result.platform}: Posted (ID: ${result.id})`);
      } else {
        console.log(`  ✗ ${result.platform}: Failed (${result.error || 'Not configured'})`);
      }
    });
    
    stats.totalPosts++;
    stats.lastPost = new Date().toISOString();
    
    console.log(`\n📊 Total posts: ${stats.totalPosts}`);
    console.log(`   Pinterest: ${stats.pinterest} | Twitter: ${stats.twitter} | Threads: ${stats.threads}`);
    console.log('================================\n');
    
    return {
      success: true,
      theme: theme.name,
      results: results,
      stats: stats
    };
    
  } catch (error) {
    console.error('❌ Critical error:', error);
    return { success: false, error: error.message };
  }
}

// API Endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'Multi-Platform Content Automation LIVE!',
    platforms: ['Pinterest', 'Twitter/X', 'Threads'],
    stats: stats,
    schedule: 'Every 3 hours'
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    stats: stats,
    platforms: {
      pinterest: { 
        enabled: !!API_KEYS.pinterest, 
        posts: stats.pinterest 
      },
      twitter: { 
        enabled: !!API_KEYS.twitter, 
        posts: stats.twitter 
      },
      threads: { 
        enabled: !!API_KEYS.threads, 
        posts: stats.threads 
      }
    }
  });
});

app.post('/api/run', async (req, res) => {
  console.log('🔵 Manual trigger received');
  const result = await runMultiPlatformPost();
  res.json(result);
});

app.get('/api/preview', async (req, res) => {
  try {
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const content = await generateMultiPlatformContent(theme);
    const image = await generateImage(theme);
    
    res.json({
      theme: theme.name,
      content: content,
      image: image,
      platforms: ['Pinterest', 'Twitter', 'Threads']
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule automation every 3 hours
cron.schedule('0 */3 * * *', () => {
  console.log('⏰ ===== SCHEDULED RUN TRIGGERED =====');
  runMultiPlatformPost();
});

// Run immediately on startup
console.log('🚀 Multi-Platform Automation Starting...');
runMultiPlatformPost();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ ===== SERVER RUNNING =====`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`📅 Automation: Every 3 hours`);
  console.log(`🎯 Platforms: Pinterest, Twitter/X, Threads`);
  console.log(`🎨 Themes loaded: ${themes.length}`);
  console.log(`================================\n`);
});
