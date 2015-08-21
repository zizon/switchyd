#!/bin/sh
grunt vulcanize
rm -f switchyd.zip
zip switchyd.zip \
    option.html \
    option.js \
    proxy.js \
    manifest.json \
    ./bower_components/webcomponentsjs/webcomponents-lite.js \
    ./bower_components/web-animations-js/web-animations-next-lite.min.js \
    ./bower_components/marked/lib/marked.js \
    ./bower_components/paper-drawer-panel/paper-drawer-panel.css \
    ./bower_components/paper-item/paper-item-shared.css \
    ./polymer_option.js \

rm -rf temp
mkdir temp
cp switchyd.zip temp/
cd temp
unzip -o switchyd.zip
