# 部署与日常更新指南

## 1. 首次部署
```bash
# 进入目录
cd /opt/seo-master

# 拉取通过 git 推送的代码
git pull

# 启动 (自动构建)
docker-compose up -d --build
```

## 2. 日常更新 (当你修改了本地代码并 Push 后)
在 VPS 上只需依次运行下面三行：

```bash
cd /opt/seo-master
git pull
docker-compose up -d --build
```

*说明: `docker-compose up -d --build` 会智能识别变动。如果你只改了代码没动依赖，它构建非常快。*
