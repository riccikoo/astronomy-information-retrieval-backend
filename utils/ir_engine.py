import json
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from utils.preprocessing import preprocess
import numpy as np

class IREngine:
    def __init__(self, corpus_path):
        self.vectorizer = TfidfVectorizer(max_features=1000, min_df=2)
        self.corpus_path = corpus_path
        self.vectorizer = TfidfVectorizer()
        self.documents = []
        self.tfidf_matrix = None
        self.load_corpus()

    def load_corpus(self):
        try:
            with open(self.corpus_path, 'r') as f:
                self.documents = json.load(f)
        except:
            self.documents = []

        processed = [preprocess(doc['content']) for doc in self.documents]
        if processed:
            self.tfidf_matrix = self.vectorizer.fit_transform(processed)
            self.build_inverted_index()

    def get_snippet(self, text, query, window=30):
        text_lower = text.lower()
        query = query.lower()

        index = text_lower.find(query)
        if index == -1:
            # Kalau kata kunci gak ditemukan, return 1 kalimat pertama
            return text[:window*3] + "..."

        start = max(0, index - window)
        end = min(len(text), index + len(query) + window)
        snippet = text[start:end]

        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."
        return snippet

    def search(self, query):
        query_processed = preprocess(query)
        query_vec = self.vectorizer.transform([query_processed])
        scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]

        results = []
        for i, score in enumerate(scores):
            if score > 0: # Hanya ambil yang relevan
                content = self.documents[i]['content']
                results.append({
                    "title": self.documents[i]['title'],
                    "score": round(float(score), 4),
                    "snippet": self.get_snippet(content, query),
                    "summary": self.generate_summary(content) # Menampilkan ringkasan
                })

        results.sort(key=lambda x: x['score'], reverse=True)
        return results

    def add_document(self, title, content):
        self.documents.append({
            "title": title,
            "content": content
        })
        with open(self.corpus_path, 'w') as f:
            json.dump(self.documents, f, indent=2)

        self.load_corpus()

    def generate_summary(self, text, num_sentences=3):
        # Ringkasan sederhana berbasis rangking kalimat (extractive)
        sentences = re.split(r'(?<=[.!?]) +', text)
        if len(sentences) <= num_sentences:
            return text
        
        # Hitung skor kalimat berdasarkan kemunculan kata penting
        processed_sentences = [preprocess(s) for s in sentences]
        vec = TfidfVectorizer().fit_transform(processed_sentences)
        # Skor adalah rata-rata nilai TF-IDF dalam kalimat tersebut
        sentence_scores = np.array(vec.sum(axis=1)).flatten()
        
        # Ambil index kalimat dengan skor tertinggi
        top_indices = np.argsort(sentence_scores)[-num_sentences:]
        top_indices.sort()
        
        summary = " ".join([sentences[i] for i in top_indices])
        return summary
    
    def build_inverted_index(self):
        inverted_index = {}
        for doc_id, doc in enumerate(self.documents):
            words = set(preprocess(doc['content']).split())
            for word in words:
                if word not in inverted_index:
                    inverted_index[word] = []
                inverted_index[word].append(doc['title'])

        with open('data/inverted_index.json', 'w') as f:
            json.dump(inverted_index, f, indent=2)
        return inverted_index
