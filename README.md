# Build notes

## tmux for development

- Download and unpack libevent and tmux sources

- Configure and make libevent
    ./configure
    make

- Configure and make tmux like this:
    ./configure LIBEVENT_CFLAGS="-I/home/xkcd1110/libevent-2.0.20-stable/ -I/home/xkcd1110/libevent-2.0.20-stable/include" LIBEVENT_LIBS="/home/xkcd1110/libevent-2.0.20-stable/.libs/libevent.a"
    make

## Node and ws module

- Download and unpack node

- Configure and build node
