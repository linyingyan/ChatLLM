"""Offline source/configuration checks. Does not import services or use credentials."""
from pathlib import Path
import ast, json, re
ROOT = Path(__file__).resolve().parents[1]
files = list((ROOT / 'backend_template').rglob('*.py'))
for file in files:
    source = file.read_text(encoding='utf-8-sig')
    ast.parse(source, filename=str(file))
    if re.search(r'sk-[A-Za-z0-9_-]{12,}', source):
        raise AssertionError(f'Embedded provider credential in {file.relative_to(ROOT)}')
config = ast.parse((ROOT / 'backend_template/config/db_config.py').read_text())
envs = {call.args[0].value for call in ast.walk(config)
        if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute)
        and call.func.attr == 'getenv' and call.args and isinstance(call.args[0], ast.Constant)}
assert {'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'} <= envs
rag_source = (ROOT / 'backend_template/routes/rag.py').read_text()
assert "os.environ['SILICONFLOW_API_KEY']" in rag_source
assert 'os.environ["SECRET_KEY"]' in (ROOT / 'backend_template/config/jwt_config.py').read_text()
# Execute only the original pure text-splitting helper, excluding network/filesystem code.
module = ast.parse(rag_source)
helper = next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == 'split_text')
from typing import List
namespace = {'List': List}
exec(compile(ast.Module(body=[helper], type_ignores=[]), '<split_text>', 'exec'), namespace)
text = 'abcdefghijklmno'
chunks = namespace['split_text'](text, chunk_size=6, overlap=2)
assert chunks == ['abcdef', 'efghij', 'ijklmn', 'mno']
print(json.dumps({'python_syntax_files': len(files), 'environment_configuration': 'pass',
                  'rag_split_text': 'pass', 'external_services': 'NOT RUN'}, indent=2))
