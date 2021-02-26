#!/usr/bin/env bash -e

cd images

for file in *.*; do
    convert $file -resize 50% medium/$file;
    convert $file -resize 25% small/$file;
done