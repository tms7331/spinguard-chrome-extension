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
                // Get current tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab.id) {
                    throw new Error('No active tab found');
                }

                // Check if we can access this URL
                if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('moz-extension://')) {
                    throw new Error('Cannot analyze Chrome internal pages or extension pages. Please navigate to a regular website.');
                }

                // Try to send message to content script first
                let data;
                try {
                    data = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
                } catch (messageError) {
                    console.log('Content script not responding, injecting...');

                    // Inject content script
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['assets/content.ts-BSa6JlSb.js']
                    });

                    // Wait a moment for script to load
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Try sending message again
                    data = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
                }

                // Display results
                resultsDiv.innerHTML = `
                    <h3>Analysis Results</h3>
                    <p><strong>URL:</strong> ${data.url}</p>
                    <p><strong>Title:</strong> ${data.title}</p>
                    <p><strong>Author:</strong> ${data.author || 'Unknown'}</p>
                    <p><strong>Bias Score:</strong> ${data.biasScore}/100</p>
                    <p><strong>Links Found:</strong> ${data.links.length}</p>
                    <p><strong>Motive Indicators:</strong></p>
                    <ul>
                        ${data.motiveIndicators.length > 0
                        ? data.motiveIndicators.map((indicator: string) => `<li>${indicator}</li>`).join('')
                        : '<li>None detected</li>'
                    }
                    </ul>
                `;

            } catch (error: unknown) {
                console.error('Error analyzing page:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                resultsDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
            }
        });
    }
}); 