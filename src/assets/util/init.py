import sys, io, traceback

def run_code(code):
  out = io.StringIO()
  oldout = sys.stdout
  olderr = sys.stderr
  sys.stdout = sys.stderr = out

  try:
    exec(code, {})
  except:
    traceback.print_exc()

  sys.stdout = oldout
  sys.stderr = olderr
  return out.getvalue()
