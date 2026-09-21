// ============================================================
// NearDrop - Frontend Application
// ============================================================

'use strict';

// ------------------------------------------------------------
// Socket.IO
// ------------------------------------------------------------

const socket = io();

// ------------------------------------------------------------
// DOM ELEMENTS
// ------------------------------------------------------------

const statusElement = document.getElementById('status');

const deviceNameInput = document.getElementById('deviceName');

const connectBtn = document.getElementById('connectBtn');

const targetSelect = document.getElementById('target');

const textInput = document.getElementById('text');

const sendTextBtn = document.getElementById('sendText');

const fileInput = document.getElementById('fileInput');

const selectedFilesElement = document.getElementById('selectedFiles');

const sendFilesBtn = document.getElementById('sendFiles');

const uploadProgress = document.getElementById('uploadProgress');

const progressBar = document.getElementById('progressBar');

const progressText = document.getElementById('progressText');

const incomingElement = document.getElementById('incoming');

const devicesElement = document.getElementById('devices');

const qrCodeElement = document.getElementById('qr-code');

const serverUrlElement = document.getElementById('serverUrl');

const dropZone = document.getElementById('dropZone');

// ------------------------------------------------------------
// STORAGE KEYS
// ------------------------------------------------------------

const DEVICE_ID_KEY = 'neardrop-device-id';

const DEVICE_NAME_KEY = 'neardrop-device-name';

// ------------------------------------------------------------
// DEVICE ID
// ------------------------------------------------------------

function generateDeviceId() {
  // Use crypto.randomUUID when available
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback for browsers where randomUUID is unavailable
  return (
    'device-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 12) +
    '-' +
    Math.random().toString(36).substring(2, 12)
  );
}

let deviceId = localStorage.getItem(DEVICE_ID_KEY);

// Handle old/invalid IDs
if (!deviceId || deviceId === 'null' || deviceId === 'undefined') {
  deviceId = generateDeviceId();

  localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

console.log('NearDrop Device ID:', deviceId);

// ------------------------------------------------------------
// DEVICE NAME
// ------------------------------------------------------------

function getDefaultDeviceName() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (
    userAgent.includes('android') ||
    userAgent.includes('iphone') ||
    userAgent.includes('ipad')
  ) {
    return 'My Phone';
  }

  return 'My PC';
}

const savedDeviceName = localStorage.getItem(DEVICE_NAME_KEY);

if (deviceNameInput) {
  deviceNameInput.value = savedDeviceName || getDefaultDeviceName();
}

// ------------------------------------------------------------
// ESCAPE HTML
// ------------------------------------------------------------

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ------------------------------------------------------------
// STATUS
// ------------------------------------------------------------

function setStatus(text, type = 'offline') {
  if (!statusElement) {
    return;
  }

  statusElement.className =
    'status inline-flex items-center gap-2 ' +
    'px-4 py-2 rounded-full glass ' +
    'text-sm';

  let dotClass = 'w-2.5 h-2.5 rounded-full';

  if (type === 'online') {
    dotClass += ' bg-emerald-400';
  } else if (type === 'connecting') {
    dotClass += ' bg-yellow-400 animate-pulse';
  } else {
    dotClass += ' bg-red-400';
  }

  statusElement.innerHTML = `
    <span class="${dotClass}"></span>
    <span>${escapeHtml(text)}</span>
  `;
}

// Initial status
setStatus('Connecting...', 'connecting');

// ------------------------------------------------------------
// REGISTER DEVICE
// ------------------------------------------------------------

function registerDevice() {
  if (!socket.connected) {
    return;
  }

  const name = deviceNameInput?.value.trim() || getDefaultDeviceName();

  localStorage.setItem(DEVICE_NAME_KEY, name);

  console.log('Registering device:', {
    deviceId,
    name,
  });

  socket.emit('register', {
    deviceId,
    name,
  });
}

// ------------------------------------------------------------
// CONNECT BUTTON
// ------------------------------------------------------------

if (connectBtn) {
  connectBtn.addEventListener('click', () => {
    registerDevice();

    connectBtn.textContent = 'Connected';

    setTimeout(() => {
      connectBtn.textContent = 'Connect';
    }, 1500);
  });
}

