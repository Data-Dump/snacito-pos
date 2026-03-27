/* ============================================================
   SNACITO POS — Shared Application Logic
   ============================================================

   Supabase Setup Required:
   ─────────────────────────
   Create a table called `pos_orders` in your Supabase dashboard:

   CREATE TABLE pos_orders (
     id bigint generated always as identity primary key,
     token text not null,
     items jsonb not null default '[]',
     customer_name text default '',
     note text default '',
     status text not null default 'new',
     total integer not null default 0,
     created_at timestamptz not null default now()
   );

   -- Enable Realtime for live kitchen updates:
   ALTER PUBLICATION supabase_realtime ADD TABLE pos_orders;

   ============================================================ */

// ─── Admin Auth ───
const POS_ADMIN_PASSWORD = 'snacito2026';

(function initAuth() {
  if (localStorage.getItem('snk_pos_auth') === 'true') {
    return;
  }

  // Create login overlay that covers the entire screen
  const overlay = document.createElement('div');
  overlay.id = 'pos-login-overlay';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:#0d0906;z-index:9999;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk','Inter',sans-serif;">
      <div style="background:#1a120d;border:2px solid #2a1a0f;border-radius:20px;padding:40px 36px;max-width:380px;width:90vw;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>
        <div style="font-size:1.3rem;font-weight:800;color:#d4a017;margin-bottom:4px;">SNACITO POS</div>
        <div style="font-size:0.8rem;color:#8a7560;margin-bottom:24px;">Enter admin password to continue</div>
        <input type="password" id="pos-login-pw" placeholder="Password" autocomplete="off"
          style="width:100%;padding:14px 18px;background:#0d0906;border:1.5px solid #2a1a0f;border-radius:12px;color:#fff;font-size:1rem;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:12px;text-align:center;letter-spacing:2px;" />
        <div id="pos-login-error" style="color:#e74c3c;font-size:0.78rem;margin-bottom:12px;min-height:1.2em;"></div>
        <button id="pos-login-btn"
          style="width:100%;padding:14px;background:linear-gradient(135deg,#d4a017,#b8860b);color:#1a120d;font-weight:800;font-size:1rem;border:none;border-radius:12px;cursor:pointer;font-family:inherit;transition:0.2s;">
          Unlock →
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const pwInput = document.getElementById('pos-login-pw');
  const loginBtn = document.getElementById('pos-login-btn');
  const errorEl = document.getElementById('pos-login-error');

  function tryLogin() {
    const pw = pwInput.value.trim();
    if (pw === POS_ADMIN_PASSWORD) {
      localStorage.setItem('snk_pos_auth', 'true');
      overlay.remove();
    } else {
      errorEl.textContent = 'Wrong password. Try again.';
      pwInput.value = '';
      pwInput.style.borderColor = '#e74c3c';
      setTimeout(() => { pwInput.style.borderColor = '#2a1a0f'; }, 1500);
    }
  }

  loginBtn.addEventListener('click', tryLogin);
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  setTimeout(() => pwInput.focus(), 100);
})();

function logoutPos() {
  localStorage.removeItem('snk_pos_auth');
  location.reload();
}

// ─── Supabase Config (reused from main site) ───
const SUPABASE_URL = 'https://iezszlgxyqizdqazrner.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Wy7qNiMG3d_GXmes2-htUw_TKkFi611';

// ─── Menu Data ───
const MENU = {
  categories: [
    {
      id: 'momos',
      name: 'MOMOS (8 pcs)',
      icon: '🥟',
      items: [
        { id: 'momos-steam', name: 'Steam Momos', sub: '8 pcs', price: 59, badge: 'Recommended' },
        { id: 'momos-fried', name: 'Fried Momos', sub: '8 pcs', price: 79, badge: null },
        { id: 'momos-tandoori', name: 'Tandoori Fried', sub: '8 pcs', price: 99, badge: 'Premium' },
        { id: 'momos-chipotle', name: 'Chipotle Fried', sub: '8 pcs', price: 99, badge: null }
      ]
    },
    {
      id: 'maggi',
      name: 'MAGGI',
      icon: '🍜',
      items: [
        { id: 'maggi-classic', name: 'Classic Maggi', sub: '', price: 39, badge: null },
        { id: 'maggi-double', name: 'Double Masala', sub: '', price: 49, badge: 'Recommended' },
        { id: 'maggi-cheese', name: 'Cheese Maggi', sub: '', price: 59, badge: null },
        { id: 'maggi-cheese-garlic', name: 'Cheese Garlic', sub: '', price: 69, badge: 'Recommended' }
      ]
    },
    {
      id: 'chaat',
      name: 'BYOB (Chips Chaat Base)',
      icon: '🍟',
      items: [
        {
          id: 'chaat-bag',
          name: 'Base Veggies Bag',
          sub: 'with Pyaz & Tamatar',
          price: 39,
          badge: 'MANDATORY MODIFIER',
          hasFlavours: true,
          flavours: [
            { name: 'Blue Lays', price: 0 },
            { name: 'OG Kurkure', price: 0 },
            { name: 'Doritos', price: 10 }
          ],
          hasAddons: true,
          addons: [
            { name: 'Chipotle Sauce', price: 15 },
            { name: 'Tandoori Sauce', price: 15 },
            { name: 'Chilli Garlic Sause', price: 15 },
            { name: 'Mayo', price: 15 },
            { name: 'Melted Cheese', price: 15 }
          ]
        }
      ]
    },
    {
      id: 'drinks',
      name: 'NIMBU PANI',
      icon: '🥤',
      items: [
        { id: 'nimbu-pani-soda', name: 'With Soda', sub: 'Fizzy & Refreshing', price: 20, badge: null },
        { id: 'nimbu-pani', name: 'Without Soda', sub: 'Chilled & Refreshing', price: 15, badge: null }
      ]
    }
  ]
};

