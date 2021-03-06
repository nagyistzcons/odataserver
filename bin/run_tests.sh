#!/bin/bash

if test -e setenv; then
  echo "sourcing setenv..."
  source setenv
fi

node tests/test_main.js && node tests/test_leveldb.js && \
node tests/test_mysql2.js && node tests/test_odataserver.js && \
node tests/test_helpers.js && node tests/test_middleware.js && \
node tests/test_express.js
