# Renders onepager.html -> Beyond-the-Chatbot-One-Pager.pdf (needs the local preview server and Chrome)
set -e
cd "$(dirname "$0")"
python - <<'PY'
import qrcode, qrcode.image.svg, re
u='https://jharvey1113.github.io/beyond-the-chatbot/'
q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=1); q.add_data(u); q.make(fit=True)
svg=q.make_image(image_factory=qrcode.image.svg.SvgPathImage).to_string(encoding='unicode')
svg=re.sub(r'^<\?xml[^>]*\?>','',svg).strip()
svg=re.sub(r' width="[^"]*" height="[^"]*"','',svg,count=1).replace('<svg ','<svg role="img" aria-label="QR code to the starter builds page" ',1)
open('onepager.html','w',encoding='utf-8').write(open('_onepager.html',encoding='utf-8').read().replace('{{QR}}',svg))
PY
T='C:\Users\jharvey\AppData\Local\Temp\btc'
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer --user-data-dir="$T\prof" --virtual-time-budget=8000 --print-to-pdf="$T\onepager.pdf" "http://localhost:47613/handout/onepager.html" 2>/dev/null | tail -1
cp /c/Users/jharvey/AppData/Local/Temp/btc/onepager.pdf Beyond-the-Chatbot-One-Pager.pdf
