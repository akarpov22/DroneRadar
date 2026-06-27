FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js routes.js zone-routes.js geo.js spawn-fleet.js ./

CMD ["npm", "start"]
