FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache ffmpeg
RUN npm install
COPY . .
EXPOSE 5004
CMD ["npm", "start"]