// ------------------------------------------------------------
// SOCKET CONNECT
// ------------------------------------------------------------

socket.on('connect', () => {
  console.log('Connected to NearDrop server');

  setStatus('Connected', 'online');

  registerDevice();
});

// ------------------------------------------------------------
// SOCKET DISCONNECT
// ------------------------------------------------------------

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);

  setStatus('Disconnected', 'offline');
});

// ------------------------------------------------------------
// SOCKET ERROR
// ------------------------------------------------------------

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);

  setStatus('Connection failed', 'offline');
});

// ------------------------------------------------------------
// CONNECTED DEVICES
// ------------------------------------------------------------

socket.on('devices', (devices) => {
  console.log('DEVICES RECEIVED:', devices);

  if (!Array.isArray(devices)) {
    return;
  }

  // --------------------------------------------------------
  // Remove current device
  // --------------------------------------------------------

  const otherDevices = devices.filter((device) => device.id !== deviceId);

  // --------------------------------------------------------
  // Update target dropdown
  // --------------------------------------------------------

  if (targetSelect) {
    targetSelect.innerHTML = '';

    if (otherDevices.length === 0) {
      const option = document.createElement('option');

      option.value = '';

      option.textContent = 'No other device connected';

      targetSelect.appendChild(option);
    } else {
      otherDevices.forEach((device) => {
        const option = document.createElement('option');

        option.value = device.id;

        option.textContent = device.name || 'Unknown Device';

        targetSelect.appendChild(option);
      });
    }
  }

  // --------------------------------------------------------
  // Update connected device cards
  // --------------------------------------------------------

  if (!devicesElement) {
    return;
  }

  if (otherDevices.length === 0) {
    devicesElement.innerHTML = `
        <div
          class="
            text-center
            py-8
            text-slate-500
          "
        >

          <div class="text-3xl mb-3">
            📡
          </div>

          <p class="text-sm">
            No other devices connected.
          </p>

        </div>
      `;

    return;
  }

  devicesElement.innerHTML = otherDevices
    .map((device) => {
      return `
              <div
                class="
                  flex items-center gap-3
                  p-3 rounded-xl
                  bg-white/5
                  border border-white/5
                  hover:bg-white/10
                  transition
                "
              >

                <div
                  class="
                    w-10 h-10
                    rounded-xl
                    bg-indigo-500/10
                    flex items-center
                    justify-center
                    text-lg
                  "
                >
                  📱
                </div>


                <div
                  class="
                    flex-1
                    min-w-0
                  "
                >

                  <div
                    class="
                      font-medium
                      truncate
                    "
                  >
                    ${escapeHtml(device.name || 'Unknown Device')}
                  </div>


                  <div
                    class="
                      text-xs
                      text-emerald-400
                      mt-0.5
                    "
                  >
                    ● Connected
                  </div>

                </div>

              </div>
            `;
    })
    .join('');
});

// ============================================================
// TABS
// ============================================================

const tabs = document.querySelectorAll('.tab');

const textPanel = document.getElementById('textPanel');

const filesPanel = document.getElementById('filesPanel');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selectedTab = tab.dataset.tab;

    // Remove active from all
    tabs.forEach((item) => {
      item.classList.remove('active', 'bg-white/10', 'text-white');

      item.classList.add('text-slate-400');
    });

    // Activate clicked tab

    tab.classList.add('active', 'bg-white/10', 'text-white');

    tab.classList.remove('text-slate-400');

    if (selectedTab === 'text') {
      textPanel?.classList.remove('hidden');

      filesPanel?.classList.add('hidden');
    } else {
      textPanel?.classList.add('hidden');

      filesPanel?.classList.remove('hidden');
    }
  });
});

// ============================================================
// SEND TEXT
// ============================================================

