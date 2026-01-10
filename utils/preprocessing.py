import re
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

stop_words = set(stopwords.words('english'))
ps = PorterStemmer()

def preprocess(text):
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text)
    tokens = text.split()
    # Menambahkan stemming di sini
    tokens = [ps.stem(t) for t in tokens if t not in stop_words]
    return " ".join(tokens)