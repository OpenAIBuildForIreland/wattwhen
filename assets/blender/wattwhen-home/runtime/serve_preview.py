"""Local-only GLB preview; no npm installation or external asset requests."""
import argparse
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote,urlparse
parser=argparse.ArgumentParser()
parser.add_argument('--three-root',type=Path,required=True)
parser.add_argument('--port',type=int,default=3108)
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
THREE=args.three_root.resolve()
if not (THREE/'build/three.module.js').exists():parser.error('--three-root must contain build/three.module.js')
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  route=unquote(urlparse(path).path)
  vendor=route.startswith('/vendor/three/')
  base=THREE if vendor else ROOT
  rel=route[len('/vendor/three/'):] if vendor else route.lstrip('/')
  target=(base/(rel or 'runtime/preview.html')).resolve()
  try:target.relative_to(base)
  except ValueError:return '/dev/null'
  return str(target)
print(f'WattWhen model preview: http://localhost:{args.port}/',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
