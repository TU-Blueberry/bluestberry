import traceback
import pyodide
import pyodide_js
import micropip

# Used to run code via the PyodideService
editor_input = ""
IMPORT_PACKAGE_MAPPING = {
  'skimage': 'scikit-image',
  'sklearn': 'scikit-learn'
}
already_loaded = {'os', 'js'}

def _raise(ex):
  raise ex

async def load_packages():
  imports = pyodide.find_imports(editor_input)
  failed_imports = []
  for package in imports:
    if package in already_loaded:
      continue
    print('loading ' + package)
    if package in IMPORT_PACKAGE_MAPPING:
      package = IMPORT_PACKAGE_MAPPING[package]
    try:
      await pyodide_js.loadPackage(package, lambda msg: None, lambda error: _raise(Exception(error)))
    except:
      failed_imports.append(package)

  await micropip.install(failed_imports)
  already_loaded.update(imports)

async def run_code():
  try:
    await load_packages()
    exec(editor_input, {})
  except:
    traceback.print_exc()
