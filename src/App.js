import Papa from 'papaparse'

const API_URL = 'https://us-central1-premier-ikon.cloudfunctions.net/processCSVHandler'

export default function App() {
  const container = document.createElement('div')
  container.className = 'app-container'

  let files = []
  let nextId = 1
  let outputFilename = ''
  let isProcessing = false

  container.innerHTML = `
    <div class="card">
      <div class="header">
        <div class="icon-wrapper">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h1>CSV Processor</h1>
        <p class="subtitle">Build one giveaway list from one or more CSV files</p>
      </div>

      <div class="content">
        <div class="section">
          <label class="section-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload CSV Files
          </label>
          <div class="file-upload-area" id="fileUploadArea">
            <input type="file" id="fileInput" accept=".csv,text/csv" multiple style="display: none;">
            <div class="file-upload-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="upload-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p class="upload-text">Click to upload or drag and drop</p>
              <p class="upload-hint">Add one or more CSV files. They are combined into a single download.</p>
            </div>
          </div>
        </div>

        <div id="fileList"></div>

        <div class="section" id="filenameSection" style="display: none;">
          <label class="section-label">Output Filename (Optional)</label>
          <input type="text" id="filenameInput" class="text-input" placeholder="processed_output.csv">
          <p class="input-hint" id="combinedHint">Choose the same number of export columns on every file. The first file's column names become the header of the combined CSV.</p>
        </div>

        <button class="process-button" id="processButton" disabled>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span id="processButtonText">Process CSV</span>
        </button>

        <div class="loading-state" id="loadingState" style="display: none;">
          <div class="spinner"></div>
          <p>Processing your files. Large exports can take a minute.</p>
        </div>

        <div class="success-state" id="successState" style="display: none;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3>Success!</h3>
          <p>Your entry file and shareable dashboard are downloading</p>
        </div>
      </div>
    </div>
  `

  const fileInput = container.querySelector('#fileInput')
  const fileUploadArea = container.querySelector('#fileUploadArea')
  const fileList = container.querySelector('#fileList')
  const filenameSection = container.querySelector('#filenameSection')
  const filenameInput = container.querySelector('#filenameInput')
  const combinedHint = container.querySelector('#combinedHint')
  const processButton = container.querySelector('#processButton')
  const processButtonText = container.querySelector('#processButtonText')
  const loadingState = container.querySelector('#loadingState')
  const successState = container.querySelector('#successState')

  fileUploadArea.addEventListener('click', () => fileInput.click())
  fileUploadArea.addEventListener('dragover', (event) => {
    event.preventDefault()
    fileUploadArea.classList.add('dragover')
  })
  fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover')
  })
  fileUploadArea.addEventListener('drop', (event) => {
    event.preventDefault()
    fileUploadArea.classList.remove('dragover')
    addFiles(event.dataTransfer.files)
  })
  fileInput.addEventListener('change', (event) => {
    addFiles(event.target.files)
    fileInput.value = ''
  })
  filenameInput.addEventListener('input', (event) => {
    outputFilename = event.target.value.trim()
  })
  processButton.addEventListener('click', processFiles)

  function addFiles(fileListInput) {
    const selected = Array.from(fileListInput || []).filter(isCsvFile)
    if (selected.length === 0) {
      if (fileListInput && fileListInput.length) {
        alert('Please upload CSV files only.')
      }
      return
    }

    selected.forEach((file) => {
      const record = {
        id: nextId++,
        file,
        columns: [],
        entryColumn: '',
        multiplier: 1,
        exportColumns: [],
        ready: false,
        error: '',
      }
      files.push(record)
      Papa.parse(file, {
        header: true,
        preview: 1,
        skipEmptyLines: true,
        complete: (results) => {
          const current = files.find((item) => item.id === record.id)
          if (!current) return
          current.columns = results.meta.fields || []
          current.ready = current.columns.length > 0
          current.error = current.ready ? '' : 'No columns found in this CSV.'
          renderFiles()
        },
        error: () => {
          const current = files.find((item) => item.id === record.id)
          if (!current) return
          current.ready = false
          current.error = 'Could not read this CSV.'
          renderFiles()
        },
      })
    })
    renderFiles()
  }

  function isCsvFile(file) {
    const name = (file.name || '').toLowerCase()
    return name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel'
  }

  function renderFiles() {
    fileList.innerHTML = ''
    files.forEach((record, index) => {
      const card = document.createElement('article')
      card.className = 'file-card'
      card.innerHTML = `
        <div class="file-card-header">
          <div>
            <p class="file-card-kicker">File ${index + 1}</p>
            <p class="file-card-name"></p>
          </div>
          <button type="button" class="remove-file">Remove</button>
        </div>
        <p class="file-card-error"></p>
        <div class="file-card-fields"></div>
      `
      card.querySelector('.file-card-name').textContent = record.file.name
      const error = card.querySelector('.file-card-error')
      const fields = card.querySelector('.file-card-fields')
      if (!record.ready) {
        error.textContent = record.error || 'Reading columns...'
        fields.style.display = 'none'
      } else {
        error.style.display = 'none'
        fields.append(
          fieldBlock('Entries based on', entrySelect(record)),
          fieldBlock('Multiplier', multiplierField(record), 'Each row becomes (column value × multiplier) entries.'),
          fieldBlock('Columns to export', exportFields(record), 'Check only what you need, such as email. The order you check them is the column order in the download.'),
        )
      }
      card.querySelector('.remove-file').addEventListener('click', () => {
        files = files.filter((item) => item.id !== record.id)
        renderFiles()
      })
      fileList.appendChild(card)
    })

    const hasFiles = files.length > 0
    filenameSection.style.display = hasFiles ? 'block' : 'none'
    processButtonText.textContent = files.length > 1 ? 'Process and combine' : 'Process CSV'
    updateCombinedHint()
    updateProcessButton()
  }

  function fieldBlock(label, control, hint) {
    const block = document.createElement('div')
    block.className = 'field-block'
    const title = document.createElement('p')
    title.className = 'field-label'
    title.textContent = label
    block.append(title, control)
    if (hint) {
      const note = document.createElement('p')
      note.className = 'input-hint'
      note.textContent = hint
      block.appendChild(note)
    }
    return block
  }

  function entrySelect(record) {
    const select = document.createElement('select')
    select.className = 'select-input'
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = 'Choose a column...'
    select.appendChild(placeholder)
    record.columns.forEach((column) => {
      const option = document.createElement('option')
      option.value = column
      option.textContent = column
      select.appendChild(option)
    })
    select.value = record.entryColumn
    select.addEventListener('change', () => {
      record.entryColumn = select.value
      updateProcessButton()
    })
    return select
  }

  function multiplierField(record) {
    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'number-input'
    input.min = '0.1'
    input.step = '0.1'
    input.value = String(record.multiplier)
    input.addEventListener('input', () => {
      record.multiplier = parseFloat(input.value) || 0
      updateProcessButton()
    })
    return input
  }

  function exportFields(record) {
    const list = document.createElement('div')
    list.className = 'column-checks'
    record.columns.forEach((column) => {
      const label = document.createElement('label')
      label.className = 'column-check'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = record.exportColumns.includes(column)
      const badge = document.createElement('span')
      badge.className = 'order-badge'
      const name = document.createElement('span')
      name.textContent = column
      const order = record.exportColumns.indexOf(column)
      badge.textContent = order === -1 ? '' : String(order + 1)
      badge.hidden = order === -1
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          record.exportColumns.push(column)
        } else {
          record.exportColumns = record.exportColumns.filter((item) => item !== column)
        }
        renderFiles()
      })
      label.append(checkbox, badge, name)
      list.appendChild(label)
    })
    return list
  }

  function updateCombinedHint() {
    const first = files.find((record) => record.exportColumns.length > 0)
    if (!first) {
      combinedHint.textContent = 'Choose the same number of export columns on every file. The first file\'s column names become the header of the combined CSV.'
      return
    }
    const counts = files.filter((record) => record.ready).map((record) => record.exportColumns.length)
    const mismatch = counts.some((count) => count !== first.exportColumns.length)
    const header = first.exportColumns.join(', ')
    combinedHint.textContent = mismatch
      ? `Each file needs ${first.exportColumns.length} export column${first.exportColumns.length === 1 ? '' : 's'} so they can be combined. The download header will be: ${header}.`
      : `Combined columns: ${header}`
  }

  function readyToProcess() {
    if (files.length === 0 || files.some((record) => !record.ready)) return false
    if (files.some((record) => !record.entryColumn || !(record.multiplier > 0))) return false
    const expected = files[0].exportColumns.length
    if (expected === 0) return false
    return files.every((record) => record.exportColumns.length === expected)
  }

  function updateProcessButton() {
    processButton.disabled = isProcessing || !readyToProcess()
  }

  async function processFiles() {
    if (isProcessing || !readyToProcess()) return

    isProcessing = true
    hideStatus()
    loadingState.style.display = 'flex'
    processButton.disabled = true
    processButtonText.textContent = 'Processing...'

    try {
      const formData = new FormData()
      const jobs = files.map((record) => ({
        filename: record.file.name,
        multiplierColumn: record.entryColumn,
        multiplier: record.multiplier,
        exportColumns: record.exportColumns,
      }))
      files.forEach((record) => formData.append('files', record.file))
      formData.append('jobs', JSON.stringify(jobs))
      formData.append('bundle', '1')
      if (outputFilename) formData.append('outputFilename', outputFilename)

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let message = `Failed to process CSV (${response.status})`
        try {
          const error = await response.json()
          message = error.message || error.error || message
        } catch {
          // Platform errors (timeouts, size limits) are not JSON.
        }
        throw new Error(message)
      }

      const payload = await response.json()
      const csvBlob = await gzipBase64ToBlob(payload.csvGzipBase64)
      downloadBlob(csvBlob, payload.filename || downloadName())
      downloadBlob(
        new Blob([payload.dashboardHtml], { type: 'text/html' }),
        payload.dashboardFilename || 'giveaway-dashboard.html',
      )

      loadingState.style.display = 'none'
      successState.style.display = 'flex'
      setTimeout(() => {
        successState.style.display = 'none'
      }, 3000)
    } catch (error) {
      console.error('Error:', error)
      alert(`Error: ${error.message}`)
      loadingState.style.display = 'none'
    } finally {
      isProcessing = false
      processButtonText.textContent = files.length > 1 ? 'Process and combine' : 'Process CSV'
      updateProcessButton()
    }
  }

  async function gzipBase64ToBlob(encoded) {
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).blob()
  }

  function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  function downloadName() {
    if (outputFilename) {
      return outputFilename.endsWith('.csv') ? outputFilename : `${outputFilename}.csv`
    }
    if (files.length === 1) {
      return `processed_${files[0].file.name.replace(/\.csv$/i, '')}_output.csv`
    }
    return 'combined_entries.csv'
  }

  function hideStatus() {
    loadingState.style.display = 'none'
    successState.style.display = 'none'
  }

  return container
}
