# Builds index.html from _head.html + _mid.html + _tail.html, embedding code/*.gs
import pathlib, re
root = pathlib.Path(__file__).parent
head = (root/'_head.html').read_text(encoding='utf-8')
mid = (root/'_mid.html').read_text(encoding='utf-8')
tail = (root/'_tail.html').read_text(encoding='utf-8')

head = head.replace(
  "<p><strong>These are prompts, not code.</strong> Copy one, paste it into ChatGPT, Gemini, Copilot, or Claude, and the AI writes the script for <em>your</em> sheet. When Google changes something next year, you paste the prompt again and get fresh code. You don't need a computer science degree or a new subscription.</p>",
  "<p><strong>Each build gives you working starter code and a coaching prompt.</strong> Tap <em>Copy prompt + code</em>, paste it into ChatGPT, Gemini, Copilot, or Claude, and your AI walks you through building it one step at a time: set up the sheet, paste the code, test it safely, and make it yours. You don't need a computer science degree or a new subscription.</p>")
assert 'coaching prompt' in head

blocks = ''
for f in sorted((root/'code').glob('*.gs')):
    src = f.read_text(encoding='utf-8')
    assert '</script' not in src
    blocks += f'<script type="text/plain" id="code-{f.stem}">\n{src}</script>\n'

css = ".codeslot{color:#9ca3af;font-style:italic}\n@media (max-width:480px){.prompt .label{display:none}}\n</style>"
head = head.replace('</style>', css, 1)

js_old = tail[tail.index('<script>'):tail.index('</script>')+9]
js_new = r'''<script>
function codeFor(name){ var el=document.getElementById('code-'+name); return el ? el.textContent.replace(/^\n/,'') : ''; }
document.querySelectorAll('pre.codeview').forEach(function(pre){ pre.textContent = codeFor(pre.dataset.code); });
function textFor(box){
  var pre = box.querySelector('pre');
  if (box.dataset.code && pre.querySelector('.codeslot')) {
    var copy = pre.cloneNode(true);
    copy.querySelector('.codeslot').textContent = codeFor(box.dataset.code);
    return copy.textContent;
  }
  return pre.textContent;
}
document.querySelectorAll('.copy').forEach(function(btn){
  var label = btn.textContent;
  btn.addEventListener('click', function(){
    var text = textFor(btn.parentElement);
    function done(){ btn.textContent='Copied!'; btn.classList.add('done'); setTimeout(function(){btn.textContent=label;btn.classList.remove('done');},2000); }
    function fallback(){
      var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); done(); }catch(e){ btn.textContent='Select & copy'; }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done).catch(fallback); } else { fallback(); }
  });
});
</script>'''
tail = tail.replace(js_old, blocks + js_new)
(root/'index.html').write_text(head + mid + tail, encoding='utf-8')
print('built', len(head+mid+tail))
