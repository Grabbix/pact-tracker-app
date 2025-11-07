FROM node:18-alpine

ENV TZ=Europe/Paris
RUN apk add --no-cache tzdata

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p data

EXPOSE 3001

CMD ["npm", "start"]
