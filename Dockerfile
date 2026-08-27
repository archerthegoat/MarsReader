FROM node:26-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY lib ./lib
COPY public ./public
COPY README.md ./

RUN mkdir -p data

EXPOSE 8080
CMD ["node", "server.js"]
