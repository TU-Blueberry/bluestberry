#!/usr/bin/env bash

set -euf -o pipefail

VERSION="0.18.1"
ARCHIVE_PATH="dist"
ARCHIVE_FILENAME="pyodide.tar.bz2"
ARCHIVE_FULL_PATH="$ARCHIVE_PATH/$ARCHIVE_FILENAME"
OUT="pyodide"

echo "Installing Pyodide in Version $VERSION"

mkdir -p $ARCHIVE_PATH

if ! [ -f ARCHIVE_FULL_PATH ]; then
  curl -o ARCHIVE_FULL_PATH -L https://github.com/pyodide/pyodide/releases/download/$VERSION/pyodide-build-$VERSION.tar.bz2
fi

if ! [ -d $OUT ]; then
  echo "Extracting Pyodide files into $OUT"
  tar -xf ARCHIVE_FULL_PATH
fi

echo "Pyodide install complete!"
