
FROM jerrybendy/node-yarn-cn

MAINTAINER Jerry Bendy <jerry@icewingcc.com>

# copy all files to container
COPY . /app


WORKDIR /app


# install and add lock file
RUN yarn \
    && touch .installed

# build
RUN yarn run webpack.build.production \
    && yarn run compile

EXPOSE 8360

CMD ["pm2-docker", "start", "pm2.json"]
