"""Build the committed GitHub Pages /docs site from dist and pinned dependencies."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
site=root/'docs'
site.mkdir(exist_ok=True)
for path in (root/'dist').iterdir():
    if path.is_file(): shutil.copy2(path,site/path.name)
(site/'vendor').mkdir(exist_ok=True)
shutil.copy2(root/'node_modules/@supabase/supabase-js/dist/umd/supabase.js',site/'vendor/supabase.js')
shutil.copy2(root/'node_modules/@supabase/supabase-js/LICENSE',site/'vendor/SUPABASE-LICENSE')
(site/'.nojekyll').touch()
print('Built GitHub Pages site in docs/')
