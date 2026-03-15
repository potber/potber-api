# Base image
FROM node:24-alpine

# Create app directory
WORKDIR /usr/src/app

RUN apk add python3 make g++

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

# Run as non-root
USER 1000

# Start the server using the production build
ENV NODE_OPTIONS="--enable-source-maps --require ./appsignal.cjs"
CMD ["node", "dist/main"]