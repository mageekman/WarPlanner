"""Create a directly openable single-file prototype and a source archive."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
html = (root / 'dist/index.html').read_text()
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + (root / 'dist/styles.css').read_text() + '</style>')
html = html.replace('<script defer src="core.js"></script>', '').replace('<script defer src="cloud-lists.js"></script>', '')
html = html.replace('<script defer src="app.js"></script>', '').replace('<script defer src="list-builder.js"></script>', '')
html = html.replace('<script defer src="lessons.js"></script>', '').replace('<script defer src="aeldari-data.js"></script>', '')
html = html.replace('<script defer src="activations.js"></script>', '').replace('<script defer src="content.js"></script>', '').replace('<script defer src="mechanics.js"></script>', '').replace('<script defer src="rule-summaries.js"></script>', '').replace('<script defer src="rule-notes.js"></script>', '').replace('<script defer src="admin.js"></script>', '').replace('<script defer src="rules-import.js"></script>', '').replace('<script defer src="import-ui.js"></script>', '')
html = html.replace('<script defer src="vendor/supabase.js"></script>', '').replace('<script defer src="config.js"></script>', '').replace('<script defer src="auth.js"></script>', '')
start=html.index('<section id="auth-screen"')
end=html.index('<div id="app" hidden></div>', start)
html=html[:start]+html[end:].replace('<div id="app" hidden></div>', '<div id="app"></div>', 1)
html = html.replace('Sign out</button>', 'Offline edition</button>')
html = html.replace('</body>', ''.join('<script>' + (root / ('dist/' + name)).read_text() + '</script>' for name in ['core.js', 'aeldari-data.js', 'lessons.js', 'activations.js', 'list-builder.js', 'app.js']) + '</body>')
(root / 'warplanner.html').write_text(html)
with zipfile.ZipFile(root / 'warplanner-source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file() and path.suffix != '.zip' and not any(part in path.parts for part in ('.git', 'node_modules')):
            archive.write(path, Path('war-plan') / path.relative_to(root))
print('Created warplanner.html and warplanner-source.zip')
