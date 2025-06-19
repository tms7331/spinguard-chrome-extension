// Content script for ulterior motives detection

interface PageData {
    url: string;
    title: string;
    links: string[];
    motiveIndicators: string[];
    author: string | null;
    excerpt: string;
    biasScore: number;
}

// Extract all unique links from the page
function extractLinks(): string[] {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const urls = links
        .map(link => (link as HTMLAnchorElement).href)
        .filter(url => {
            try {
                const urlObj = new URL(url);
                return !urlObj.hash; // Exclude fragment-only links
            } catch {
                return false;
            }
        });

    // Remove duplicates and limit to 500
    return [...new Set(urls)].slice(0, 500);
}

// Detect motive indicators
function detectMotiveIndicators(): string[] {
    const indicators: string[] = [];

    // Check for affiliate links
    const affiliatePatterns = [
        /amazon\.com.*ref=/,
        /go2cloud\.org/,
        /clickbank\.com/,
        /commission/,
        /affiliate/,
        /partner/,
        /sponsor/
    ];

    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        if (affiliatePatterns.some(pattern => pattern.test(href))) {
            indicators.push('Affiliate links detected');
        }
    });

    // Check for sponsored content markers
    const sponsoredTerms = [
        'sponsored',
        'advertisement',
        'promoted',
        'paid partnership',
        'advertorial',
        'branded content'
    ];

    const text = document.body.textContent?.toLowerCase() || '';
    if (sponsoredTerms.some(term => text.includes(term))) {
        indicators.push('Sponsored content markers found');
    }

    // Check for political bias indicators
    const biasTerms = [
        'conspiracy',
        'fake news',
        'mainstream media',
        'wake up',
        'sheeple',
        'elite',
        'globalist',
        'deep state'
    ];

    if (biasTerms.some(term => text.includes(term))) {
        indicators.push('Political bias indicators detected');
    }

    return [...new Set(indicators)];
}

// Extract author information
function extractAuthor(): string | null {
    // Try meta tags first
    const authorMeta = document.querySelector('meta[name="author"]') as HTMLMetaElement;
    if (authorMeta?.content) {
        return authorMeta.content;
    }

    // Try JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
        try {
            const data = JSON.parse(script.textContent || '');
            if (data.author?.name) {
                return data.author.name;
            }
        } catch {
            // Ignore invalid JSON
        }
    }

    // Try common byline selectors
    const bylineSelectors = [
        '.author',
        '.byline',
        '[rel="author"]',
        '.post-author',
        '.article-author',
        '.writer'
    ];

    for (const selector of bylineSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
            return element.textContent.trim();
        }
    }

    return null;
}

// Calculate bias score (0-100)
function calculateBiasScore(): number {
    let score = 0;

    const text = document.body.textContent?.toLowerCase() || '';

    // Political bias terms
    const biasTerms = [
        'conspiracy', 'fake news', 'mainstream media', 'wake up', 'sheeple',
        'elite', 'globalist', 'deep state', 'liberal media', 'conservative bias'
    ];

    const matches = biasTerms.filter(term => text.includes(term));
    score += matches.length * 10;

    // Commercial intent
    const commercialTerms = [
        'buy now', 'limited time', 'act now', 'special offer', 'discount',
        'sale', 'deal', 'promotion', 'click here', 'learn more'
    ];

    const commercialMatches = commercialTerms.filter(term => text.includes(term));
    score += commercialMatches.length * 5;

    return Math.min(score, 100);
}

// Get page excerpt
function getExcerpt(): string {
    const text = document.body.textContent || '';
    return text.substring(0, 3000); // First 3KB
}

// Main analysis function
async function analyzePage(): Promise<PageData> {
    return {
        url: window.location.href,
        title: document.title,
        links: extractLinks(),
        motiveIndicators: detectMotiveIndicators(),
        author: extractAuthor(),
        excerpt: getExcerpt(),
        biasScore: calculateBiasScore()
    };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyze') {
        console.log('Content script: Analyzing page...');
        analyzePage().then(data => {
            console.log('Content script: Analysis complete', data);
            sendResponse(data);
        });
        return true; // Keep message channel open for async response
    }
});

console.log('Content script loaded for ulterior motives detection'); 