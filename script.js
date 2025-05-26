// ==UserScript==
// @name         t3.chat/auth
// @namespace    https://t3.chat
// @version      3.2
// @description  Adds a button to login by fetching cookies from a URL, using an enhanced custom HTML modal for ID input and feedback. (Comments removed)
// @match        https://t3.chat/auth
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(async function () {
    "use strict";

    const COOKIE_DATA_URL = "https://raw.githubusercontent.com/abdullah-elbedwehy/PromptStorage/refs/heads/main/data.json";
    let allCookieData = {};

    function addModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tm-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            }
            .tm-modal-content {
                background-color: #282c34; 
                color: #abb2bf; 
                padding: 1.5rem; 
                border-radius: 0.5rem; 
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.2); 
                width: 90%;
                max-width: 450px;
                text-align: left;
            }
            .tm-modal-title {
                font-size: 1.25rem; 
                font-weight: 600; 
                margin-bottom: 1rem; 
                color: #e5e7eb; 
            }
            .tm-modal-input {
                width: calc(100% - 2rem); 
                padding: 0.75rem 1rem; 
                margin-bottom: 1.25rem; 
                border: 1px solid #4b5563; 
                border-radius: 0.375rem; 
                font-size: 0.875rem; 
                background-color: #1e2127; 
                color: #e5e7eb; 
                transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            }
            .tm-modal-input:focus {
                border-color: #a23b67; 
                box-shadow: 0 0 0 0.2rem rgba(162, 59, 103, 0.35);
                outline: none;
            }
            .tm-modal-buttons-container {
                display: flex;
                justify-content: flex-end; 
                gap: 0.75rem; 
            }
            .tm-modal-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.625rem 1rem; 
                border: none;
                border-radius: 0.375rem; 
                cursor: pointer;
                font-size: 0.875rem; 
                font-weight: 500; 
                transition: background-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                line-height: 1.25rem;
            }
            .tm-modal-submit-button {
                background-color: #a23b67; 
                color: white;
            }
            .tm-modal-submit-button:hover {
                background-color: #db2777; 
            }
            .tm-modal-close-button {
                background-color: #4b5563; 
                color: #e5e7eb; 
            }
            .tm-modal-close-button:hover {
                background-color: #6b7280; 
            }
            .tm-modal-message-area {
                margin-top: 1rem; 
                margin-bottom: 1.25rem; 
                padding: 0.75rem 1rem; 
                border-radius: 0.375rem; 
                font-size: 0.875rem; 
                min-height: 1.25rem; 
                border-width: 1px;
                border-style: solid;
            }
            .tm-modal-message-success {
                background-color: rgba(16, 185, 129, 0.1);
                color: #10b981; 
                border-color: rgba(16, 185, 129, 0.3);
            }
            .tm-modal-message-error {
                background-color: rgba(239, 68, 68, 0.1);
                color: #ef4444; 
                border-color: rgba(239, 68, 68, 0.3);
            }
            .tm-modal-message-info {
                background-color: rgba(59, 130, 246, 0.1);
                color: #3b82f6; 
                border-color: rgba(59, 130, 246, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    async function fetchRemoteCookieData() {
        try {
            const response = await fetch(COOKIE_DATA_URL);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error fetching cookie data! status: ${response.status}, message: ${errorText}`);
                throw new Error(`HTTP error! status: ${response.status}. Check console.`);
            }
            const jsonData = await response.json();
            if (typeof jsonData === 'object' && jsonData !== null) {
                allCookieData = jsonData;
                console.log("Remote cookie data loaded successfully.");
            } else {
                console.error("Fetched cookie data is not a valid object:", jsonData);
                allCookieData = {};
                throw new Error("Fetched cookie data is not valid. Check console.");
            }
        } catch (e) {
            console.error("Exception during fetch/parse of remote cookie data:", e.message);
            allCookieData = {};
            throw new Error(`Failed to load or parse cookie data: ${e.message}`);
        }
    }

    function setCookie(c) {
        if (!c.name || typeof c.value === 'undefined') {
            console.warn("Skipping cookie with missing name or value:", c);
            return;
        }
        let str = `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`;
        str += `; path=${c.path || '/'}`;
        if (c.domain) str += `; domain=${c.domain}`;
        str += `; SameSite=${c.sameSite || 'Lax'}`;
        if (c.secure) str += "; Secure";
        if (typeof c.expirationDate === 'number') {
            str += `; expires=${new Date(c.expirationDate * 1000).toUTCString()}`;
        }
        document.cookie = str;
    }

    let modalOverlay = null;

    function showModal() {
        if (modalOverlay) return;

        if (Object.keys(allCookieData).length === 0) {
            console.error("Cookie data is not loaded. Cannot show modal.");
            return;
        }

        modalOverlay = document.createElement('div');
        modalOverlay.className = 'tm-modal-overlay';

        const modalContent = document.createElement('div');
        modalContent.className = 'tm-modal-content';

        modalContent.innerHTML = `
            <div class="tm-modal-title">Enter Cookie ID</div>
            <input type="text" id="tm-cookie-id-input" class="tm-modal-input" placeholder="e.g., WDXGI">
            <div id="tm-modal-message-area" class="tm-modal-message-area" style="display: none;"></div>
            <div class="tm-modal-buttons-container">
                <button id="tm-modal-close" class="tm-modal-button tm-modal-close-button">Cancel</button>
                <button id="tm-modal-submit" class="tm-modal-button tm-modal-submit-button">Login</button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        const inputField = document.getElementById('tm-cookie-id-input');
        inputField.focus();

        document.getElementById('tm-modal-submit').addEventListener('click', handleModalSubmit);
        document.getElementById('tm-modal-close').addEventListener('click', hideModal);
        modalOverlay.addEventListener('click', function(event) {
            if (event.target === modalOverlay) { 
                hideModal();
            }
        });
        inputField.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                handleModalSubmit();
            }
        });
    }

    function hideModal() {
        if (modalOverlay) {
            document.body.removeChild(modalOverlay);
            modalOverlay = null;
        }
    }

    function displayModalMessage(message, type = 'info') { 
        const messageArea = document.getElementById('tm-modal-message-area');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.className = `tm-modal-message-area tm-modal-message-${type}`;
            messageArea.style.display = 'block'; 
        }
    }

    function handleModalSubmit() {
        const cookieIdInput = document.getElementById('tm-cookie-id-input');
        const trimmedId = cookieIdInput.value.trim();
        const messageArea = document.getElementById('tm-modal-message-area');
        messageArea.style.display = 'none'; 

        if (!trimmedId) {
            displayModalMessage("Cookie ID cannot be empty.", 'error');
            return;
        }

        if (allCookieData.hasOwnProperty(trimmedId)) {
            const cookiesToSet = allCookieData[trimmedId];
            if (Array.isArray(cookiesToSet) && cookiesToSet.length > 0) {
                cookiesToSet.forEach(setCookie);
                displayModalMessage(`🍪 Cookies for ID '${trimmedId}' loaded! Reloading page...`, 'success');
                setTimeout(() => {
                    hideModal();
                    window.location.reload();
                }, 1500); 
            } else {
                displayModalMessage(`Error: No cookies found for ID '${trimmedId}' or data is malformed.`, 'error');
            }
        } else {
            displayModalMessage(`Error: Cookie ID '${trimmedId}' not found.`, 'error');
        }
    }

    const buttonHTML = `
      <button id="tm-load-cookies-by-id"
              class="inline-flex items-center justify-center gap-3 whitespace-nowrap font-semibold rounded-lg bg-[rgb(162,59,103)] dark:bg-primary/20 dark:hover:bg-pink-800/70 p-2 shadow border-reflect button-reflect hover:bg-[#d56698] active:bg-[rgb(162,59,103)] dark:active:bg-pink-800/40 px-4 py-2 h-14 w-full text-lg text-white backdrop-blur-sm transition-all hover:shadow-lg mt-4">
        <img src="https://cdn-icons-png.flaticon.com/128/1047/1047711.png"
             alt="cookie icon"
             class="h-6 w-6 flex-shrink-0" />
        <span>Login Using Cookies (ID)</span>
      </button>
    `;

    function injectButtonAndSetupListener() {
        const googleBtn = document.querySelector(
            "button.inline-flex.items-center.justify-center.gap-2.whitespace-nowrap"
        );
        if (!googleBtn) {
            setTimeout(injectButtonAndSetupListener, 300);
            return;
        }

        googleBtn.insertAdjacentHTML("afterend", buttonHTML);

        const newBtn = document.getElementById("tm-load-cookies-by-id");
        if (newBtn) {
            newBtn.addEventListener("click", () => {
                if (Object.keys(allCookieData).length === 0) {
                    console.error("Cookie data not available. Cannot proceed.");
                    return; 
                }
                showModal();
            });
        } else {
            console.error("Failed to find the injected button #tm-load-cookies-by-id");
        }
    }

    async function main() {
        addModalStyles();
        try {
            await fetchRemoteCookieData();
            if (Object.keys(allCookieData).length > 0) {
                 injectButtonAndSetupListener();
            } else {
                console.warn("Cookie data is empty after fetch attempt. Login button will not be fully functional or might not appear if we add stricter checks.");
            }
        } catch (error) {
            console.error("Failed to initialize cookie login script:", error.message);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = `Cookie Login Script Error: ${error.message} Check console.`;
            errorDiv.style.cssText = 'position:fixed; bottom:10px; left:10px; background-color:red; color:white; padding:10px; border-radius:5px; z-index:10001;';
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 10000); 
        }
    }

    main();

})();