if (sendTextBtn) {
  sendTextBtn.addEventListener('click', () => {
    const text = textInput?.value.trim();

    const targetId = targetSelect?.value;

    // Validation

    if (!targetId) {
      alert('Please select a device.');

      return;
    }

    if (!text) {
      alert('Please enter some text.');

      return;
    }

    console.log('Sending text:', {
      targetId,
      text,
    });

    socket.emit('send-text', {
      targetId,
      text,
    });

    // Clear input

    textInput.value = '';

    // Button feedback

    const originalText = sendTextBtn.textContent;

    sendTextBtn.textContent = '✓ Sent';

    setTimeout(() => {
      sendTextBtn.textContent = originalText;
    }, 1500);
  });
}

// ============================================================
// FILE SELECTION
// ============================================================

let selectedFiles = [];

if (fileInput) {
  fileInput.addEventListener('change', () => {
    selectedFiles = Array.from(fileInput.files);

    renderSelectedFiles();
  });
}

// ============================================================
// DRAG & DROP
// ============================================================

if (dropZone && fileInput) {
  // Click

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag enter / over

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      event.stopPropagation();

      dropZone.classList.add('drag-over');
    });
  });

  // Drag leave

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      event.stopPropagation();

      dropZone.classList.remove('drag-over');
    });
  });

  // Drop

  dropZone.addEventListener('drop', (event) => {
    const files = event.dataTransfer.files;

    if (!files || files.length === 0) {
      return;
    }

    try {
      const dataTransfer = new DataTransfer();

      // Add existing selected files
      selectedFiles.forEach((file) => {
        dataTransfer.items.add(file);
      });

      // Add dropped files

      for (const file of files) {
        dataTransfer.items.add(file);
      }

      fileInput.files = dataTransfer.files;

      selectedFiles = Array.from(fileInput.files);

      renderSelectedFiles();
    } catch (error) {
      console.error('Drop error:', error);
    }
  });
}

// ============================================================
// RENDER SELECTED FILES
// ============================================================

function renderSelectedFiles() {
  if (!selectedFilesElement) {
    return;
  }

  if (selectedFiles.length === 0) {
    selectedFilesElement.innerHTML = '';

    return;
  }

  selectedFilesElement.innerHTML = selectedFiles
    .map((file, index) => {
      const size = formatFileSize(file.size);

      const icon = getFileIcon(file);

      return `
            <div
              class="
                file-item
                flex items-center gap-3
                p-3
                rounded-xl
                bg-white/5
                border border-white/5
              "
            >

              <div
                class="
                  w-10 h-10
                  rounded-lg
                  bg-indigo-500/10
                  flex items-center
                  justify-center
                  text-lg
                  shrink-0
                "
              >
                ${icon}
              </div>


              <div
                class="
                  flex-1
                  min-w-0
                "
              >

                <div
                  class="
                    text-sm
                    font-medium
                    truncate
                  "
                >
                  ${escapeHtml(file.name)}
                </div>


                <div
                  class="
                    text-xs
                    text-slate-500
                    mt-1
                  "
                >
                  ${size}
                </div>

              </div>


              <button
                type="button"
                data-remove-file="${index}"
                class="
                  w-8 h-8
                  rounded-lg
                  bg-white/5
                  hover:bg-red-500/10
                  hover:text-red-400
                  flex items-center
                  justify-center
                  transition
                "
                title="Remove"
              >
                ×
              </button>

            </div>
          `;
    })
    .join('');

  // Remove buttons

  selectedFilesElement
    .querySelectorAll('[data-remove-file]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.removeFile);

        selectedFiles.splice(index, 1);

        // Rebuild FileList

        const dataTransfer = new DataTransfer();

        selectedFiles.forEach((file) => {
          dataTransfer.items.add(file);
        });

        fileInput.files = dataTransfer.files;

        renderSelectedFiles();
      });
    });
}

// ============================================================
// FILE ICON
// ============================================================

function getFileIcon(file) {
  const type = file.type || '';

  if (type.startsWith('image/')) {
    return '🖼️';
  }

  if (type.startsWith('video/')) {
    return '🎬';
  }

  if (type.startsWith('audio/')) {
    return '🎵';
  }

  if (type.includes('pdf')) {
    return '📕';
  }

  if (type.includes('zip') || type.includes('compressed')) {
    return '📦';
  }

  if (
    type.includes('text') ||
    type.includes('javascript') ||
    type.includes('json')
  ) {
    return '📄';
  }

  return '📁';
}

