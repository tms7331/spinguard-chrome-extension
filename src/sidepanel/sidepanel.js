// Side panel script for Spinguard
document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze');
    const resultsDiv = document.getElementById('results');

    if (analyzeButton) {
        analyzeButton.addEventListener('click', async () => {
            console.log('Analyze button clicked!');

            // Show loading state
            analyzeButton.disabled = true;
            analyzeButton.textContent = 'Analyzing...';
            resultsDiv.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Analyzing page for hidden motives and bias...</p>
                </div>
            `;

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
                                    .map(link => link.href)
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
                                    const href = link.href;
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
                                const authorMeta = document.querySelector('meta[name="author"]');
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
                            window.pageAnalysisData = pageData;
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
                        func: () => window.pageAnalysisData
                    });

                    pageData = result[0].result;
                    console.log('Step 6 complete: Retrieved page data:', pageData);
                }

                // Send data to background script for LLM analysis
                console.log('Step 7: Sending data to background script for LLM analysis...');
                resultsDiv.innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Getting AI analysis...</p>
                    </div>
                `;

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

                // Helper function to extract and parse JSON from a string
                function extractAndParseJson(text) {
                    const match = text.match(/\{[\s\S]*\}/);
                    if (match && match[0]) {
                        try {
                            return JSON.parse(match[0]);
                        } catch (e) {
                            console.error("Failed to parse extracted JSON:", e);
                            throw new Error("AI returned malformed JSON. Please try again.");
                        }
                    }
                    throw new Error("Could not find a JSON object in the AI's response.");
                }

                // Parse the response if it's a string (JSON)
                let analysisData;
                if (typeof llmResponse.data === 'string') {
                    analysisData = extractAndParseJson(llmResponse.data);
                } else {
                    analysisData = llmResponse.data;
                }

                if (!analysisData) {
                    throw new Error("Failed to get analysis data from the response.");
                }

                // Display structured results with improved layout
                const riskLevel = (score) => {
                    if (score <= 20) return { class: 'risk-low', text: 'Low' };
                    if (score <= 40) return { class: 'risk-moderate', text: 'Moderate' };
                    if (score <= 60) return { class: 'risk-high', text: 'High' };
                    return { class: 'risk-extreme', text: 'Extreme' };
                };

                const biasRisk = riskLevel(analysisData.bias_score || 0);
                const manipulationRisk = riskLevel(analysisData.manipulation_score || 0);
                const commercialRisk = riskLevel(analysisData.commercial_score || 0);
                const credibilityRisk = riskLevel(analysisData.credibility_score || 0);

                resultsDiv.innerHTML = `
                    <div class="results">
                        ${analysisData.summary ? `
                            <div class="summary-box">
                                <h3>🤖 AI Summary</h3>
                                <p>${analysisData.summary}</p>
                            </div>
                        ` : ''}
                        
                        <div class="section">
                            <h3>📋 Basic Information</h3>
                            <div class="basic-info">
                                <div class="info-item">
                                    <strong>Title</strong>
                                    <span>${analysisData.title || pageData.title}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Author</strong>
                                    <span>${analysisData.author || pageData.author || 'Unknown'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3>⚠️ Risk Assessment</h3>
                            <div class="risk-grid">
                                <div class="risk-item">
                                    <div class="score ${biasRisk.class}">${analysisData.bias_score || 0}</div>
                                    <div class="label">Bias Risk</div>
                                </div>
                                <div class="risk-item">
                                    <div class="score ${manipulationRisk.class}">${analysisData.manipulation_score || 0}</div>
                                    <div class="label">Manipulation</div>
                                </div>
                                <div class="risk-item">
                                    <div class="score ${commercialRisk.class}">${analysisData.commercial_score || 0}</div>
                                    <div class="label">Commercial</div>
                                </div>
                                <div class="risk-item">
                                    <div class="score ${credibilityRisk.class}">${analysisData.credibility_score || 0}</div>
                                    <div class="label">Credibility</div>
                                </div>
                            </div>
                        </div>
                        
                        ${analysisData.main_claims?.length > 0 ? `
                            <div class="section">
                                <h3>🔍 Key Claims</h3>
                                <div class="claims-list">
                                    <h4>Main factual claims identified:</h4>
                                    <ul>
                                        ${analysisData.main_claims.map((claim) => `<li>${claim}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${analysisData.warning_signs?.length > 0 ? `
                            <div class="section">
                                <h3>🚨 Warning Signs</h3>
                                <div class="warnings-list">
                                    <h4>Potential red flags detected:</h4>
                                    <ul>
                                        ${analysisData.warning_signs.map((sign) => `<li>${sign}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="section">
                            <h3>💡 Recommendation</h3>
                            <div class="recommendation">
                                <p>${analysisData.recommendation || 'Use critical thinking when reading this content'}</p>
                            </div>
                        </div>
                    </div>
                `;

                console.log('Step 8 complete: Results displayed (structured format)');

            } catch (error) {
                console.error('Error analyzing page:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                resultsDiv.innerHTML = `
                    <div class="error">
                        <h3><span style="font-size: 18px;">⚠️</span> Analysis Failed</h3>
                        <p>${errorMessage}</p>
                    </div>
                `;
            } finally {
                // Reset button state
                analyzeButton.disabled = false;
                analyzeButton.textContent = 'Analyze Current Page';
            }
        });
    }
}); 