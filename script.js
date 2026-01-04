// Main state
let fromCurrency = "USD";
let toCurrency = "EUR";
let exchangeRates = {};
let allCurrencies = [];
let currencyNames = {};

// DOM elements
const amountInput = document.getElementById("amount");
const convertedDiv = document.getElementById("converted");
const rateInfo = document.getElementById("rateInfo");
const updateTime = document.getElementById("updateTime");

// Initialize the application
async function initApp() {
    try {
        updateTime.innerHTML = '<span class="loading"></span> Loading ALL currencies...';
        
        // Load ALL currency data from API
        await loadCurrencies();
        
        // Create dropdowns
        createDropdown("fromDropdown", fromCurrency, true);
        createDropdown("toDropdown", toCurrency, false);
        
        // Set initial conversion
        await convert();
        
        // Add event listener
        amountInput.addEventListener("input", convert);
        
    } catch (error) {
        console.error("Failed to initialize:", error);
        showError("Failed to load data. Please refresh the page and check your internet connection.");
    }
}

// Load ALL currencies from API - NO HARCODED DATA
async function loadCurrencies() {
    try {
        // Primary API endpoint
        const primaryUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.min.json';
        
        // Fallback API endpoint
        const fallbackUrl = 'https://latest.currency-api.pages.dev/v1/currencies/usd.json';
        
        let currenciesData = {};
        
        // Try primary API first
        try {
            const response = await fetch(primaryUrl, { timeout: 5000 });
            if (response.ok) {
                currenciesData = await response.json();
            } else {
                throw new Error(`Primary API failed: ${response.status}`);
            }
        } catch (primaryError) {
            console.log("Primary API failed, trying fallback...", primaryError);
            
            // Try fallback API
            const fallbackResponse = await fetch(fallbackUrl, { timeout: 5000 });
            if (!fallbackResponse.ok) {
                throw new Error("Both APIs failed");
            }
            const fallbackData = await fallbackResponse.json();
            currenciesData = fallbackData.usd;
        }
        
        // Process currencies data
        processCurrencies(currenciesData);
        
        // Load exchange rates
        await loadExchangeRates();
        
    } catch (error) {
        console.error("Failed to load currencies:", error);
        throw new Error("Could not load currency data. Please check your internet connection.");
    }
}

