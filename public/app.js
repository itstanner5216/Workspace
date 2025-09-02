// Client-side JavaScript for Jack Portal

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Update notification
function showUpdateNotification() {
  const updateCard = document.createElement('div');
  updateCard.className = 'update-notification';
  updateCard.innerHTML = `
    <div class="update-card">
      <h3>Update Available</h3>
      <p>A new version of Jack Portal is available. Refresh to update.</p>
      <div class="update-actions">
        <button class="update-button" onclick="location.reload()">Update Now</button>
        <button class="update-later" onclick="this.parentElement.parentElement.parentElement.remove()">Later</button>
      </div>
    </div>
  `;
  document.body.appendChild(updateCard);
}

// DOM elements
const searchForm = document.getElementById('searchForm');
const qInput = document.getElementById('q');
const modeSel = document.getElementById('modeSel');
const modeChips = document.getElementById('modeChips');
const freshSel = document.getElementById('freshSel');
const limitInput = document.getElementById('limit');
const durationInput = document.getElementById('duration');
const siteInput = document.getElementById('site');
const hostModeSel = document.getElementById('hostModeSel');
const durationModeSel = document.getElementById('durationModeSel');
const showThumbsCheckbox = document.getElementById('showThumbs');
const goBtn = document.getElementById('goBtn');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const dbgBtn = document.getElementById('dbgBtn');
const resultsDiv = document.getElementById('results');
const statusDiv = document.getElementById('status');
const debugDiv = document.getElementById('debug');
const errorContainer = document.getElementById('error-container');
const searchProgress = document.getElementById('search-progress');
const progressBar = document.getElementById('progress-bar');
const recentSearchesDiv = document.getElementById('recent-searches');
const recentSearchesChips = document.getElementById('recent-searches-chips');
const checkUpdatesBtn = document.getElementById('checkUpdates');

// State
let currentSearch = null;
let isOnline = navigator.onLine;
let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
let savedDefaults = JSON.parse(localStorage.getItem('savedDefaults') || '{}');
let offlineResults = JSON.parse(localStorage.getItem('offlineResults') || '[]');

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Online/offline detection
window.addEventListener('online', () => {
  isOnline = true;
  showToast('Back online', 'online');
  updateOfflineBanner();
});

window.addEventListener('offline', () => {
  isOnline = false;
  showToast('You are offline', 'offline');
  updateOfflineBanner();
});

// Initialize app
function init() {
  loadDefaults();
  setupEventListeners();
  updateRecentSearches();
  updateOfflineBanner();
  checkForUpdates();
  
  // Voice search setup
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    setupVoiceSearch();
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

// Load saved defaults
function loadDefaults() {
  if (savedDefaults.q) qInput.value = savedDefaults.q;
  if (savedDefaults.mode) {
    modeSel.value = savedDefaults.mode;
    updateModeChips(savedDefaults.mode);
  }
  if (savedDefaults.fresh) freshSel.value = savedDefaults.fresh;
  if (savedDefaults.limit) limitInput.value = savedDefaults.limit;
  if (savedDefaults.duration) durationInput.value = savedDefaults.duration;
  if (savedDefaults.site) siteInput.value = savedDefaults.site;
  if (savedDefaults.hostMode) hostModeSel.value = savedDefaults.hostMode;
  if (savedDefaults.durationMode) durationModeSel.value = savedDefaults.durationMode;
  if (savedDefaults.showThumbs !== undefined) showThumbsCheckbox.checked = savedDefaults.showThumbs;
}

// Setup event listeners
function setupEventListeners() {
  searchForm.addEventListener('submit', handleSearch);
  copyBtn.addEventListener('click', copyResults);
  saveBtn.addEventListener('click', saveDefaults);
  resetBtn.addEventListener('click', resetForm);
  dbgBtn.addEventListener('click', toggleDebug);
  checkUpdatesBtn.addEventListener('click', checkForUpdates);
  
  // Mode chips
  modeChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      const mode = e.target.dataset.mode;
      modeSel.value = mode;
      updateModeChips(mode);
    }
  });
  
  // Keyboard navigation for chips
  modeChips.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.target.click();
    }
  });
  
  // Recent searches
  recentSearchesChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      const query = e.target.textContent;
      qInput.value = query;
      handleSearch(new Event('submit'));
    }
  });
  
  // Input validation
  qInput.addEventListener('input', () => {
    const clearBtn = document.querySelector('.search-clear');
    if (clearBtn) {
      clearBtn.style.display = qInput.value ? 'block' : 'none';
    }
  });
  
  // Clear search
  const clearBtn = document.createElement('button');
  clearBtn.className = 'search-clear';
  clearBtn.innerHTML = '';
  clearBtn.addEventListener('click', () => {
    qInput.value = '';
    qInput.focus();
    clearBtn.style.display = 'none';
  });
  qInput.parentElement.appendChild(clearBtn);
}

