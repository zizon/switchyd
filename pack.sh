#!/bin/sh
rm -f switchyd.zip
zip switchyd.zip \
    ./bundle.js \
    -r ./build \
    ./manifest.json \
    ./switchyd128.png \
    ./switchyd48.png \
    ./switchyd16.png \

rm -rf temp
mkdir temp
cp switchyd.zip temp/
cd temp
unzip -o switchyd.zip
