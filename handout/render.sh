# Renders onepager.html -> Beyond-the-Chatbot-One-Pager.pdf (needs the local preview server and Chrome)
set -e
cd "$(dirname "$0")"
python - <<'PY'
import qrcode, qrcode.image.svg, re
def qr(u,label):
    q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=1); q.add_data(u); q.make(fit=True)
    svg=q.make_image(image_factory=qrcode.image.svg.SvgPathImage).to_string(encoding='unicode')
    svg=re.sub(r'^<\?xml[^>]*\?>','',svg).strip()
    return re.sub(r' width="[^"]*" height="[^"]*"','',svg,count=1).replace('<svg ','<svg role="img" aria-label="'+label+'" ',1)
html=open('_onepager.html',encoding='utf-8').read()
html=html.replace('{{QR}}',qr('https://jharvey1113.github.io/beyond-the-chatbot/','QR code to the starter builds page'))
html=html.replace('{{BOOKQR}}',qr('https://www.amazon.com/dp/B0GQMYJ2XZ','QR code to the book on Amazon'))
open('onepager.html','w',encoding='utf-8').write(html)
PY
# Print from a short temp path with a fresh profile (avoids Windows long-path limits and stale cache)
T="$(cygpath -w "${TEMP:-/tmp}")\btc-render"
mkdir -p "$(cygpath -u "$T")"
rm -rf "$(cygpath -u "$T")/prof"
cp onepager.html "$(cygpath -u "$T")/onepager.html"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer --user-data-dir="$T\prof" --virtual-time-budget=10000 --print-to-pdf="$T\onepager.pdf" "file:///$(cygpath -m "$T")/onepager.html" 2>/dev/null | tail -1
cp "$(cygpath -u "$T")/onepager.pdf" Beyond-the-Chatbot-One-Pager.pdf
