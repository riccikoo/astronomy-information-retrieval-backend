import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from utils.preprocessing import preprocess

class IREngine:
    def __init__(self, corpus_path):
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
            snippet = self.get_snippet(self.documents[i]['content'], query)
            results.append({
                "title": self.documents[i]['title'],
                "score": float(score),
                "snippet": snippet
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
