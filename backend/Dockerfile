FROM node:22.16.0-slim

WORKDIR /usr/dist
COPY package.json ./
COPY tsconfig.json ./
RUN ls -a && npm install
COPY ./dist ./
EXPOSE 5000 27017
CMD ["npm","start"]