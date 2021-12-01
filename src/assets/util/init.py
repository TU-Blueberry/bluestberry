import micropip
import js
import traceback

await micropip.install(js.packages())

# Used to run code via the PyodideService
editor_input = ""

def run_code():
  try:
    exec(editor_input, {})
  except:
    traceback.print_exc()
