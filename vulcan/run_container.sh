#!/bin/bash
if test $# -eq 0 ; then
  docker run --rm -v /var/log:/opt/logs -e LOG_LEVEL=info valuepush/vulcan node pushResultChecker.js
  docker run --rm -v /var/log:/opt/logs -e LOG_LEVEL=info valuepush/vulcan node pushSender.js
else
  docker run --rm -v /var/log:/opt/logs -e LOG_LEVEL=$1 valuepush/vulcan node pushResultChecker.js
  docker run --rm -v /var/log:/opt/logs -e LOG_LEVEL=$1 valuepush/vulcan node pushSender.js
fi