// Update mode chips
function updateModeChips(selectedMode) {
  const chips = modeChips.querySelectorAll('.chip');
  chips.forEach(chip => {
    if (chip.dataset.mode === selectedMode) {
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
    } else {
      chip.classList.remove('active');
      chip.setAttribute('aria-checked', 'false');
    }
  });
}

// Handle search
async function handleSearch(e) {
  e.preventDefault();
  
  const query = qInput.value.trim();
  if (!query) {
    showError('Please enter a search query');
    return;
  }
  
  if (!isOnline) {
    showOfflineResults(query);
    return;
  }
  
  // Cancel previous search
  if (currentSearch) {
    currentSearch.abort();
  }
  
  currentSearch = new AbortController();
  
  try {
    showProgress();
    hideError();
    
    const params = new URLSearchParams({
      q: query,
      mode: modeSel.value,
      fresh: freshSel.value,
      limit: limitInput.value,
      duration: durationInput.value,
      site: siteInput.value,
      hostMode: hostModeSel.value,
      durationMode: durationModeSel.value,
      showThumbs: showThumbsCheckbox.checked
    });
    
    const response = await fetch(`/api/search?${params}`, {
      signal: currentSearch.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    displayResults(data.results || []);
    updateStatus(`Found ${data.results?.length || 0} results`);
    addToRecentSearches(query);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      updateStatus('Search cancelled');
    } else {
      showError(error.message);
      updateStatus('Search failed');
    }
  } finally {
    hideProgress();
    currentSearch = null;
  }
}

// Display results
function displayResults(results) {
  resultsDiv.innerHTML = '';
  
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="panel">No results found</div>';
    return;
  }
  
  results.forEach((result, index) => {
    const card = createResultCard(result);
    resultsDiv.appendChild(card);
    
    // Animate in
    setTimeout(() => {
      card.classList.add('visible');
    }, index * 50);
  });
}

// Create result card
function createResultCard(result) {
  const card = document.createElement('div');
  card.className = 'card';
  
  const thumb = showThumbsCheckbox.checked && result.thumbnail ?
    `<img class="thumb" src="${result.thumbnail}" alt="${result.title}" loading="lazy">` : '';
  
  card.innerHTML = `
    ${thumb}
    <div class="title">${result.title}</div>
    <div class="meta">${result.site}  ${result.date || 'Unknown date'}</div>
    <a class="link" href="${result.url}" target="_blank" rel="noopener">${result.url}</a>
  `;
  
  return card;
}

// Show progress
function showProgress() {
  searchProgress.classList.add('active');
  progressBar.style.width = '0%';
  updateStatus('Searching...');
  
  // Simulate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    progressBar.style.width = `${progress}%`;
    
    if (!currentSearch) {
      clearInterval(interval);
    }
  }, 200);
}

// Hide progress
function hideProgress() {
  searchProgress.classList.remove('active');
  progressBar.style.width = '100%';
}

// Show error
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.add('show');
}

// Hide error
function hideError() {
  errorContainer.classList.remove('show');
}

// Update status
function updateStatus(text) {
  statusDiv.textContent = text;
}

