/** Prefixes of error messages considered unnecessary */
export const filteredTerminalErrorPrefixes = [
  '/lib/python3.9/site-packages/pandas/compat/__init__.py:117: UserWarning: Could not import the lzma module.', // For local dev
  '/lib/python3.9/site-packages/pandas/compat/__init__.py:124: UserWarning: Could not import the lzma module.',
  '  warnings.warn(msg)',
]
