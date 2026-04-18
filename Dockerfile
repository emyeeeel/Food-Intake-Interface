FROM node:22-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install

EXPOSE 4200
