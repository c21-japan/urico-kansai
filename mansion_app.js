import { MANSION_DB } from './mansion_db.js';

// Expose globally for non-module handlers if needed
window.MANSION_DB = MANSION_DB;

let mansionDatabase = [];
document.addEventListener('DOMContentLoaded', () => {
  mansionDatabase = MANSION_DB;
  displayTopMansions();
  setupSearchInput();
});

function displayTopMansions() {
  const container = document.getElementById('mansionsList');
  const loading = document.getElementById('loadingIndicator');
  if (!container || !loading) return;
  loading.style.display = 'none';
  const sortedMansions = [...mansionDatabase]
    .sort((a,b) => (b.buyers?.length||0) - (a.buyers?.length||0))
    .slice(0,20);

  container.innerHTML = sortedMansions.map(mansion => {
    const topBuyers = (mansion.buyers||[]).slice(0,2);
    const hot = (mansion.buyers||[]).length >= 8 ? '<div class="mansion-status">HOT</div>' : '';
    return `
      <div class="mansion-card" onclick="showBuyerDetails('${mansion.name.replace(/'/g, "\'")}')">
        ${hot}
        <div class="mansion-header">
          <h3 class="mansion-name">${mansion.name}</h3>
          <div class="mansion-address">📍 ${mansion.address || ''}</div>
        </div>
        <div class="mansion-body">
          <div class="hopefuls-highlight">
            <div class="hopefuls-number">${(mansion.buyers||[]).length}名</div>
            <div class="hopefuls-text">の購入希望者</div>
          </div>
          <div class="mansion-buyers-preview">
            <div class="buyers-preview-title">購入希望者（一部）</div>
            ${topBuyers.map(b => `
              <div class="buyer-preview">
                <span class="buyer-preview-price">${b.price || ''}</span>
                <span class="buyer-preview-info">${(b.family || '').toString()} / ${(b.occupation || '').toString()}</span>
              </div>
            `).join('')}
          </div>
          <button class="view-all-btn">全${(mansion.buyers||[]).length}名の詳細を見る</button>
        </div>
      </div>`;
  }).join('');
}

function setupSearchInput() {
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('searchSuggestions');
  if (!input || !suggestions) return;
  input.addEventListener('input', function() {
    const value = this.value.toLowerCase();
    if (value.length < 1) { suggestions.classList.remove('active'); return; }
    const matches = mansionDatabase.filter(m => (m.name||'').toLowerCase().includes(value)).slice(0,10);
    if (matches.length) {
      suggestions.innerHTML = matches.map(m => `
        <div class="suggestion-item" onclick="selectMansion('${m.name.replace(/'/g, "\'")}')">
          <span class="suggestion-name">${m.name}</span>
          <span class="suggestion-count">${(m.buyers||[]).length}名</span>
        </div>`).join('');
      suggestions.classList.add('active');
    } else {
      suggestions.classList.remove('active');
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-container')) suggestions.classList.remove('active');
  });
}

window.selectMansion = function(name){
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('searchSuggestions');
  if (input) input.value = name;
  if (suggestions) suggestions.classList.remove('active');
  showBuyerDetails(name);
}

window.searchMansions = function(){
  const searchTerm = document.getElementById('searchInput')?.value || '';
  if (!searchTerm) return;
  const mansion = mansionDatabase.find(m => (m.name||'').toLowerCase().includes(searchTerm.toLowerCase()));
  if (mansion) { showBuyerDetails(mansion.name); }
  else { alert('該当するマンションが見つかりません。無料査定でお探しします。'); location.href='/assessment.html'; }
}

window.showBuyerDetails = function(mansionName){
  const mansion = mansionDatabase.find(m => m.name === mansionName);
  if (!mansion) return;
  const title = document.getElementById('modalTitle');
  const subtitle = document.getElementById('modalSubtitle');
  const cards = document.getElementById('buyerCards');
  if (title) title.textContent = mansion.name;
  if (subtitle) subtitle.textContent = `${(mansion.buyers||[]).length}名の購入希望者`;
  if (cards) {
    cards.innerHTML = (mansion.buyers||[]).map((b, idx) => `
      <div class="buyer-card">
        ${idx === 0 ? '<div class="buyer-badge">最高額</div>' : ''}
        <div class="buyer-price">${b.price || ''}</div>
        <div class="buyer-details">
          <div class="buyer-detail"><span class="buyer-detail-icon">👨‍👩‍👧</span><span class="buyer-detail-text">${b.family || ''}</span></div>
          <div class="buyer-detail"><span class="buyer-detail-icon">💼</span><span class="buyer-detail-text">${b.occupation || ''}</span></div>
          <div class="buyer-detail"><span class="buyer-detail-icon">📅</span><span class="buyer-detail-text">${b.timing || ''}</span></div>
          <div class="buyer-detail"><span class="buyer-detail-icon">💳</span><span class="buyer-detail-text">${b.method || ''}</span></div>
          <div class="buyer-detail"><span class="buyer-detail-icon">🎯</span><span class="buyer-detail-text">${b.reason || ''}</span></div>
          <div class="buyer-detail"><span class="buyer-detail-icon">🎂</span><span class="buyer-detail-text">${b.age || ''}</span></div>
        </div>
        <button class="contact-buyer-btn" onclick="contactBuyer('${(b.id or idx)}')">この購入希望者に売却相談する</button>
      </div>`).join('');
  }
  document.getElementById('buyerModal')?.classList.add('active');
}

window.closeModal = function(){
  document.getElementById('buyerModal')?.classList.remove('active');
}

window.contactBuyer = function(buyerId){
  location.href = `/assessment.html?buyer=${buyerId}`;
}

// Enter key handler
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && document.activeElement?.id === 'searchInput') {
    window.searchMansions();
  }
});
