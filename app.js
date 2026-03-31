// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.error('SW registration failed', err));
}

const micBtn = document.getElementById('mic');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');

let exchangeRate = null; // VND per 1 USD

// Fetch exchange rate (USD base) and compute VND per USD
async function fetchRate() {
  try {
    const resp = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await resp.json();
    if (data.result === 'success' && data.rates && data.rates.VND) {
      exchangeRate = data.rates.VND; // VND per USD
      console.log('Rate fetched', exchangeRate);
    } else {
      throw new Error('Invalid response');
    }
  } catch (e) {
    console.error('Rate fetch error', e);
    statusEl.textContent = 'Unable to retrieve exchange rate.';
  }
}

// Simple number extraction from spoken text
function extractNumber(text) {
  // Handle spoken number words
  const wordToNum = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
    'million': 1000000, 'billion': 1000000000
  };
  
  let num = 0;
  let current = 0;
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  
  for (const word of words) {
    if (wordToNum.hasOwnProperty(word)) {
      const val = wordToNum[word];
      if (val >= 1000) {
        current = current * val || val;
        num += current;
        current = 0;
      } else if (val >= 100) {
        current = current || 1;
        current *= val;
      } else {
        current += val;
      }
    }
  }
  num += current;
  
  if (num > 0) return num;
  
  // Fallback: try extracting digits
  const cleaned = text.replace(/[,\.]/g, '').replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

function speakResult(message) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(message);
    speechSynthesis.speak(utter);
  }
}

async function handleSpeech() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    statusEl.textContent = 'Speech recognition not supported.';
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SpeechRecognition();
  recognizer.lang = 'en-US';
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  statusEl.textContent = 'Listening...';
  recognizer.start();

  recognizer.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('Heard:', transcript);
    const amountVND = extractNumber(transcript);
    if (amountVND === null) {
      statusEl.textContent = 'Could not parse amount. Try again.';
      return;
    }
    if (exchangeRate === null) {
      await fetchRate();
    }
    if (exchangeRate === null) {
      statusEl.textContent = 'Rate unavailable.';
      return;
    }
    const usd = amountVND / exchangeRate;
    const usdRounded = usd.toFixed(2);
    const message = `That's $${usdRounded} USD`;
    resultEl.textContent = message;
    statusEl.textContent = '';
    speakResult(message);
  };

  recognizer.onerror = (event) => {
    console.error('Speech error', event.error);
    statusEl.textContent = 'Error: ' + event.error;
  };

  recognizer.onend = () => {
    console.log('Speech ended');
  };
}

micBtn.addEventListener('click', handleSpeech);

document.getElementById('reset').addEventListener('click', () => {
  resultEl.textContent = '';
  statusEl.textContent = 'Tap the mic and speak an amount in VND.';
});

// Pre-fetch rate on load for faster conversion
fetchRate();