// Copy results
function copyResults() {
  const results = Array.from(resultsDiv.querySelectorAll('.card')).map(card => {
    const title = card.querySelector('.title').textContent;
    const link = card.querySelector('.link').href;
    return `${title}\n${link}\n`;
  }).join('\n');
  
  if (results) {
    navigator.clipboard.writeText(results).then(() => {
      showToast('Results copied to clipboard');
    });
  }
}

// Save defaults
function saveDefaults() {
  savedDefaults = {
    q: qInput.value,
    mode: modeSel.value,
    fresh: freshSel.value,
    limit: limitInput.value,
    duration: durationInput.value,
    site: siteInput.value,
    hostMode: hostModeSel.value,
    durationMode: durationModeSel.value,
    showThumbs: showThumbsCheckbox.checked
  };
  
  localStorage.setItem('savedDefaults', JSON.stringify(savedDefaults));
  showToast('Defaults saved');
}

// Reset form
function resetForm() {
  qInput.value = '';
  modeSel.value = 'niche';
  updateModeChips('niche');
  freshSel.value = 'd7';
  limitInput.value = '10';
  durationInput.value = '';
  siteInput.value = '';
  hostModeSel.value = 'normal';
  durationModeSel.value = 'normal';
  showThumbsCheckbox.checked = true;
  hideError();
  resultsDiv.innerHTML = '';
  updateStatus('Form reset');
}

// Toggle debug
function toggleDebug() {
  debugDiv.classList.toggle('show');
  if (debugDiv.classList.contains('show')) {
    debugDiv.textContent = JSON.stringify({
      isOnline,
      recentSearches,
      savedDefaults,
      offlineResults: offlineResults.length
    }, null, 2);
  }
}

// Add to recent searches
function addToRecentSearches(query) {
  recentSearches = recentSearches.filter(q => q !== query);
  recentSearches.unshift(query);
  recentSearches = recentSearches.slice(0, 5);
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  updateRecentSearches();
}

// Update recent searches
function updateRecentSearches() {
  recentSearchesChips.innerHTML = '';
  recentSearches.forEach(query => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = query;
    recentSearchesChips.appendChild(chip);
  });
  
  if (recentSearches.length > 0) {
    recentSearchesDiv.classList.add('show');
  } else {
    recentSearchesDiv.classList.remove('show');
  }
}

// Show offline results
function showOfflineResults(query) {
  const matching = offlineResults.filter(result =>
    result.title.toLowerCase().includes(query.toLowerCase()) ||
    result.url.toLowerCase().includes(query.toLowerCase())
  );
  
  displayResults(matching);
  updateStatus(`Offline: ${matching.length} cached results`);
}

// Update offline banner
function updateOfflineBanner() {
  const existing = document.querySelector('.offline-banner');
  if (existing) existing.remove();
  
  if (!isOnline) {
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.innerHTML = `
      <span></span>
      <span>You are currently offline. Some features may not work.</span>
    `;
    document.querySelector('main').prepend(banner);
  }
}

// Show toast
function showToast(message, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}-toast`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Voice search
function setupVoiceSearch() {
  const voiceBtn = document.createElement('button');
  voiceBtn.className = 'voice-search';
  voiceBtn.innerHTML = '';
  voiceBtn.title = 'Voice search';
  qInput.parentElement.appendChild(voiceBtn);
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  voiceBtn.addEventListener('click', () => {
    recognition.start();
    voiceBtn.classList.add('listening');
  });
  
  recognition.addEventListener('result', (event) => {
    const transcript = event.results[0][0].transcript;
    qInput.value = transcript;
    voiceBtn.classList.remove('listening');
  });
  
  recognition.addEventListener('end', () => {
    voiceBtn.classList.remove('listening');
  });
  
  recognition.addEventListener('error', () => {
    voiceBtn.classList.remove('listening');
    showToast('Voice recognition failed');
  });
}

// Keyboard shortcuts
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    qInput.focus();
  }
  
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    goBtn.click();
  }
}

// Check for updates
function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.update();
      }
    });
  }
}
