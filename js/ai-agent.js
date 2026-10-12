/**
 * USMAN PHARMACY - AI Clinical & ERP Assistant Engine
 * Integrated with Google Gemini API
 * Features:
 * 1. Web Speech API Microphone Recognition (Urdu & English voice input)
 * 2. Verbal Audio Output (SpeechSynthesis) with voice & toggle controls
 * 3. Written Markdown / Data Presentation
 * 4. Real-time Live ERP Context (Stock, Expiry alerts, Sales, Profit, DRAP rules)
 * 5. Robust offline semantic fallback brain.
 */

class UsmanAIAgent {
  constructor() {
    this.apiKey = window.db.data.settings.aiApiKey || '';
    this.modelName = 'gemini-1.5-flash';
    this.speechSynthesis = window.speechSynthesis;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.autoSpeak = true; // Verbal answer toggle
    this.lang = 'en-US'; // 'en-US' or 'ur-PK'
    this.chatHistory = [];

    this.initSpeechRecognition();
  }

  // Initialize Microphone (SpeechRecognition)
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not natively supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateMicUI(true);
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        const inputField = document.getElementById('ai-user-input');
        if (inputField) {
          inputField.value = transcript;
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        this.updateMicUI(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicUI(false);
        const inputField = document.getElementById('ai-user-input');
        if (inputField && inputField.value.trim().length > 1) {
          // Auto submit after speaking
          setTimeout(() => {
            if (this.autoSubmitOnSpeech) {
              if (window.app && window.app.submitAiPrompt) {
                window.app.submitAiPrompt();
              } else if (typeof window.submitAiPrompt === 'function') {
                window.submitAiPrompt();
              }
            }
          }, 400);
        }
      };
    } catch (e) {
      console.error('Failed to setup speech recognition', e);
    }
  }

  toggleMicrophone() {
    if (!this.recognition) {
      this.initSpeechRecognition();
      if (!this.recognition) {
        alert('Voice input is not supported in this browser. Please use Chrome or Edge or type your query.');
        return;
      }
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.updateMicUI(false);
    } else {
      try {
        this.recognition.lang = this.lang;
        this.recognition.start();
        this.isListening = true;
        this.updateMicUI(true);
      } catch (err) {
        console.error('Microphone start error:', err);
      }
    }
  }

  updateMicUI(active) {
    const micBtn = document.getElementById('ai-mic-btn');
    const pulseIndicator = document.getElementById('ai-mic-pulse');
    if (micBtn) {
      if (active) {
        micBtn.classList.add('mic-active');
        micBtn.title = 'Listening... Click to stop';
      } else {
        micBtn.classList.remove('mic-active');
        micBtn.title = 'Click to speak via Microphone';
      }
    }
    if (pulseIndicator) {
      pulseIndicator.style.display = active ? 'flex' : 'none';
    }
  }

  // Verbal Speech Output (SpeechSynthesis)
  speakVerbal(text) {
    if (!this.speechSynthesis) return;

    // Cancel ongoing speech
    this.speechSynthesis.cancel();

    // Clean markdown symbols from spoken text for natural pronunciation
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`{1,3}.*?`{1,3}/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[-*]\s+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = window.db.data.settings.aiSpeechRate || 1.0;
    utterance.lang = this.lang === 'ur-PK' ? 'ur-PK' : 'en-US';

    // Select suitable voice
    const voices = this.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferred = voices.find(v => v.lang.startsWith(this.lang.substring(0, 2)));
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateSpeakerUI(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateSpeakerUI(false);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.updateSpeakerUI(false);
    };

    this.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.updateSpeakerUI(false);
    }
  }

  updateSpeakerUI(speaking) {
    const speakIndicator = document.getElementById('ai-speaking-badge');
    if (speakIndicator) {
      speakIndicator.style.display = speaking ? 'inline-flex' : 'none';
    }
  }

  // Build Real-Time Context from Live Store Data
  buildLiveContext() {
    const fin = window.accountingEngine.getFinancialSummary();
    const expirySum = window.expiryEngine.getSummary();
    const lowStock = window.inventoryEngine.getProductsWithStock().filter(p => p.isLowStock);
    const recentSales = window.db.data.sales.slice(0, 3);
    const criticalBatches = window.expiryEngine.getAllAlerts().filter(a => a.classification.severity === 'Critical');

    return `
You are the Usman Pharmacy AI Clinical & ERP Assistant for USMAN PHARMACY in Rawalpindi/Islamabad, Pakistan.
Current Live System Statistics:
- Store Name: USMAN PHARMACY (Licensed by DRAP)
- Currency: Pakistani Rupees (PKR)
- Today's Net Sales: PKR ${fin.netSalesRevenue.toLocaleString()}
- Today's Gross Profit: PKR ${fin.grossProfit.toLocaleString()} (Margin: ${fin.grossProfitMarginPct.toFixed(1)}%)
- Total Stock Valuation at Cost: PKR ${fin.inventoryValueAtCost.toLocaleString()}
- Critical Expiry Batches (<7 days or Expired): ${criticalBatches.length} batches
- Expired Stock Value: PKR ${fin.expiredInventoryCost.toLocaleString()}
- Cash in Hand: PKR ${fin.estimatedCashInHand.toLocaleString()}
- Low Stock Items Needing Reorder: ${lowStock.length} items (${lowStock.map(p => p.name).join(', ')})
- Expired/Critical medicines: ${criticalBatches.map(b => `${b.productName} (Batch ${b.batchNumber}, ${b.daysRemaining}d)`).join('; ') || 'None'}

Clinical & Safety Guardrails:
1. Always emphasize patient safety and DRAP regulations.
2. If medicine is expired, strictly remind that dispensing is legally prohibited.
3. Provide concise, direct answers with clear bullet points.
4. If asked in Urdu or about Pakistani brands (Panadol, Augmentin, Risek, Brufen), provide accurate Pakistani market knowledge.
`;
  }

  // Process User Query
  async ask(userPrompt) {
    if (!userPrompt || !userPrompt.trim()) return;

    const trimmed = userPrompt.trim();
    this.chatHistory.push({ role: 'user', content: trimmed, timestamp: new Date() });

    let reply = '';

    // First attempt: Call Google Gemini API
    try {
      reply = await this.queryGeminiAPI(trimmed);
    } catch (apiError) {
      console.warn('Gemini API call failed or network issue, using smart ERP knowledge engine fallback:', apiError);
      reply = this.localFallbackBrain(trimmed);
    }

    this.chatHistory.push({ role: 'assistant', content: reply, timestamp: new Date() });

    // Verbal output if enabled
    if (this.autoSpeak) {
      this.speakVerbal(reply);
    }

    return reply;
  }

  // Call Google Gemini REST API
  async queryGeminiAPI(prompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const systemContext = this.buildLiveContext();

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemContext}\n\nUser Question: ${prompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Empty response from Gemini API');
    }

    return candidateText;
  }

  // Local Offline Smart ERP Brain Fallback
  localFallbackBrain(prompt) {
    const q = prompt.toLowerCase();
    const fin = window.accountingEngine.getFinancialSummary();
    const alerts = window.expiryEngine.getAllAlerts();
    const prods = window.inventoryEngine.getProductsWithStock();

    // 1. Expiry Queries
    if (q.includes('expir') || q.includes('alert') || q.includes('tareekh') || q.includes('میعاد')) {
      const critical = alerts.filter(a => a.classification.severity === 'Critical');
      if (critical.length > 0) {
        let msg = `⚠️ **Critical Expiry Alert (${critical.length} batches require immediate action):**\n\n`;
        critical.forEach(c => {
          msg += `• **${c.productName}** | Batch: \`${c.batchNumber}\` | Expiry: **${c.expiryDate}** (${c.daysRemaining < 0 ? `${Math.abs(c.daysRemaining)} days overdue!` : `${c.daysRemaining} days remaining`}) | Qty: ${c.quantity} ${c.unitType} | Value: PKR ${c.totalCostValue.toLocaleString()}\n`;
        });
        msg += `\n*Action Required:* Move to Quarantine isolation or initiate Supplier Return debit note. POS sale has been automatically locked for safety.`;
        return msg;
      } else {
        return `✅ **Expiry Status Safe:** There are no critical batches expiring within the next 7 days. Total batches monitored under 180-day advance schedule: ${alerts.length}.`;
      }
    }

    // 2. Sales / Profit / Financials
    if (q.includes('sale') || q.includes('profit') || q.includes('munafa') || q.includes('earning') || q.includes('revenue') || q.includes('کما') || q.includes('فروخت')) {
      return `📊 **Today's Financial Summary (USMAN PHARMACY):**\n\n` +
        `• **Net Sales Revenue:** PKR ${fin.netSalesRevenue.toLocaleString()}\n` +
        `• **Cost of Goods Sold (COGS):** PKR ${fin.totalCogs.toLocaleString()}\n` +
        `• **Gross Profit:** PKR ${fin.grossProfit.toLocaleString()} (Margin: **${fin.grossProfitMarginPct.toFixed(1)}%**)\n` +
        `• **Total Operating Expenses:** PKR ${fin.totalOperatingExpenses.toLocaleString()}\n` +
        `• **Net Operating Profit:** PKR ${fin.netProfit.toLocaleString()}\n` +
        `• **Cash in Hand:** PKR ${fin.estimatedCashInHand.toLocaleString()}\n` +
        `• **Customer Receivables (Khata):** PKR ${fin.customerReceivables.toLocaleString()}\n` +
        `• **Inventory Value at Cost:** PKR ${fin.inventoryValueAtCost.toLocaleString()}`;
    }

    // 3. Stock / Inventory Checks
    if (q.includes('stock') || q.includes('panadol') || q.includes('augmentin') || q.includes('brufen') || q.includes('risek') || q.includes('موجود')) {
      const matched = prods.filter(p => q.includes(p.name.toLowerCase()) || q.includes(p.brand.toLowerCase()) || (p.genericName && q.includes(p.genericName.toLowerCase())));
      if (matched.length > 0) {
        let msg = `📦 **Inventory Stock Lookup:**\n\n`;
        matched.forEach(p => {
          msg += `• **${p.name}** (${p.dosageForm} ${p.strength}):\n` +
            `  - Active Stock: **${p.totalStockBoxes} Boxes** (${p.totalStockStrips} Strips)\n` +
            `  - Expired / Quarantined: ${p.expiredUnits + p.quarantinedUnits} Units\n` +
            `  - Retail Price: PKR ${p.retailPrice ? p.retailPrice.toFixed(2) : 'N/A'} per Box\n` +
            `  - Storage: ${p.storageTemp || 'Room Temp'}\n`;
        });
        return msg;
      }
    }

    // 4. Low stock reorder
    if (q.includes('low') || q.includes('order') || q.includes('reorder') || q.includes('kam') || q.includes('کم')) {
      const low = prods.filter(p => p.isLowStock);
      if (low.length > 0) {
        let msg = `🚨 **Low Stock & Reorder Alert (${low.length} items):**\n\n`;
        low.forEach(l => {
          msg += `• **${l.name}** | Current: ${l.totalStockBoxes} Boxes (Min: ${l.minStockLevel}) | Suggested Order: ${l.minStockLevel * 2 - l.totalStockBoxes} Boxes\n`;
        });
        return msg;
      }
      return `✅ All product stocks are currently above minimum threshold levels.`;
    }

    // 5. Clinical / General Pharmacy Knowledge
    return `Hello! I am the **Usman Pharmacy AI Clinical & ERP Assistant**.\n\n` +
      `I can help you instantly with:\n` +
      `1. **Expiry & Safety Audits:** Ask *"Which medicines are expiring soon?"*\n` +
      `2. **Financials & Profit:** Ask *"What is today's gross profit and sales?"*\n` +
      `3. **Inventory & Stock:** Ask *"Check stock of Panadol or Augmentin"*\n` +
      `4. **Reorder Alerts:** Ask *"Show low stock items"*\n` +
      `5. **DRAP & Drug Regulations:** Inquire about Schedule G rules, dosage, or supplier returns.\n\n` +
      `*You can speak your question via the Microphone button or type it in English or Urdu.*`;
  }
}

// Global AI Singleton
window.usmanAI = new UsmanAIAgent();
