#!/bin/bash

# etcd 需要保证 traefik 下有值，不然 traefik 会无法读取配置而报错
docker exec -it etcd etcdctl put traefik d
