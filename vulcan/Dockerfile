FROM node:6.2-slim

RUN sed -i '/jessie-updates/d' /etc/apt/sources.list
RUN \
  apt-get update && \
  apt-get upgrade -y --force-yes && \
  apt-get install -y --force-yes wget curl ca-certificates libfreetype6 libfontconfig bzip2 rsync ssh python

RUN npm install -g phantomjs casperjs
RUN mkdir /opt/logs
COPY scripts /opt/vulcan
WORKDIR /opt/vulcan
RUN npm install --production
