// Popup script for ulterior motives detector
document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze');
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'results';
    resultsDiv.style.marginTop = '20px';
    document.body.appendChild(resultsDiv);

    if (analyzeButton) {
        analyzeButton.addEventListener('click', async () => {
            console.log('Analyze button clicked!');

            // Show loading state
            resultsDiv.innerHTML = '<p>Analyzing page...</p>';

            try {
                console.log('Step 1: Getting current tab...');
                // Get current tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab.id) {
                    throw new Error('No active tab found');
                }
                console.log('Step 1 complete: Tab found with ID:', tab.id);

                // Check if we can access this URL
                if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('moz-extension://')) {
                    throw new Error('Cannot analyze Chrome internal pages or extension pages. Please navigate to a regular website.');
                }
                console.log('Step 2 complete: URL is accessible');

                // Try to send message to content script first
                let pageData;
                try {
                    console.log('Step 3: Trying to send message to existing content script...');
                    pageData = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
                    console.log('Step 3 complete: Content script responded with data');
                } catch (messageError) {
                    console.log('Step 3 failed: Content script not responding, injecting...');
                    console.log('Message error:', messageError);

                    // Inject content script as a function
                    console.log('Step 4: Injecting content script...');
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            // This will be executed in the context of the web page
                            console.log('Content script injected via function');

                            // Extract all unique links from the page
                            function extractLinks() {
                                const links = Array.from(document.querySelectorAll('a[href]'));
                                const urls = links
                                    .map(link => (link as HTMLAnchorElement).href)
                                    .filter(url => {
                                        try {
                                            const urlObj = new URL(url);
                                            return !urlObj.hash;
                                        } catch {
                                            return false;
                                        }
                                    });
                                return [...new Set(urls)].slice(0, 500);
                            }

                            // Detect motive indicators
                            function detectMotiveIndicators() {
                                const indicators = [];
                                const affiliatePatterns = [/amazon\.com.*ref=/, /go2cloud\.org/, /clickbank\.com/, /commission/, /affiliate/, /partner/, /sponsor/];
                                const links = document.querySelectorAll('a[href]');
                                links.forEach(link => {
                                    const href = (link as HTMLAnchorElement).href;
                                    if (affiliatePatterns.some(pattern => pattern.test(href))) {
                                        indicators.push('Affiliate links detected');
                                    }
                                });

                                const text = document.body.textContent?.toLowerCase() || '';
                                const sponsoredTerms = ['sponsored', 'advertisement', 'promoted', 'paid partnership', 'advertorial', 'branded content'];
                                if (sponsoredTerms.some(term => text.includes(term))) {
                                    indicators.push('Sponsored content markers found');
                                }

                                const biasTerms = ['conspiracy', 'fake news', 'mainstream media', 'wake up', 'sheeple', 'elite', 'globalist', 'deep state'];
                                if (biasTerms.some(term => text.includes(term))) {
                                    indicators.push('Political bias indicators detected');
                                }

                                return [...new Set(indicators)];
                            }

                            // Extract author information
                            function extractAuthor() {
                                const authorMeta = document.querySelector('meta[name="author"]') as HTMLMetaElement;
                                if (authorMeta?.content) return authorMeta.content;

                                const bylineSelectors = ['.author', '.byline', '[rel="author"]', '.post-author', '.article-author', '.writer'];
                                for (const selector of bylineSelectors) {
                                    const element = document.querySelector(selector);
                                    if (element?.textContent?.trim()) return element.textContent.trim();
                                }
                                return null;
                            }

                            // Calculate bias score
                            function calculateBiasScore() {
                                let score = 0;
                                const text = document.body.textContent?.toLowerCase() || '';
                                const biasTerms = ['conspiracy', 'fake news', 'mainstream media', 'wake up', 'sheeple', 'elite', 'globalist', 'deep state', 'liberal media', 'conservative bias'];
                                const matches = biasTerms.filter(term => text.includes(term));
                                score += matches.length * 10;

                                const commercialTerms = ['buy now', 'limited time', 'act now', 'special offer', 'discount', 'sale', 'deal', 'promotion', 'click here', 'learn more'];
                                const commercialMatches = commercialTerms.filter(term => text.includes(term));
                                score += commercialMatches.length * 5;

                                return Math.min(score, 100);
                            }

                            // Get page excerpt
                            function getExcerpt() {
                                const text = document.body.textContent || '';
                                return text.substring(0, 3000);
                            }

                            // Analyze page
                            const pageData = {
                                url: window.location.href,
                                title: document.title,
                                links: extractLinks(),
                                motiveIndicators: detectMotiveIndicators(),
                                author: extractAuthor(),
                                excerpt: getExcerpt(),
                                biasScore: calculateBiasScore()
                            };

                            // Store the data globally so the popup can access it
                            (window as any).pageAnalysisData = pageData;
                            console.log('Page analysis complete:', pageData);
                        }
                    });
                    console.log('Step 4 complete: Content script injected');

                    // Wait a moment for script to load
                    console.log('Step 5: Waiting for script to execute...');
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Get the data from the injected script
                    console.log('Step 6: Retrieving analysis data...');
                    const result = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => (window as any).pageAnalysisData
                    });

                    pageData = result[0].result;
                    console.log('Step 6 complete: Retrieved page data:', pageData);
                }

                // Send data to background script for LLM analysis
                console.log('Step 7: Sending data to background script for LLM analysis...');
                resultsDiv.innerHTML = '<p>Getting AI analysis...</p>';

                const llmResponse = await chrome.runtime.sendMessage({
                    action: 'sendToLLM',
                    data: pageData
                });
                console.log('Step 7 complete: LLM response received:', llmResponse);

                if (!llmResponse.success) {
                    throw new Error(llmResponse.error);
                }

                // Display results
                console.log('Step 8: Displaying results...');

                // Parse the response if it's a string (JSON)
                let analysisData;
                if (typeof llmResponse.data === 'string') {
                    try {
                        analysisData = JSON.parse(llmResponse.data);
                    } catch {
                        // If it's not JSON, treat it as the old format
                        resultsDiv.innerHTML = `
                            <h3>Analysis Results</h3>
                            <p><strong>URL:</strong> ${pageData.url}</p>
                            <p><strong>Title:</strong> ${pageData.title}</p>
                            <p><strong>Author:</strong> ${pageData.author || 'Unknown'}</p>
                            <p><strong>Bias Score:</strong> ${pageData.biasScore}/100</p>
                            <p><strong>Links Found:</strong> ${pageData.links.length}</p>
                            <p><strong>Motive Indicators:</strong></p>
                            <ul>
                                ${pageData.motiveIndicators.length > 0
                                ? pageData.motiveIndicators.map((indicator: string) => `<li>${indicator}</li>`).join('')
                                : '<li>None detected</li>'
                            }
                            </ul>
                            <h4>AI Analysis:</h4>
                            <p>${llmResponse.data}</p>
                        `;
                        console.log('Step 8 complete: Results displayed (legacy format)');
                        return;
                    }
                } else {
                    analysisData = llmResponse.data;
                }

                // Display simplified structured results
                const riskLevel = (score: number) => {
                    if (score <= 1) return '🟢 Low';
                    if (score <= 2) return '🟡 Moderate';
                    if (score <= 3) return '🟠 High';
                    return '🔴 Extreme';
                };

                resultsDiv.innerHTML = `
                    <h3>Spinguard Analysis</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <h4>📋 Basic Info</h4>
                        <p><strong>Title:</strong> ${analysisData.title || pageData.title}</p>
                        <p><strong>Author:</strong> ${analysisData.author || pageData.author || 'Unknown'}</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4>⚠️ Risk Assessment</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
                            <div>Bias: ${riskLevel(analysisData.bias_score || 0)}</div>
                            <div>Manipulation: ${riskLevel(analysisData.manipulation_score || 0)}</div>
                            <div>Commercial: ${riskLevel(analysisData.commercial_score || 0)}</div>
                            <div>Credibility: ${riskLevel(analysisData.credibility_score || 0)}</div>
                        </div>
                    </div>
                    
                    ${analysisData.main_claims?.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            <h4>🔍 Key Claims</h4>
                            <ul style="font-size: 14px;">
                                ${analysisData.main_claims.map((claim: string) => `<li>${claim}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${analysisData.warning_signs?.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            <h4>🚨 Warning Signs</h4>
                            <ul style="font-size: 14px;">
                                ${analysisData.warning_signs.map((sign: string) => `<li>${sign}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 15px;">
                        <h4>💡 Recommendation</h4>
                        <p style="font-size: 14px;">${analysisData.recommendation || 'Use critical thinking when reading this content'}</p>
                    </div>
                `;

                console.log('Step 8 complete: Results displayed (simplified format)');

            } catch (error: unknown) {
                console.error('Error analyzing page:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                resultsDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
            }
        });
    }
}); 