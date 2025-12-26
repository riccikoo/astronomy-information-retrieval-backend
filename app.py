from flask import Flask, request, jsonify, render_template, send_from_directory
from utils.ir_engine import IREngine
import fitz  # PyMuPDF
import zipfile
import io
import os

app = Flask(__name__)
UPLOAD_FOLDER = "data/documents"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
engine = IREngine("data/corpus.json")

def extract_text_from_pdf_bytes(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/search', methods=['POST'])
def search():
    data = request.json
    query = data.get('query', '')

    results = engine.search(query)
    
    # Filter out results with score <= 0
    filtered_results = [r for r in results if r.get('score', 0) > 0]
    
    # Enhanced results with metadata
    enhanced_results = []
    for i, result in enumerate(filtered_results):
        enhanced = result.copy()
        enhanced['date'] = f"2025-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}"
        enhanced['type'] = 'PDF' if enhanced['title'].lower().endswith('.pdf') else 'TXT'
        enhanced_results.append(enhanced)
    
    return jsonify(enhanced_results)

# Endpoint untuk mengakses file PDF
@app.route('/data/documents/<path:filename>')
def serve_document(filename):
    try:
        return send_from_directory(UPLOAD_FOLDER, filename)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    retrieved = data['retrieved']
    relevant = data['relevant']

    tp = len(set(retrieved) & set(relevant))
    precision = tp / len(retrieved) if retrieved else 0
    recall = tp / len(relevant) if relevant else 0

    return jsonify({
        "precision": precision,
        "recall": recall
    })

@app.route('/upload-zip', methods=['POST'])
def upload_zip():
    file = request.files['file']

    if not file.filename.endswith('.zip'):
        return jsonify({"error": "File harus berformat ZIP"}), 400

    zip_file = zipfile.ZipFile(io.BytesIO(file.read()))

    for filename in zip_file.namelist():
        # Simpan file ke disk dulu
        file_path = os.path.join(UPLOAD_FOLDER, filename)

        # Baca isi file di dalam zip
        file_bytes = zip_file.read(filename)

        # Simpan fisik file ke folder documents
        with open(file_path, 'wb') as f:
            f.write(file_bytes)

        # Proses ekstrak teks sesuai ekstensi
        if filename.endswith('.pdf'):
            content = extract_text_from_pdf_bytes(file_bytes)
        elif filename.endswith('.txt'):
            content = file_bytes.decode('utf-8')
        else:
            # Lewatkan file selain pdf/txt
            continue

        # Tambahkan ke corpus dan indeks
        engine.add_document(filename, content)

    return jsonify({"message": "Bulk documents uploaded, saved & indexed successfully"})

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    title = file.filename

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    if file.filename.endswith('.pdf'):
        with open(file_path, 'rb') as f:
            file_bytes = f.read()
        content = extract_text_from_pdf_bytes(file_bytes)
    else:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

    engine.add_document(title, content)

    return jsonify({"message": "Document uploaded, saved & indexed successfully"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)