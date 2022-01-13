import traceback
import pyodide
import pyodide_js
import micropip

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

  for package in imports:
    if package in already_loaded:
      continue
    print('loading ' + package)
    try:
      # first try loading internal package
      __import__(package)
    except ImportError:
      mappedPackage = package
      if package in IMPORT_PACKAGE_MAPPING:
        mappedPackage = IMPORT_PACKAGE_MAPPING[package]
      try:
        # then try to load pyodide internal packages
        await pyodide_js.loadPackage(mappedPackage, lambda msg: None, lambda error: _raise(Exception(error)))
      except:
        # if all else fails try to install with micropip
        try:
          await micropip.install(mappedPackage)
          already_loaded.add(package)
        except:
          # ignore as the errors will be raised later again
          pass

async def run_code():
  try:
    await load_packages()
    
    # workaround to get access of local variables inside of exec(...)
    inner_locals = {}
    exec(editor_input, {}, inner_locals)
    
    if('plotly_output' in inner_locals.keys()):
      globals()['plotly_output'] = inner_locals['plotly_output']
      
  except:
    traceback.print_exc()
