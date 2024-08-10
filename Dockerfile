FROM node:20.15.1

WORKDIR /usr/app
COPY ./package.json ./

RUN npm install

COPY ./ ./

RUN npm run migrate:deploy
RUN npm run generate-client

EXPOSE 3000

CMD ["npm", "start"]



