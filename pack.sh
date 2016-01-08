#!/bin/sh
grunt vulcanize
rm -f switchyd.zip
zip switchyd.zip \
    ./option.html \
    ./polymer_option.js \
    ./proxy.js \
    ./manifest.json \
    ./switchyd128.png \
    ./switchyd48.png \
    ./switchyd16.png \
    ./bower_components/webcomponentsjs/webcomponents-lite.js \
    ./bower_components/web-animations-js/web-animations-next-lite.min.js \
    ./bower_components/marked/lib/marked.js \
    #./bower_components/paper-drawer-panel/paper-drawer-panel.css \
    #./bower_components/paper-item/paper-item-shared.css \

rm -rf temp
mkdir temp
cp switchyd.zip temp/
cd temp
unzip -o switchyd.zip