// ============================================================
// FILE SIZE
// ============================================================

function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return (
    parseFloat((bytes / Math.pow(1024, index)).toFixed(2)) + ' ' + units[index]
  );
}

// ============================================================
// SEND FILES
// ============================================================

if (sendFilesBtn) {
  sendFilesBtn.addEventListener('click', async () => {
    const targetId = targetSelect?.value;

    // Validation

    if (!targetId) {
      alert('Please select a device.');

      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select at least one file.');

      return;
    }

    console.log('Sending files:', selectedFiles);

    try {
      sendFilesBtn.disabled = true;

      sendFilesBtn.textContent = 'Sending...';

      if (uploadProgress) {
        uploadProgress.classList.remove('hidden');
      }

      // ----------------------------------------------------
      // Send each file
      // ----------------------------------------------------

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        await uploadFile(file, targetId, i, selectedFiles.length);
      }

      // ----------------------------------------------------
      // Complete
      // ----------------------------------------------------

      if (progressBar) {
        progressBar.style.width = '100%';
      }

      if (progressText) {
        progressText.textContent = '100%';
      }

      sendFilesBtn.textContent = '✓ Files Sent';

      // Clear files

      selectedFiles = [];

      fileInput.value = '';

      renderSelectedFiles();

      setTimeout(() => {
        sendFilesBtn.disabled = false;

        sendFilesBtn.textContent = 'Send Selected Files';

        uploadProgress?.classList.add('hidden');

        if (progressBar) {
          progressBar.style.width = '0%';
        }
      }, 1500);
    } catch (error) {
      console.error('File upload failed:', error);

      alert('File upload failed. Please try again.');

      sendFilesBtn.disabled = false;

      sendFilesBtn.textContent = 'Send Selected Files';

      uploadProgress?.classList.add('hidden');
    }
  });
}

// ============================================================
// UPLOAD FILE
// ============================================================

function uploadFile(file, targetId, fileIndex, totalFiles) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    /*
     * IMPORTANT:
     *
     * This endpoint must exist
     * in server.js.
     *
     * Example:
     *
     * POST /api/upload
     */

    xhr.open('POST', '/api/upload');

    // ------------------------------------------------------
    // Progress
    // ------------------------------------------------------

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const currentProgress = (event.loaded / event.total) * 100;

      /*
       * Account for multiple files.
       */

      const overallProgress =
        ((fileIndex + currentProgress / 100) / totalFiles) * 100;

      if (progressBar) {
        progressBar.style.width = `${overallProgress}%`;
      }

      if (progressText) {
        progressText.textContent = `${Math.round(overallProgress)}%`;
      }
    });

    // ------------------------------------------------------
    // Complete
    // ------------------------------------------------------

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('Upload successful:', file.name);

        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    // ------------------------------------------------------
    // Error
    // ------------------------------------------------------

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    // ------------------------------------------------------
    // Abort
    // ------------------------------------------------------

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // ------------------------------------------------------
    // Form data
    // ------------------------------------------------------

    const formData = new FormData();

    formData.append('file', file);

    formData.append('targetId', targetId);

    formData.append('senderId', deviceId);

    formData.append('senderName', deviceNameInput?.value || 'Unknown Device');

    xhr.send(formData);
  });
}

// ============================================================
// INCOMING TEXT
// ============================================================

socket.on('receive-text', (data) => {
  console.log('Incoming text:', data);

  addIncomingText(data);
});

// ============================================================
// DISPLAY INCOMING TEXT
// ============================================================