// ─── Token Generator (serial from Supabase, format: SNK-DDMM-NNNN) ───
async function generateToken() {
  const now = new Date();
  const dateStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0');
  let maxNum = parseInt(localStorage.getItem('snk_order_counter') || '3569', 10);

  try {
    // Fetch latest tokens from both tables to find the highest number
    const [posOrders, onlineOrders] = await Promise.all([
      supabaseSelect('pos_orders', 'select=token&order=id.desc&limit=20').catch(() => []),
      supabaseSelect('orders', 'select=order_id&order=id.desc&limit=20').catch(() => [])
    ]);

    // Extract numbers from POS tokens (SNK-DDMM-NNNN)
    posOrders.forEach(o => {
      const m = (o.token || '').match(/SNK-\d{4}-(\d+)/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });

    // Extract numbers from online order IDs (SNK-DDMM-NNNN)
    onlineOrders.forEach(o => {
      const m = (o.order_id || '').match(/SNK-\d{4}-(\d+)/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
  } catch (e) {
    console.warn('[Token] Supabase fetch failed, using local counter');
  }

  const nextNum = maxNum + 1;
  localStorage.setItem('snk_order_counter', String(nextNum));
  return 'SNK-' + dateStr + '-' + nextNum;
}

// ─── Supabase REST Helpers ───
const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Insert failed: ${res.status}`);
  const json = await res.json();
  return json[0] || json;
}

async function supabaseSelect(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Select failed: ${res.status}`);
  return res.json();
}

async function supabaseUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: supabaseHeaders,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json();
}

// ─── Supabase Realtime (SSE-based via PostgREST) ───
// Using Supabase Realtime via WebSocket

class RealtimeSubscription {
  constructor(table, callback) {
    this.table = table;
    this.callback = callback;
    this.ws = null;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    this.ref = 0;
    this.connect();
  }

  connect() {
    const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    this.ws = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`);

    this.ws.onopen = () => {
      console.log('[Realtime] Connected');
      // Join channel
      this.send({
        topic: `realtime:public:${this.table}`,
        event: 'phx_join',
        payload: { config: { broadcast: { self: true }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table: this.table }] } },
        ref: String(++this.ref)
      });

      // Heartbeat
      this.heartbeatInterval = setInterval(() => {
        this.send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++this.ref) });
      }, 30000);
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === 'postgres_changes') {
          this.callback(msg.payload);
        }
      } catch (err) { /* ignore parse errors */ }
    };

    this.ws.onclose = () => {
      console.log('[Realtime] Disconnected, reconnecting in 3s...');
      clearInterval(this.heartbeatInterval);
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('[Realtime] Error:', err);
      this.ws.close();
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  destroy() {
    clearInterval(this.heartbeatInterval);
    clearTimeout(this.reconnectTimeout);
    if (this.ws) this.ws.close();
  }
}

// ─── Sound Notification ───
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05 + i * 0.08);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5 + i * 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.6 + i * 0.08);
    });
  } catch (e) { /* Audio not available */ }
}

// ─── Clock ───
function startClock(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  function update() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }
  update();
  setInterval(update, 1000);
}

// ─── Toast ───
function showToast(message, icon = '✅') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── WhatsApp Toast Notifications ───
function showWaToast(title, sub, waLink) {
  let container = document.getElementById('wa-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'wa-toast-container';
    container.className = 'wa-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'wa-toast';
  
  let linkHtml = '';
  if (waLink) {
    linkHtml = `<a class="wa-toast-btn" href="${waLink}" target="_blank">💬 Send Message</a>`;
  }

  toast.innerHTML = `
    <button class="wa-toast-close">&times;</button>
    <div class="wa-toast-header">
      <div class="wa-toast-icon">📱</div>
      <div class="wa-toast-title">${title}</div>
    </div>
    <div class="wa-toast-sub">${sub}</div>
    ${linkHtml}
  `;

  toast.querySelector('.wa-toast-close').addEventListener('click', () => {
    toast.style.animation = 'slideOutRight 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);
  playNotificationSound();
}

// ─── Time Ago ───
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Polling fallback (if Realtime not available) ───
class PollingSubscription {
  constructor(table, callback, intervalMs = 3000) {
    this.table = table;
    this.callback = callback;
    this.intervalMs = intervalMs;
    this.lastId = 0;
    this.timer = null;
    this.start();
  }

  async start() {
    // Initial load
    try {
      const orders = await supabaseSelect(this.table, 'select=*');
      if (orders.length > 0) {
        this.lastId = Math.max(...orders.map(o => o.id));
      }
      // Send all existing as initial state
      orders.forEach(o => this.callback({ data: { type: 'INSERT', record: o, old_record: null }, ids: [o.id] }));
    } catch (e) {
      console.error('[Polling] Initial load failed:', e);
    }

    // Start polling
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  async poll() {
    try {
      const orders = await supabaseSelect(this.table, 'select=*');
      orders.forEach(order => {
        if (order.id > this.lastId) {
          this.lastId = order.id;
          this.callback({ data: { type: 'INSERT', record: order, old_record: null }, ids: [order.id] });
        }
      });
    } catch (e) { /* silently retry */ }
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

// ─── Smart Subscription (tries Realtime, falls back to polling) ───
function subscribeToOrders(table, callback) {
  // Try Realtime first, use polling as the primary reliable method
  // Supabase Realtime requires the table to be in the publication
  // Using polling for reliability
  return new PollingSubscription(table, callback, 2000);
}
