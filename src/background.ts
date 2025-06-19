// Background service worker for ulterior motives detector
import { config } from './config';

interface OpenRouterRequest {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
}

interface OpenRouterResponse {
    choices: Array<{ message: { content: string } }>;
}

// Send data to OpenRouter API
async function sendToOpenRouter(data: any): Promise<string> {
    console.log('Background: Starting OpenRouter API call...');

    if (!config.OPENROUTER_API_KEY || config.OPENROUTER_API_KEY === 'your-api-key-here') {
        throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your .env file.');
    }

    const prompt = `Analyze this webpage for ulterior motives, bias, and hidden agendas:

URL: ${data.url}
Title: ${data.title}
Author: ${data.author || 'Unknown'}
Motive Indicators: ${data.motiveIndicators.join(', ')}
Bias Score: ${data.biasScore}/100

Excerpt:
${data.excerpt.substring(0, 1000)}...

Return a JSON response following the schema with scores for bias, manipulation, commercial motives, and credibility. Include main claims, warning signs, and a recommendation.`;

    const system_prompt = `SYSTEM ROLE
You are "Spinguard Analyzer", an AI research agent that receives:
  (a) raw HTML or plain text of a web page OR a single social‑media post,
  (b) minimal context about the reader persona: {self | child | grandparent}.

Your job is to produce a concise, structured JSON report that helps the
reader judge credibility, hidden motives, and psychological manipulation
risks in ≤ 10 s. Use open‑source knowledge and up‑to‑2025 public data only.

High‑level tasks
1. Extract and normalise core metadata:
   • title, site domain, publish date, declared author(s)  
   • author bio snippet (if present) and outbound citation list
2. Enrich author/site with public reputation signals:
   • past fact‑check hits (MBFC / Snopes / PolitiFact)  
   • known financial or political affiliations (Wikipedia, OpenSecrets, Crunchbase)  
   • historical bias class if domain rated by NewsGuard / MBFC
3. Analyse content itself:
   • Claim & evidence map (up to 5 strongest factual claims)  
   • Rhetorical tactics detected (emotion bait, loaded language, fear appeal, etc.)  
   • Sentiment & polarity distribution
4. Score five risk dimensions 0‑5 (None → Extreme):
   R1 Accuracy Risk   R2 Bias Risk   R3 Manipulation Risk  
   R4 Conflict‑of‑Interest R5 Source Transparency
5. Recommend ONE "reader action" string (see schema) tailored to persona:
   • self → contract/bias negotiation advice  
   • child → critical‑thinking prompt or "ask a parent" nudge  
   • grandparent → fraud/scam warning or safe next step
6. Keep privacy: never echo large verbatim chunks (>50 words) of original.

Output STRICTLY as valid JSON that matches the schema.
Do not wrap in markdown. Do not add keys.

JSON SCHEMA
{
  "title": String,
  "author": String|Null,
  "bias_score": 0-100,
  "manipulation_score": 0-100,
  "commercial_score": 0-100,
  "credibility_score": 0-100,
  "main_claims": [String],
  "warning_signs": [String],
  "recommendation": String
}

CONTROLLED VOCAB for rhetorical_tactics  
["fear appeal","loaded language","cherry picking","bandwagon","ad hominem",
 "outrage bait","emotion framing","false balance","social proof","urgency"]

SCORING RUBRIC (0-100)
0-20 None/N-A   21-40 Minimal   41-60 Moderate   61-80 High   81-100 Extreme

End of prompt.`

    const requestBody: OpenRouterRequest = {
        model: config.MODEL,
        messages: [{ role: 'system', content: system_prompt }, { role: 'user', content: prompt }],
        max_tokens: config.MAX_TOKENS
    };

    console.log('Background: Making API request to OpenRouter...');
    console.log(requestBody);
    const response = await fetch(config.OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'localhost:3000' // for development
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: OpenRouterResponse = await response.json();
    console.log('Background: OpenRouter API call successful');
    return result.choices[0]?.message?.content || 'No analysis available';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background: Message received:', request);

    if (request.action === 'sendToLLM') {
        console.log('Background: Processing LLM request...');
        console.log('New format...');
        sendToOpenRouter(request.data)
            .then(response => {
                console.log('Background: LLM response received, sending back to popup');
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('Background: LLM error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }

    console.log('Background: Unknown action received:', request.action);
});

console.log('Background script loaded for ulterior motives detector'); 