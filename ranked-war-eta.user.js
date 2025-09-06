// ==UserScript==
// @name         Torn Ranked War ETA
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Calculate and display ranked war end time
// @author       You
// @match        https://www.torn.com/factions.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    let etaDisplayAdded = false;
    
    function setupWarETA() {
        const factionMain = document.querySelector('div#faction-main');
        
        if (!factionMain) {
            return false;
        }
        
        // Find "View graph" element
        const walker = document.createTreeWalker(
            factionMain,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let viewGraphExists = false;
        let viewGraphNode = null;
        
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.includes('View graph')) {
                viewGraphExists = true;
                viewGraphNode = node;
                break;
            }
        }
        
        if (viewGraphExists && !etaDisplayAdded) {
            // Add click listener to "View graph" element
            viewGraphNode.parentElement.addEventListener('click', () => {
                // Wait for the table to load after click
                setTimeout(() => {
                    calculateAndDisplayWarEnd(viewGraphNode);
                }, 500);
            });
            
            etaDisplayAdded = true;
            return true;
        } else if (!viewGraphExists && etaDisplayAdded) {
            etaDisplayAdded = false;
        }
        
        return false;
    }
    
    function calculateAndDisplayWarEnd(viewGraphNode) {
        // Remove any existing war end display
        const existing = document.getElementById('war-end-marker');
        if (existing) {
            existing.remove();
        }
        
        // Get current scores and target scores
        const currentScores = getCurrentScores();
        const initialTarget = getInitialTargetScore();
        
        // Calculate when war will end
        if (currentScores && initialTarget) {
            const decayRate = Math.round(initialTarget * 0.01);
            const difference = currentScores.target - currentScores.current;
            const hoursToEnd = difference / decayRate;
            
            // Calculate exact end time
            const now = new Date();
            const endTime = new Date(now.getTime() + hoursToEnd * 60 * 60 * 1000);
            
            // Round up to the next hour
            const roundedEndTime = new Date(endTime);
            if (roundedEndTime.getMinutes() > 0 || roundedEndTime.getSeconds() > 0) {
                roundedEndTime.setHours(roundedEndTime.getHours() + 1);
            }
            roundedEndTime.setMinutes(0, 0, 0);
            
            // Format the display
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = days[roundedEndTime.getDay()];
            const hours = roundedEndTime.getHours().toString().padStart(2, '0');
            const day = roundedEndTime.getDate().toString().padStart(2, '0');
            const month = (roundedEndTime.getMonth() + 1).toString().padStart(2, '0');
            const year = roundedEndTime.getFullYear().toString().slice(-2);
            
            const etaString = `War ends: ${dayName} ${hours}:00:00 - ${day}/${month}/${year} (${hoursToEnd.toFixed(1)}h) `;
            
            // Create and display the ETA element
            const etaElement = document.createElement('span');
            etaElement.textContent = etaString;
            etaElement.style.fontWeight = 'bold';
            etaElement.style.color = 'red';
            etaElement.id = 'war-end-marker';
            
            // Insert before the "View graph" span
            viewGraphNode.parentElement.insertBefore(etaElement, viewGraphNode.parentElement.firstChild);
        }
    }
    
    function getCurrentScores() {
        const factionMain = document.querySelector('div#faction-main');
        
        if (!factionMain) {
            return null;
        }
        
        // Find "LEAD TARGET" text and extract numbers
        const walker = document.createTreeWalker(
            factionMain,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let leadTargetNode = null;
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim() === 'LEAD TARGET') {
                leadTargetNode = node;
                break;
            }
        }
        
        if (!leadTargetNode) {
            return null;
        }
        
        // Search for numbers after LEAD TARGET
        const numberWalker = document.createTreeWalker(
            factionMain,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let foundLeadTarget = false;
        const numbers = [];
        
        while (node = numberWalker.nextNode()) {
            if (node === leadTargetNode) {
                foundLeadTarget = true;
                continue;
            }
            
            if (foundLeadTarget) {
                const text = node.textContent.trim();
                if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                    const numberValue = parseInt(text.replace(/,/g, ''));
                    numbers.push(numberValue);
                    
                    if (numbers.length >= 2) break;
                }
            }
        }
        
        if (numbers.length >= 2) {
            return { current: numbers[0], target: numbers[1] };
        } else {
            return null;
        }
    }
    
    function getInitialTargetScore() {
        const factionMain = document.querySelector('div#faction-main');
        
        if (!factionMain) {
            return null;
        }
        
        // Find the table with the graph data
        const tables = factionMain.querySelectorAll('table');
        
        for (let table of tables) {
            const thead = table.querySelector('thead');
            if (thead) {
                const headerCells = thead.querySelectorAll('th');
                const headers = Array.from(headerCells).map(h => h.textContent.trim());
                
                // Look for the table with Target and Green area columns
                if (headers.includes('Target') && headers.includes('Green area')) {
                    const tbody = table.querySelector('tbody');
                    if (tbody) {
                        const firstRow = tbody.querySelector('tr');
                        if (firstRow) {
                            const cells = firstRow.querySelectorAll('td');
                            
                            // Find the Target column (position 1 based on analysis)
                            const targetIndex = headers.indexOf('Target');
                            if (targetIndex >= 0 && cells[targetIndex]) {
                                const targetText = cells[targetIndex].textContent.trim();
                                if (targetText) {
                                    const target = parseInt(targetText.replace(/,/g, ''));
                                    return target;
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        return null;
    }
    
    function startWatching() {
        // Watch for DOM changes
        const observer = new MutationObserver(() => {
            setupWarETA();
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Try immediately
        setupWarETA();
    }
    
    // Start the script
    startWatching();
})();