function addIncomingText(data) {
  if (!incomingElement) {
    return;
  }

  // Remove empty state

  if (incomingElement.classList.contains('empty')) {
    incomingElement.classList.remove('empty');

    incomingElement.innerHTML = '';
  }

  const senderName = data.senderName || 'Unknown Device';

  const text = data.text || '';

  const item = document.createElement('div');

  item.className = `
    mb-3
    p-4
    rounded-2xl
    bg-white/5
    border border-white/10
  `;

  item.innerHTML = `
    <div
      class="
        flex
        items-center
        justify-between
        mb-3
      "
    >

      <div
        class="
          flex
          items-center
          gap-2
        "
      >

        <div
          class="
            w-8 h-8
            rounded-lg
            bg-indigo-500/10
            flex items-center
            justify-center
          "
        >
          💬
        </div>

        <div>

          <div
            class="
              text-sm
              font-medium
            "
          >
            ${escapeHtml(senderName)}
          </div>

          <div
            class="
              text-xs
              text-slate-500
            "
          >
            Just now
          </div>

        </div>

      </div>


      <button
        class="
          copy-text
          text-xs
          px-3 py-1.5
          rounded-lg
          bg-white/5
          hover:bg-white/10
          transition
        "
      >
        Copy
      </button>

    </div>


    <div
      class="
        text-sm
        text-slate-300
        whitespace-pre-wrap
        break-words
      "
    >
      ${escapeHtml(text)}
    </div>
  `;

  const copyButton = item.querySelector('.copy-text');

  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);

      copyButton.textContent = '✓ Copied';

      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 1200);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  });

  incomingElement.prepend(item);
}

// ============================================================
// INCOMING FILE
// ============================================================

socket.on('receive-file', (data) => {
  console.log('Incoming file:', data);

  addIncomingFile(data);
});

// ============================================================
// DISPLAY INCOMING FILE
// ============================================================

function addIncomingFile(data) {
  if (!incomingElement) {
    return;
  }

  if (incomingElement.classList.contains('empty')) {
    incomingElement.classList.remove('empty');

    incomingElement.innerHTML = '';
  }

  const item = document.createElement('div');

  item.className = `
    mb-3
    p-4
    rounded-2xl
    bg-white/5
    border border-white/10
  `;

  const senderName = data.senderName || 'Unknown Device';

  const fileName = data.fileName || 'File';

  const fileSize = data.fileSize ? formatFileSize(data.fileSize) : '';

  const downloadUrl = data.downloadUrl || data.url || '#';

  item.innerHTML = `
    <div
      class="
        flex
        items-center
        gap-3
      "
    >

      <div
        class="
          w-11 h-11
          rounded-xl
          bg-indigo-500/10
          flex items-center
          justify-center
          text-xl
        "
      >
        📁
      </div>


      <div
        class="
          flex-1
          min-w-0
        "
      >

        <div
          class="
            font-medium
            text-sm
            truncate
          "
        >
          ${escapeHtml(fileName)}
        </div>


        <div
          class="
            text-xs
            text-slate-500
            mt-1
          "
        >
          ${escapeHtml(senderName)}

          ${fileSize ? ` • ${fileSize}` : ''}
        </div>

      </div>


      <a
        href="${escapeHtml(downloadUrl)}"
        download
        class="
          px-3 py-2
          rounded-lg
          bg-indigo-500
          hover:bg-indigo-400
          text-xs
          font-medium
          transition
        "
      >
        Download
      </a>

    </div>
  `;

  incomingElement.prepend(item);
}

// ============================================================
// QR CODE / SERVER INFO
// ============================================================

async function loadServerInfo() {
  try {
    const response = await fetch('/api/info');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const info = await response.json();

    console.log('Server info:', info);

    if (qrCodeElement) {
      qrCodeElement.src = info.qrDataUrl;
    }

    if (serverUrlElement) {
      serverUrlElement.textContent = info.url || '';
    }
  } catch (error) {
    console.error('Unable to load server info:', error);
  }
}

loadServerInfo();

// ============================================================
// DEVICE NAME ENTER KEY
// ============================================================

if (deviceNameInput) {
  deviceNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();

      registerDevice();
    }
  });
}

// ============================================================
// DEBUG INFORMATION
// ============================================================

console.log(
  '%c NearDrop ',
  `
    background:#6366f1;
    color:white;
    padding:4px 8px;
    border-radius:4px;
    font-weight:bold;
  `,
);

console.log('Device ID:', deviceId);

console.log('NearDrop frontend initialized.');
