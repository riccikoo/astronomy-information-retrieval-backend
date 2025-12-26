// Variabel global untuk state pencarian
let currentPage = 1;
let itemsPerPage = 10;
let allResults = [];
let filteredResults = [];
let currentQuery = '';

// Fungsi untuk mengatur tab
function setTab(tabName) {
  // Sembunyikan semua view
  document.getElementById('view-search').classList.add('hidden');
  document.getElementById('view-upload').classList.add('hidden');
  
  // Hapus status active dari semua tab
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Tampilkan view yang dipilih
  document.getElementById(`view-${tabName}`).classList.remove('hidden');
  
  // Aktifkan tab yang dipilih
  document.querySelector(`[onclick="setTab('${tabName}')"]`).classList.add('active');
  
  // Reset konten
  if (tabName === 'search') {
    document.getElementById('q').focus();
  } else {
    document.getElementById('res-upload').innerHTML = '';
  }
}

// Fungsi untuk handle enter di input pencarian
function handleEnter(event) {
  if (event.key === 'Enter') {
    doSearch();
  }
}

// Fungsi pencarian utama
async function doSearch() {
  const query = document.getElementById('q').value.trim();
  const resultsDiv = document.getElementById('res-search');
  const loadingDiv = document.getElementById('loading');
  const paginationDiv = document.getElementById('pagination');
  const noResultsDiv = document.getElementById('noResults');
  const searchInfoDiv = document.getElementById('searchInfo');
  
  if (!query) {
    resultsDiv.innerHTML = `
      <div class="result-card info">
        <h3><i class="fas fa-info-circle"></i> Masukkan Kata Kunci</h3>
        <p>Silakan masukkan kata kunci pencarian untuk menjelajahi dokumen astronomi.</p>
      </div>
    `;
    return;
  }
  
  // Reset state
  currentPage = 1;
  allResults = [];
  filteredResults = [];
  currentQuery = query;
  
  // Tampilkan loading
  loadingDiv.classList.remove('hidden');
  resultsDiv.innerHTML = '';
  paginationDiv.classList.add('hidden');
  noResultsDiv.classList.add('hidden');
  searchInfoDiv.classList.add('hidden');
  
  // Disable button selama pencarian
  document.getElementById('btn-search').disabled = true;
  
  try {
    // Kirim request ke backend
    const response = await fetch("http://127.0.0.1:5000/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter hasil dengan relevansi > 0
    allResults = data.filter(item => item.score > 0);
    
    if (allResults.length === 0) {
      showNoResults();
      return;
    }
    
    // Filter berdasarkan threshold relevansi
    filterResults();
    
  } catch (error) {
    console.error("Error:", error);
    resultsDiv.innerHTML = `
      <div class="result-card error">
        <h3><i class="fas fa-exclamation-triangle"></i> Gagal Terhubung ke Server</h3>
        <p>Pastikan server backend sedang berjalan di <code>http://127.0.0.1:5000</code></p>
        <p>Detail error: ${error.message}</p>
      </div>
    `;
  } finally {
    // Sembunyikan loading
    loadingDiv.classList.add('hidden');
    document.getElementById('btn-search').disabled = false;
  }
}

// Fungsi filter berdasarkan relevansi
function filterResults() {
  const filterValue = parseFloat(document.getElementById('relevanceFilter').value);
  
  // Filter hasil berdasarkan threshold relevansi
  filteredResults = allResults.filter(item => item.score >= filterValue);
  
  // Update tampilan
  if (filteredResults.length === 0) {
    showNoResults();
  } else {
    displayResults();
    updatePagination();
    showSearchInfo();
  }
}

// Fungsi untuk menampilkan hasil
function displayResults() {
  const resultsDiv = document.getElementById('res-search');
  const paginationDiv = document.getElementById('pagination');
  const noResultsDiv = document.getElementById('noResults');
  
  resultsDiv.innerHTML = '';
  paginationDiv.classList.remove('hidden');
  noResultsDiv.classList.add('hidden');
  
  // Hitung indeks untuk halaman saat ini
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageResults = filteredResults.slice(startIndex, endIndex);
  
  // Tampilkan hasil untuk halaman saat ini
  pageResults.forEach((item, index) => {
    const card = document.createElement("div");
    card.classList.add("result-card");
    
    // Efek delay animasi
    card.style.animationDelay = `${index * 0.1}s`;
    card.style.opacity = "0";
    card.style.animation = "fadeIn 0.5s forwards";
    
    // Cek apakah file PDF tersedia
    const hasPDF = item.title.toLowerCase().endsWith('.pdf');
    const previewButton = hasPDF ? 
      `<button class="preview-btn" onclick="previewPDF('${item.title}', ${item.score}, '${item.date}', '${item.type}')">
        <i class="fas fa-eye"></i> Preview PDF
      </button>` : '';
    
    card.innerHTML = `
      ${previewButton}
      <h3><i class="fas fa-file-alt"></i> ${item.title}</h3>
      <div class="result-meta">
        <small><i class="fas fa-calendar"></i> ${item.date}</small>
        <small><i class="fas fa-tag"></i> ${item.type}</small>
        <small class="relevance-score"><i class="fas fa-chart-line"></i> Relevansi: ${(item.score * 100).toFixed(2)}%</small>
      </div>
      <p>${highlightQuery(item.snippet, currentQuery)}</p>
    `;
    
    resultsDiv.appendChild(card);
  });
}

// Fungsi untuk menampilkan info pencarian
function showSearchInfo() {
  const searchInfoDiv = document.getElementById('searchInfo');
  const resultCount = document.getElementById('resultCount');
  const queryInfo = document.getElementById('queryInfo');
  
  searchInfoDiv.classList.remove('hidden');
  resultCount.innerHTML = `<i class="fas fa-file-alt"></i> Ditemukan ${filteredResults.length} dokumen dari total ${allResults.length}`;
  queryInfo.innerHTML = `<i class="fas fa-search"></i> Kata kunci: "${currentQuery}" | Filter: ≥${(parseFloat(document.getElementById('relevanceFilter').value) * 100)}%`;
}

// Fungsi untuk menampilkan pesan tidak ada hasil
function showNoResults() {
  const resultsDiv = document.getElementById('res-search');
  const paginationDiv = document.getElementById('pagination');
  const noResultsDiv = document.getElementById('noResults');
  const searchInfoDiv = document.getElementById('searchInfo');
  
  resultsDiv.innerHTML = '';
  paginationDiv.classList.add('hidden');
  noResultsDiv.classList.remove('hidden');
  searchInfoDiv.classList.add('hidden');
}

// Fungsi untuk reset pencarian
function resetSearch() {
  document.getElementById('q').value = '';
  document.getElementById('relevanceFilter').value = '0.5';
  const resultsDiv = document.getElementById('res-search');
  const paginationDiv = document.getElementById('pagination');
  const noResultsDiv = document.getElementById('noResults');
  const searchInfoDiv = document.getElementById('searchInfo');
  
  resultsDiv.innerHTML = '';
  paginationDiv.classList.add('hidden');
  noResultsDiv.classList.add('hidden');
  searchInfoDiv.classList.add('hidden');
  
  allResults = [];
  filteredResults = [];
  currentQuery = '';
}

// Fungsi untuk update pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Fungsi untuk halaman sebelumnya
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    displayResults();
    updatePagination();
    // Scroll ke atas results
    document.getElementById('res-search').scrollIntoView({ behavior: 'smooth' });
  }
}

