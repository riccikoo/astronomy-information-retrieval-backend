const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultDiv = document.getElementById("result");
const loading = document.getElementById("loading");

searchBtn.addEventListener("click", searchData);

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchData();
  }
});

async function searchData() {
  const query = searchInput.value.trim();

  if (!query) {
    // Pesan ini akan tampil di tengah karena styling parent-nya
    resultDiv.innerHTML = "<p>⚠️ Masukkan kata kunci pencarian.</p>";
    return;
  }

  loading.classList.remove("hidden");
  resultDiv.innerHTML = "";
  searchBtn.disabled = true;

  try {
    // Pastikan backend Flask berjalan di port 5000
    const response = await fetch("http://127.0.0.1:5000/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (!data.length) {
      resultDiv.innerHTML = "<p>❌ Data tidak ditemukan.</p>";
      return;
    }

    data.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("result-card");

      // Menggunakan class .result-card yang sudah di-style di CSS
      card.innerHTML = `
        <h3>${item.title}</h3>
        <small>Relevansi: ${(item.score * 100).toFixed(2)}%</small>
        <p>${highlightQuery(item.snippet, query)}</p>
      `;

      resultDiv.appendChild(card);
    });

  } catch (error) {
    console.error(error);
    // Pesan error ini akan muncul persis seperti di screenshot
    resultDiv.innerHTML = "<p>🚫 Gagal terhubung ke server.</p>";
  } finally {
    loading.classList.add("hidden");
    searchBtn.disabled = false;
  }
}

function highlightQuery(text, query) {
  // Regex untuk highlight kata kunci (case-insensitive)
  const regex = new RegExp(`(${query})`, "gi");
  // Menggunakan tag <mark> yang sudah di-style di CSS
  return text.replace(regex, "<mark>$1</mark>");
}