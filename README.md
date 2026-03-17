# AI Story Hindi Admin (Premium VPS Setup)

यह एक प्रीमियम हिंदी स्टोरी जनरेशन सिस्टम है जो **Next.js** (Frontend) और **Python FastAPI** (Backend) का उपयोग करता है। इसमें **Coqui XTTS v2** लोकल मॉडल का इस्तेमाल किया गया है जो बिना किसी API Call के उच्च गुणवत्ता वाली हिंदी आवाज़ें (Emotions के साथ) जनरेट करता है।

## मुख्य विशेषतायें (Key Features)
- **Multi-Character Support**: हर पात्र के लिए अलग संवाद।
- **Emotional TTS**: खुशी, दुख, गुस्सा जैसे भावनाओं के साथ हिंदी आवाज़।
- **Local Model**: कोई बाहरी API Key की जरुरत नहीं, सब कुछ आपके VPS पर चलेगा।
- **Premium UI**: डार्क मोड, ग्लासमोर्फिज्म और मोबाइल फ्रेंडली डिजाइन।
- **Background Processing**: कहानी बैकग्राउंड में बनती रहेगी और लिस्ट में अपडेट हो जाएगी।

## सेटअप निर्देश (Setup Instructions)

### 1. Python Backend सेटअप (Corrected for VPS)
```bash
cd backend

# ज़रुरत पड़ने पर venv इनस्टॉल करें (Ubuntu/Debian के लिए)
sudo apt update && sudo apt install -y python3-venv python3-full ffmpeg

# वर्चुअल एनवायरनमेंट बनायें
python3 -m venv venv
source venv/bin/activate

# डिपेंडेंसी इनस्टॉल करें
pip install --upgrade pip
pip install -r requirements.txt

# मॉडल पहली बार डाउनलोड करें
python3 setup_models.py
```

### 2. Frontend सेटअप
```bash
cd frontend
npm install
npm run dev
```

### 3. सर्वर पर चलाना (Running on VPS)
बैकएंड चलाने के लिए:
```bash
cd backend
python main.py
```
फ्रंटएंड चलाने के लिए:
```bash
cd frontend
npm run build
npm start
```

## प्रोजेक्ट स्ट्रक्चर
- `/backend`: Python FastAPI कोड और AI मॉडल हैंडलिंग।
- `/frontend`: Next.js प्रीमियम एडमिन पैनल।
- `/storage`: यहाँ आपकी ऑडियो फाइलें और डेटा स्टोर होगा।

---
**Note:** पहली बार मॉडल डाउनलोड होने में 2GB के आसपास डेटा लगेगा। GPU (NVIDIA) होने पर यह बहुत तेज़ चलेगा, नहीं तो CPU पर थोड़ा धीमे चलेगा।
