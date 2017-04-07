
FROM node:7.8

MAINTAINER Jerry Bendy <jerry@icewingcc.com>

# copy all files to container
COPY . /app


WORKDIR /app

# install pm2
RUN yarn global add pm2

# install and add lock file
RUN yarn \
    && touch .installed

# build
RUN yarn run webpack.build.production \
    && yarn run compile


# clean cache
RUN yarn cache clean


EXPOSE 8360

CMD ["pm2-docker", "start", "pm2.json"]
