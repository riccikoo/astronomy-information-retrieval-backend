import re
import spacy
from nltk.corpus import stopwords

nlp = spacy.load("en_core_web_sm", disable=['parser', 'ner'])
stop_words = set(stopwords.words('english'))

def preprocess(text):
    # 1. Lowercase
    text = text.lower()
    
    # 2. Tangani tanda hubung agar kata seperti "black-hole" jadi "blackhole" atau "black hole"
    text = re.sub(r'(\w+)-(\w+)', r'\1 \2', text)
    
    # 3. Hapus angka dan simbol tapi simpan istilah teknis jika perlu
    # Disini kita hanya simpan alfabet
    text = re.sub(r'[^a-z\s]', ' ', text)
    
    # 4. Lemmatization dengan spaCy
    doc = nlp(text)
    tokens = [token.lemma_ for token in doc if not token.is_stop and len(token.lemma_) > 2]
    
    return " ".join(tokens)