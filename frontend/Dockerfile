FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_GRAPHQL_HTTP
ARG VITE_GRAPHQL_WS
ENV VITE_GRAPHQL_HTTP=$VITE_GRAPHQL_HTTP
ENV VITE_GRAPHQL_WS=$VITE_GRAPHQL_WS

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--port", "4173"]
