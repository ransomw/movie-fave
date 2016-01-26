#! /bin/sh

./node_modules/docco/bin/docco \
    --output doc \
    --languages doc/languages.json \
    no_libs/public/js/main.js

