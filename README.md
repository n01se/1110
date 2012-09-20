# Build/dev notes

## tmux for development

- Download and unpack libevent and tmux sources

- Configure and make libevent
    ./configure
    make

- Configure and make tmux like this:
    ./configure LIBEVENT_CFLAGS="-I/home/xkcd1110/libevent-2.0.20-stable/ -I/home/xkcd1110/libevent-2.0.20-stable/include" LIBEVENT_LIBS="/home/xkcd1110/libevent-2.0.20-stable/.libs/libevent.a"
    make

- Copy tmux to bin dir
    cp tmux ~/bin/

## Node and ws module

- Download and unpack node

- Configure and build node
    ./configure
    make

- Link node executable to bin dir
    ln -sf $(readlink node) ~/bin/node

- Create npm script in ~/bin
    --------------------------
    #!/bin/sh
    node "$HOME/node-v0.8.9/deps/npm/bin/npm-cli.js" "$@"
    --------------------------


- In the source directory install ws module and dependencies (this will
  download and install ws and dependencies in node_modules/ sub-directory)
    npm install ws
