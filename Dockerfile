ARG NODE_IMAGE=node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43

FROM ${NODE_IMAGE} AS build
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY test ./test
RUN npm run build

FROM ${NODE_IMAGE} AS production-dependencies
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM ${NODE_IMAGE} AS runtime
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps --require ./appsignal.cjs"

COPY --chown=node:node package.json package-lock.json appsignal.cjs ./
COPY --chown=node:node --from=production-dependencies /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

USER node
EXPOSE 3000

CMD ["node", "dist/main"]
