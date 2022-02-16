import traceback
import pyodide
import pyodide_js
import micropip
import js
import sys

# Used to run code via the PyodideService
editor_input = ""
# plotly_output = "test"
IMPORT_PACKAGE_MAPPING = {
  'skimage': 'scikit-image',
  'sklearn': 'scikit-learn'
}
already_loaded = {'os', 'js'}

def _raise(ex):
  raise ex

async def load_packages():
  imports = pyodide.find_imports(editor_input)
  await load_libs(imports)

async def load_libs(libs):
  for package in libs:
    if package in already_loaded:
      continue
    print('loading ' + package)
    try:
      # first try loading internal package
      __import__(package)
    except:
      mappedPackage = package
      if package in IMPORT_PACKAGE_MAPPING:
        mappedPackage = IMPORT_PACKAGE_MAPPING[package]
      try:
        # then try to load pyodide internal packages
        await pyodide_js.loadPackage(mappedPackage, lambda msg: None, lambda error: _raise(Exception(error)))
        js.notifyLoadedPackage(package)
      except:
        # if all else fails try to install with micropip
        try:
          await micropip.install(mappedPackage)
          js.notifyLoadedPackage(package)
          already_loaded.add(package)
        except:
          # ignore as the errors will be raised again later
          pass


async def run_code():
  try:
    await load_packages()

    exec(editor_input, {})

  except:
    traceback.print_exc()
