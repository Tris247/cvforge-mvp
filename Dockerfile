FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production --silent || true
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","run","start"]
