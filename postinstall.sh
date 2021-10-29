#!/usr/bin/env bash

set -euf -o pipefail

VERSION="0.18.1"
ARCHIVE_PATH="dist/pyodide.tar.bz2"
OUT="pyodide"

echo "Installing Pyodide in Version $VERSION"

if ! [ -f $ARCHIVE_PATH ]; then
  curl -o $ARCHIVE_PATH -L https://github.com/pyodide/pyodide/releases/download/$VERSION/pyodide-build-$VERSION.tar.bz2
fi

if ! [ -d $OUT ]; then
  echo "Extracting Pyodide files into $OUT"
  tar -xf $ARCHIVE_PATH
fi

echo "Pyodide install complete!"
