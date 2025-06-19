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

  // 自动填充上次内容
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

  // 监听请求地址和请求体变化，自动保存
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

  // 根据请求方法切换请求体输入框的可用状态
  methodEl.addEventListener('change', function () {
    if (['POST', 'PUT', 'PATCH'].includes(methodEl.value)) {
      bodyEl.disabled = false;
      bodyEl.placeholder = 'JSON格式，仅POST/PUT/PATCH需要';
    } else {
      bodyEl.disabled = true;
      bodyEl.value = '';
      bodyEl.placeholder = '无需请求体';
    }
  });
  methodEl.dispatchEvent(new Event('change'));

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    responseEl.textContent = '请求中...';
    const url = document.getElementById('url').value.trim();
    const method = methodEl.value;
    let body = bodyEl.value.trim();
    let options = { method };
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (body) {
        try {
          body = JSON.stringify(JSON.parse(body));
        } catch (err) {
          responseEl.textContent = '请求体不是有效的JSON格式！';
          return;
        }
        options.body = body;
        options.headers = { 'Content-Type': 'application/json' };
      } else {
        options.body = '';
        options.headers = { 'Content-Type': 'application/json' };
      }
    }
    // 保存历史
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
        // 最多保存100条
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
      responseEl.textContent = '请求失败：' + err;
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const text = document.getElementById('response').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '已复制';
          setTimeout(() => { copyBtn.textContent = '复制'; }, 1200);
        });
      } else {
        // 兼容性处理
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyBtn.textContent = '已复制';
        setTimeout(() => { copyBtn.textContent = '复制'; }, 1200);
      }
    });
  }

  // 显示历史list界面
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
  // 关闭历史list界面
  if (closeHistoryListBtn) {
    closeHistoryListBtn.addEventListener('click', function () {
      historyListView.style.display = 'none';
      if (mainForm) mainForm.style.display = '';
      if (resultDiv) resultDiv.style.display = '';
      if (h1) h1.style.display = '';
      showHistoryBtn.style.display = '';
    });
  }
  // 导出历史
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
  // 渲染历史列表
  function renderHistory() {
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
    chrome.storage.local.get('rpcSenderHistory', (data) => {
      const arr = data && data.rpcSenderHistory ? data.rpcSenderHistory : [];
      if (arr.length === 0) {
        historyList.innerHTML = '<div style="color:#999;text-align:center;">暂无历史记录</div>';
        return;
      }
      historyList.innerHTML = arr.slice().reverse().map((item, idx) =>
        `<div class="history-item" data-idx="${arr.length-1-idx}">
          <div><span class="history-url">${item.url}</span><span class="history-time">${item.time}</span></div>
          <div class="history-body">${item.body ? item.body : '<span style=\'color:#bbb\'>(无请求体)</span>'}</div>
        </div>`
      ).join('');
      // 绑定点击事件
      Array.from(document.querySelectorAll('.history-item')).forEach(el => {
        el.addEventListener('click', function () {
          const idx = parseInt(el.getAttribute('data-idx'));
          showHistoryDetail(idx);
        });
      });
    });
  }
  // 显示历史详情界面
  function showHistoryDetail(idx) {
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
    chrome.storage.local.get('rpcSenderHistory', (data) => {
      const arr = data && data.rpcSenderHistory ? data.rpcSenderHistory : [];
      const item = arr[idx];
      if (!item) return;
      historyDetailContent.innerHTML =
        `<div><b>请求地址：</b><div style='color:#2563eb;word-break:break-all;'>${item.url}</div></div>
         <div style='margin-top:10px;'><b>请求方法：</b>${item.method}</div>
         <div style='margin-top:10px;'><b>请求体：</b><pre style='background:#f4f6fb;padding:8px 10px;border-radius:6px;white-space:pre-wrap;word-break:break-all;'>${item.body ? item.body : '(无请求体)'}</pre></div>
         <div style='margin-top:10px;'><b>请求时间：</b>${item.time}</div>`;
      historyListView.style.display = 'none';
      historyDetailView.style.display = 'flex';
    });
  }
  // 返回历史list界面
  if (backToListBtn) {
    backToListBtn.addEventListener('click', function () {
      historyDetailView.style.display = 'none';
      historyListView.style.display = 'flex';
    });
  }
}); 