// Fungsi untuk halaman berikutnya
function nextPage() {
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayResults();
    updatePagination();
    // Scroll ke atas results
    document.getElementById('res-search').scrollIntoView({ behavior: 'smooth' });
  }
}

// Fungsi untuk preview PDF
function previewPDF(filename, score, date, type) {
  const modal = document.getElementById('pdfModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalDate = document.getElementById('modalDate');
  const modalType = document.getElementById('modalType');
  const modalScore = document.getElementById('modalScore');
  const pdfViewer = document.getElementById('pdfViewer');
  const pdfPlaceholder = document.getElementById('pdfPlaceholder');
  const downloadBtn = document.getElementById('downloadBtn');
  
  // Set modal content
  modalTitle.innerHTML = `<i class="fas fa-file-pdf"></i> ${filename}`;
  modalDate.textContent = date;
  modalType.textContent = type;
  modalScore.textContent = `${(score * 100).toFixed(2)}%`;
  
  // Set download link
  downloadBtn.href = `http://127.0.0.1:5000/data/documents/${encodeURIComponent(filename)}`;
  downloadBtn.download = filename;
  
  // Coba load PDF
  const pdfPath = `http://127.0.0.1:5000/data/documents/${encodeURIComponent(filename)}`;
  
  // Tampilkan placeholder dulu
  pdfViewer.classList.add('hidden');
  pdfPlaceholder.classList.remove('hidden');
  
  // Tampilkan modal
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Coba load PDF setelah modal terbuka
  setTimeout(() => {
    fetch(pdfPath, { method: 'HEAD' })
      .then(response => {
        if (response.ok && response.headers.get('content-type') === 'application/pdf') {
          // Jika PDF valid, tampilkan
          pdfViewer.src = pdfPath;
          pdfViewer.classList.remove('hidden');
          pdfPlaceholder.classList.add('hidden');
        } else {
          // Jika tidak valid, tetap tampilkan placeholder
          pdfPlaceholder.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>PDF tidak dapat ditampilkan</p>
            <p class="small">Format file mungkin tidak didukung atau file tidak ditemukan</p>
          `;
        }
      })
      .catch(error => {
        console.error('Error loading PDF:', error);
        pdfPlaceholder.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          <p>Gagal memuat PDF</p>
          <p class="small">${error.message}</p>
        `;
      });
  }, 100);
}

async function doUpload() {
    const fileInput = document.getElementById('f');
    const statusDiv = document.getElementById('res-upload');
    const btnUpload = document.getElementById('btn-upload');

    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    // Tentukan endpoint berdasarkan tipe file
    const endpoint = file.name.endsWith('.zip') ? '/upload-zip' : '/upload';

    btnUpload.disabled = true;
    statusDiv.innerHTML = '<p class="loading-text">Sedang mengunggah ke galaksi...</p>';

    try {
        const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.innerHTML = `<p style="color: #00ffcc;"><i class="fas fa-check-circle"></i> ${data.message}</p>`;
            fileInput.value = ''; // Reset input
            document.getElementById('fname').textContent = 'Belum ada file yang dipilih';
        } else {
            throw new Error(data.error || 'Gagal upload');
        }
    } catch (error) {
        statusDiv.innerHTML = `<p style="color: #ff4d4d;"><i class="fas fa-times-circle"></i> Error: ${error.message}</p>`;
    } finally {
        btnUpload.disabled = false;
    }
}

// Tambahkan listener agar tombol upload aktif saat file dipilih
document.getElementById('f').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || "Belum ada file yang dipilih";
    document.getElementById('fname').textContent = fileName;
    document.getElementById('btn-upload').disabled = e.target.files.length === 0;
});

// Fungsi untuk menutup modal PDF
function closePDFModal() {
  const modal = document.getElementById('pdfModal');
  const pdfViewer = document.getElementById('pdfViewer');
  
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
  
  // Reset iframe source
  pdfViewer.src = '';
}

// Fungsi untuk highlight query dalam teks
function highlightQuery(text, query) {
  if (!text || !query) return text || "";
  
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

// Event listener untuk klik di luar modal
document.addEventListener('click', (event) => {
  const modal = document.getElementById('pdfModal');
  if (event.target === modal) {
    closePDFModal();
  }
});

// Event listener untuk escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePDFModal();
  }
});

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', function() {
  // Set tab awal
  setTab('search');
  
  // Tambahkan style untuk animasi fadeIn
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .result-meta {
      display: flex;
      gap: 15px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    
    .result-meta small {
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--text-muted);
    }
    
    .relevance-score {
      color: var(--neon-cyan) !important;
      font-weight: 600;
    }
    
    .small {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  `;
  document.head.appendChild(style);
});