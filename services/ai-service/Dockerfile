FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 5009

CMD ["npm", "start"]
