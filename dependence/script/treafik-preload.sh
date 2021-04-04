#!/bin/bash

# etcd 需要保证 treafik 下有值，不然 treafik 会无法读取配置而报错
docker exec -it etcd etcdctl put treafik d
