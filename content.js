// This script runs on the labs.ramseysolutions.com page
chrome.storage.local.get(['userInput'], function(result) {
    if (result.userInput) {
        // Function to find and fill the input field
        function fillInputAndSubmit() {
            const input = document.querySelector('.v-field__input');
            const submitButton = document.querySelector('button[type="submit"].v-btn--icon');
            
            if (input && submitButton) {
                // Fill the input and trigger necessary events
                input.value = result.userInput;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Wait a brief moment for Vue to process the input
                setTimeout(() => {
                    // Trigger click events on the submit button
                    submitButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    submitButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    
                    // Clear the stored input after submission
                    chrome.storage.local.remove('userInput');
                }, 500);
            } else {
                // If elements aren't found yet, try again
                setTimeout(fillInputAndSubmit, 1000);
            }
        }

        // Start the process with a delay to ensure Vue is fully initialized
        setTimeout(() => {
            if (document.readyState === 'complete') {
                fillInputAndSubmit();
            } else {
                window.addEventListener('load', fillInputAndSubmit);
            }
        }, 2000);
    }
});
