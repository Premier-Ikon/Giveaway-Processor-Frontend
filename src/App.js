import Papa from 'papaparse'

const API_URL = 'https://us-central1-premier-ikon.cloudfunctions.net/processCSVHandler'

export default function App() {
  const container = document.createElement('div')
  container.className = 'app-container'

  let csvFile = null
  let csvColumns = []
  let selectedColumn = ''
  let multiplier = 1
  let outputFilename = ''
  let isProcessing = false

  // Create UI
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
        <p class="subtitle">Generate giveaway entries from your CSV file</p>
      </div>

      <div class="content">
        <!-- File Upload Section -->
        <div class="section">
          <label class="section-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload CSV File
          </label>
          <div class="file-upload-area" id="fileUploadArea">
            <input type="file" id="fileInput" accept=".csv" style="display: none;">
            <div class="file-upload-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="upload-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p class="upload-text">Click to upload or drag and drop</p>
              <p class="upload-hint">CSV files only</p>
            </div>
            <div class="file-selected" id="fileSelected" style="display: none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="9" y1="15" x2="15" y2="9"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span id="fileName"></span>
              <button class="remove-file" id="removeFile">Remove</button>
            </div>
          </div>
        </div>

        <!-- Column Selection -->
        <div class="section" id="columnSection" style="display: none;">
          <label class="section-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            Select Multiplier Column
          </label>
          <select id="columnSelect" class="select-input">
            <option value="">Choose a column...</option>
          </select>
        </div>

        <!-- Multiplier Input -->
        <div class="section" id="multiplierSection" style="display: none;">
          <label class="section-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            Multiplier
          </label>
          <input 
            type="number" 
            id="multiplierInput" 
            class="number-input" 
            value="1" 
            min="0.1" 
            step="0.1"
            placeholder="1.0"
          >
          <p class="input-hint">Each row will generate (column value × multiplier) entries</p>
        </div>

        <!-- Output Filename Input -->
        <div class="section" id="filenameSection" style="display: none;">
          <label class="section-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            Output Filename (Optional)
          </label>
          <input 
            type="text" 
            id="filenameInput" 
            class="text-input" 
            placeholder="processed_output.csv"
          >
          <p class="input-hint">Leave empty to use default filename. .csv extension will be added automatically.</p>
        </div>

        <!-- Process Button -->
        <button class="process-button" id="processButton" disabled>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span id="processButtonText">Process CSV</span>
        </button>

        <!-- Loading State -->
        <div class="loading-state" id="loadingState" style="display: none;">
          <div class="spinner"></div>
          <p>Processing your file...</p>
        </div>

        <!-- Success State -->
        <div class="success-state" id="successState" style="display: none;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3>Success!</h3>
          <p>Your processed CSV is ready to download</p>
        </div>
      </div>
    </div>
  `

  // Get references
  const fileInput = container.querySelector('#fileInput')
  const fileUploadArea = container.querySelector('#fileUploadArea')
  const fileSelected = container.querySelector('#fileSelected')
  const fileName = container.querySelector('#fileName')
  const removeFileBtn = container.querySelector('#removeFile')
  const columnSection = container.querySelector('#columnSection')
  const columnSelect = container.querySelector('#columnSelect')
  const multiplierSection = container.querySelector('#multiplierSection')
  const multiplierInput = container.querySelector('#multiplierInput')
  const filenameSection = container.querySelector('#filenameSection')
  const filenameInput = container.querySelector('#filenameInput')
  const processButton = container.querySelector('#processButton')
  const processButtonText = container.querySelector('#processButtonText')
  const loadingState = container.querySelector('#loadingState')
  const successState = container.querySelector('#successState')

  // File upload handlers
  fileUploadArea.addEventListener('click', () => fileInput.click())
  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    fileUploadArea.classList.add('dragover')
  })
  fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover')
  })
  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    fileUploadArea.classList.remove('dragover')
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type === 'text/csv') {
      handleFileSelect(files[0])
    }
  })

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0])
    }
  })

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    resetFile()
  })

  // Handle file selection
  function handleFileSelect(file) {
    csvFile = file
    fileName.textContent = file.name
    fileUploadArea.querySelector('.file-upload-content').style.display = 'none'
    fileSelected.style.display = 'flex'
    
    // Parse CSV to get columns
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          csvColumns = Object.keys(results.data[0])
          populateColumnSelect()
          columnSection.style.display = 'block'
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
        alert('Error reading CSV file. Please make sure it\'s a valid CSV file.')
        resetFile()
      }
    })
  }

  function populateColumnSelect() {
    columnSelect.innerHTML = '<option value="">Choose a column...</option>'
    csvColumns.forEach(col => {
      const option = document.createElement('option')
      option.value = col
      option.textContent = col
      columnSelect.appendChild(option)
    })
  }

  function resetFile() {
    csvFile = null
    csvColumns = []
    selectedColumn = ''
    fileInput.value = ''
    fileUploadArea.querySelector('.file-upload-content').style.display = 'flex'
    fileSelected.style.display = 'none'
    columnSection.style.display = 'none'
    multiplierSection.style.display = 'none'
    filenameSection.style.display = 'none'
    processButton.disabled = true
    columnSelect.value = ''
    multiplierInput.value = '1'
    filenameInput.value = ''
    outputFilename = ''
    hideAllStates()
  }

  // Column selection
  columnSelect.addEventListener('change', (e) => {
    selectedColumn = e.target.value
    if (selectedColumn) {
      multiplierSection.style.display = 'block'
      filenameSection.style.display = 'block'
      updateProcessButton()
    } else {
      multiplierSection.style.display = 'none'
      filenameSection.style.display = 'none'
      processButton.disabled = true
    }
  })

  // Multiplier input
  multiplierInput.addEventListener('input', (e) => {
    multiplier = parseFloat(e.target.value) || 1
    updateProcessButton()
  })

  // Filename input
  filenameInput.addEventListener('input', (e) => {
    outputFilename = e.target.value.trim()
  })

  function updateProcessButton() {
    processButton.disabled = !(csvFile && selectedColumn && multiplier > 0)
  }

  // Process button
  processButton.addEventListener('click', async () => {
    if (isProcessing) return
    
    isProcessing = true
    hideAllStates()
    loadingState.style.display = 'flex'
    processButton.disabled = true
    processButtonText.textContent = 'Processing...'

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('multiplierColumn', selectedColumn)
      formData.append('multiplier', multiplier.toString())
      if (outputFilename) {
        formData.append('outputFilename', outputFilename)
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process CSV')
      }

      // Get CSV blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Use custom filename if provided, otherwise use default
      const downloadFilename = outputFilename 
        ? (outputFilename.endsWith('.csv') ? outputFilename : outputFilename + '.csv')
        : `processed_${csvFile.name.replace('.csv', '')}_output.csv`
      a.download = downloadFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Show success
      loadingState.style.display = 'none'
      successState.style.display = 'flex'
      
      // Reset after 3 seconds
      setTimeout(() => {
        successState.style.display = 'none'
        resetFile()
      }, 3000)

    } catch (error) {
      console.error('Error:', error)
      alert(`Error: ${error.message}`)
      loadingState.style.display = 'none'
    } finally {
      isProcessing = false
      processButton.disabled = false
      processButtonText.textContent = 'Process CSV'
    }
  })

  function hideAllStates() {
    loadingState.style.display = 'none'
    successState.style.display = 'none'
  }

  return container
}