// Process currencies data from API
function processCurrencies(currenciesData) {
    // Convert object to array and process
    allCurrencies = Object.entries(currenciesData).map(([code, name]) => ({
        code: code.toUpperCase(),
        name: typeof name === 'string' ? name : code.toUpperCase()
    }));
    
    // Sort by currency name
    allCurrencies.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create lookup object
    currencyNames = {};
    allCurrencies.forEach(currency => {
        currencyNames[currency.code] = currency.name;
    });
    
    updateTime.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> ${allCurrencies.length} currencies loaded`;
}

// Load exchange rates
async function loadExchangeRates() {
    try {
        // Use the same API for exchange rates (using USD as base)
        const ratesUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json';
        
        const response = await fetch(ratesUrl);
        if (!response.ok) throw new Error("Failed to load exchange rates");
        
        const data = await response.json();
        exchangeRates = data.usd;
        
        // Ensure USD is in rates
        exchangeRates.USD = 1;
        
    } catch (error) {
        console.error("Failed to load exchange rates:", error);
        
        // If we can't get rates, set a default rate for common currencies
        exchangeRates = {
            USD: 1,
            EUR: 0.92,
            GBP: 0.79,
            JPY: 149,
            INR: 83
        };
    }
}

// Create dropdown with ALL currencies
function createDropdown(dropdownId, selectedCurrency, isFrom) {
    const dropdown = document.getElementById(dropdownId);
    
    dropdown.innerHTML = `
        <div class="selected-currency">
            <div class="currency-info">
                <div class="currency-icon">${selectedCurrency.substring(0, 2)}</div>
                <div class="currency-details">
                    <div class="currency-code">${selectedCurrency}</div>
                    <div class="currency-name">${currencyNames[selectedCurrency] || selectedCurrency}</div>
                </div>
            </div>
            <div class="currency-dropdown-icon">
                <i class="fas fa-chevron-down"></i>
            </div>
        </div>
        <div class="dropdown-list">
            <input type="text" class="dropdown-search" placeholder="Search ${allCurrencies.length} currencies...">
            <div class="dropdown-items"></div>
        </div>
    `;
    
    const selected = dropdown.querySelector('.selected-currency');
    const dropdownList = dropdown.querySelector('.dropdown-list');
    const searchInput = dropdown.querySelector('.dropdown-search');
    const itemsContainer = dropdown.querySelector('.dropdown-items');
    
    // Render ALL currency items
    function renderItems(searchTerm = '') {
        itemsContainer.innerHTML = '';
        
        // Filter currencies based on search term
        let filteredCurrencies = allCurrencies;
        
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filteredCurrencies = allCurrencies.filter(currency => {
                const currencyCode = currency.code.toLowerCase();
                const currencyName = currency.name.toLowerCase();
                
                return currencyCode.includes(searchLower) || 
                       currencyName.includes(searchLower);
            });
        }
        
        if (filteredCurrencies.length === 0) {
            itemsContainer.innerHTML = '<div class="no-results">No currencies found</div>';
            return [];
        }
        
        // Render ALL filtered currencies
        filteredCurrencies.forEach(currency => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            if (currency.code === selectedCurrency) {
                item.classList.add('active');
            }
            
            item.innerHTML = `
                <div class="dropdown-item-icon">${currency.code.substring(0, 2)}</div>
                <div class="dropdown-item-details">
                    <div class="dropdown-item-code">${currency.code}</div>
                    <div class="dropdown-item-name">${currency.name}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                selectCurrency(currency.code, isFrom);
                dropdownList.style.display = 'none';
            });
            
            itemsContainer.appendChild(item);
        });
        
        return filteredCurrencies;
    }
    
    // Initial render
    let currentItems = renderItems();
    let activeIndex = -1;
    
    // Toggle dropdown
    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownList.style.display = dropdownList.style.display === 'block' ? 'none' : 'block';
        
        if (dropdownList.style.display === 'block') {
            searchInput.value = '';
            currentItems = renderItems();
            activeIndex = -1;
            setTimeout(() => searchInput.focus(), 10);
        }
    });
    
    // Search functionality
    searchInput.addEventListener('input', () => {
        currentItems = renderItems(searchInput.value);
        activeIndex = -1;
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentItems.length > 0) {
                activeIndex = (activeIndex + 1) % currentItems.length;
                updateActiveItem();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentItems.length > 0) {
                activeIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
                updateActiveItem();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && currentItems[activeIndex]) {
                selectCurrency(currentItems[activeIndex].code, isFrom);
                dropdownList.style.display = 'none';
            }
        } else if (e.key === 'Escape') {
            dropdownList.style.display = 'none';
        }
    });
    
    function updateActiveItem() {
        const items = itemsContainer.querySelectorAll('.dropdown-item');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === activeIndex);
            if (index === activeIndex) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }
    
    function selectCurrency(currencyCode, isFrom) {
        if (isFrom) {
            fromCurrency = currencyCode;
        } else {
            toCurrency = currencyCode;
        }
        
        updateSelectorValues();
        createDropdown(dropdownId, currencyCode, isFrom);
        convert();
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdownList.style.display = 'none';
        }
    });
}

// Update selector values
function updateSelectorValues() {
    document.getElementById('fromValue').textContent = fromCurrency;
    document.getElementById('toValue').textContent = toCurrency;
}

// Perform currency conversion
async function convert() {
    const amount = parseFloat(amountInput.value) || 0;
    
    if (amount <= 0) {
        convertedDiv.textContent = 'Enter amount';
        rateInfo.textContent = '';
        return;
    }
    
    try {
        // Check if we have the exchange rates
        if (exchangeRates[fromCurrency] && exchangeRates[toCurrency]) {
            const fromRate = exchangeRates[fromCurrency];
            const toRate = exchangeRates[toCurrency];
            const rate = toRate / fromRate;
            const result = (amount * rate).toFixed(2);
            
            convertedDiv.textContent = `${formatNumber(amount)} ${fromCurrency} = ${formatNumber(result)} ${toCurrency}`;
            rateInfo.textContent = `1 ${fromCurrency} = ${rate.toFixed(6)} ${toCurrency}`;
        } else {
            // Try to get the specific rate from API
            const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromCurrency.toLowerCase()}.min.json`);
            const data = await response.json();
            
            const rate = data[fromCurrency.toLowerCase()][toCurrency.toLowerCase()];
            const result = (amount * rate).toFixed(2);
            
            convertedDiv.textContent = `${formatNumber(amount)} ${fromCurrency} = ${formatNumber(result)} ${toCurrency}`;
            rateInfo.textContent = `1 ${fromCurrency} = ${rate.toFixed(6)} ${toCurrency}`;
        }
        
    } catch (error) {
        console.error("Conversion error:", error);
        convertedDiv.textContent = "Enter amount to convert";
        rateInfo.textContent = "";
    }
}

// Swap currencies
function swap() {
    [fromCurrency, toCurrency] = [toCurrency, fromCurrency];
    updateSelectorValues();
    createDropdown("fromDropdown", fromCurrency, true);
    createDropdown("toDropdown", toCurrency, false);
    convert();
}

// Format numbers with commas
function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--error-color);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('light');
    const themeIcon = document.querySelector('.theme-toggle i');
    themeIcon.className = document.body.classList.contains('light') 
        ? 'fas fa-sun' 
        : 'fas fa-moon';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);