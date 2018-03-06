#!/bin/bash

URL=$(curl -s http://"$@"/json/list | jq .[0].devtoolsFrontendUrl)
URL=$(echo $URL | tr -d "\"")

UNAME_OUT=$(uname)

if [ $UNAME_OUT = "Darwin" ]; then
    echo $URL | pbcopy
fi

