document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('request-form');
  const responseEl = document.getElementById('response');
  const methodEl = document.getElementById('method');
  const bodyEl = document.getElementById('body');
  const protocolEl = document.getElementById('protocol');
  const methodLabel = document.querySelector('label[for="method"]');
  const bodyLabel = document.querySelector('label[for="body"]');
  const copyBtn = document.getElementById('copy-response');
  const showHistoryBtn = document.getElementById('show-history');
  const historyListView = document.getElementById('history-list-view');
  const historyDetailView = document.getElementById('history-detail-view');
  const closeHistoryListBtn = document.getElementById('close-history-list');
  const exportHistoryBtn = document.getElementById('export-history');
  const historyList = document.getElementById('history-list');
  const backToListBtn = document.getElementById('back-to-list');
  const historyDetailContent = document.getElementById('history-detail-content');
  const mainForm = document.querySelector('.container > form');
  const resultDiv = document.getElementById('result');
  const h1 = document.querySelector('h1');

  // Auto-fill last input content
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('rpcSenderForm', (data) => {
      if (data && data.rpcSenderForm) {
        const f = data.rpcSenderForm;
        if (f.url) document.getElementById('url').value = f.url;
        if (f.body) bodyEl.value = f.body;
      }
      methodEl.dispatchEvent(new Event('change'));
    });
  }

  // Listen for changes in request URL and body, auto-save
  function saveForm() {
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
    const data = {
      url: document.getElementById('url').value,
      body: bodyEl.value
    };
    chrome.storage.local.set({ rpcSenderForm: data });
  }
  [document.getElementById('url'), bodyEl].forEach(el => {
    if (el) el.addEventListener('input', saveForm);
    if (el) el.addEventListener('change', saveForm);
  });

  // Toggle request body input availability based on HTTP method
  methodEl.addEventListener('change', function () {
    if (['POST', 'PUT', 'PATCH'].includes(methodEl.value)) {
      bodyEl.disabled = false;
      bodyEl.placeholder = 'JSON format, only POST/PUT/PATCH need';
    } else {
      bodyEl.disabled = true;
      bodyEl.value = '';
      bodyEl.placeholder = 'No need request body';
    }
  });
  methodEl.dispatchEvent(new Event('change'));

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    responseEl.textContent = 'Requesting...';
    const url = document.getElementById('url').value.trim();
    const method = methodEl.value;
    let body = bodyEl.value.trim();
    let options = { method };
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (body) {
        try {
          body = JSON.stringify(JSON.parse(body));
        } catch (err) {
          responseEl.textContent = 'Request body is not a valid JSON format!';
          return;
        }
        options.body = body;
        options.headers = { 'Content-Type': 'application/json' };
      } else {
        options.body = '';
        options.headers = { 'Content-Type': 'application/json' };
      }
    }
    // Save request history
    if (chrome && chrome.storage && chrome.storage.local) {
      const record = {
        url,
        method,
        body,
        time: new Date().toLocaleString()
      };
      chrome.storage.local.get('rpcSenderHistory', (data) => {
        let arr = data && data.rpcSenderHistory ? data.rpcSenderHistory : [];
        arr.push(record);
        // Keep at most 100 records
        if (arr.length > 100) arr = arr.slice(arr.length - 100);
        chrome.storage.local.set({ rpcSenderHistory: arr });
      });
    }
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      let resultText;
      if (contentType.includes('application/json')) {
        const json = await res.json();
        resultText = JSON.stringify(json, null, 2);
      } else {
        resultText = await res.text();
      }
      responseEl.textContent = resultText;
    } catch (err) {
      responseEl.textContent = 'Request failed: ' + err;
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const text = document.getElementById('response').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        });
      } else {
        // Compatibility handling
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
      }
    });
  }

  // Show history list view
  if (showHistoryBtn) {
    showHistoryBtn.addEventListener('click', function () {
      renderHistory();
      historyListView.style.display = 'flex';
      if (mainForm) mainForm.style.display = 'none';
      if (resultDiv) resultDiv.style.display = 'none';
      if (h1) h1.style.display = 'none';
      showHistoryBtn.style.display = 'none';
      historyDetailView.style.display = 'none';
    });
  }
  // Close history list view
  if (closeHistoryListBtn) {
    closeHistoryListBtn.addEventListener('click', function () {
      historyListView.style.display = 'none';
      if (mainForm) mainForm.style.display = '';
      if (resultDiv) resultDiv.style.display = '';
      if (h1) h1.style.display = '';
      showHistoryBtn.style.display = '';
    });
  }
  // Export history
  if (exportHistoryBtn) {
    exportHistoryBtn.addEventListener('click', async function () {
      if (!(chrome && chrome.storage && chrome.storage.local)) return;
      chrome.storage.local.get('rpcSenderHistory', (data) => {
        const arr = data && data.rpcSenderHistory ? data.rpcSenderHistory : [];
        const blob = new Blob([JSON.stringify(arr, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rpc_sender_history.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });
  }
  // Render history list
  function renderHistory() {
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
    chrome.storage.local.get('rpcSenderHistory', (data) => {
      const arr = data && data.rpcSenderHistory ? data.rpcSenderHistory : [];
      if (arr.length === 0) {
        historyList.innerHTML = '<div style="color:#999;text-align:center;">No history record</div>';
        return;
      }
      historyList.innerHTML = arr.slice().reverse().map((item, idx) =>
        `<div class="history-item" data-idx="${arr.length-1-idx}">
          <div><span class="history-url">${item.url}</span><span class="history-time">${item.time}</span></div>
          <div class="history-body">${item.body ? item.body : '<span style=\'color:#bbb\'>(No request body)</span>'}</div>
        </div>`
      ).join('');
      // Bind click events
      Array.from(document.querySelectorAll('.history-item')).forEach(el => {
        el.addEventListener('click', function () {
          const idx = parseInt(el.getAttribute('data-idx'));
          showHistoryDetail(idx);
        });
      });
    });
  }
  // Show history detail view
  function showHistoryDetail(idx) {
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
    chrome.storage.local.get('rpcSenderHistory', (data) => {
      const arr = data && data.rpcSenderHistory ? data.rpcSenderHistory : [];
      const item = arr[idx];
      if (!item) return;
      historyDetailContent.innerHTML =
        `<div><b>Request URL:</b><div style='color:#2563eb;word-break:break-all;'>${item.url}</div></div>
         <div style='margin-top:10px;'><b>Request method:</b>${item.method}</div>
         <div style='margin-top:10px;'><b>Request body:</b><pre style='background:#f4f6fb;padding:8px 10px;border-radius:6px;white-space:pre-wrap;word-break:break-all;'>${item.body ? item.body : '(No request body)'}</pre></div>
         <div style='margin-top:10px;'><b>Request time:</b>${item.time}</div>`;
      historyListView.style.display = 'none';
      historyDetailView.style.display = 'flex';
    });
  }
  // Return to history list view
  if (backToListBtn) {
    backToListBtn.addEventListener('click', function () {
      historyDetailView.style.display = 'none';
      historyListView.style.display = 'flex';
    });
  }
}); 