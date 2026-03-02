FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# Workaround for WSL2/Docker IPv6 blackholing and MTU/TLS fragmentation
RUN sed -i 's/https/http/' /etc/apk/repositories
RUN apk add --no-cache ffmpeg
RUN npm install
COPY . .
EXPOSE 5004
CMD ["npm", "start"]
