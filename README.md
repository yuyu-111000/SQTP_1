方案一：Docker 容器化部署 (推荐)
无需配置 Python 环境，确保电脑已安装 Docker Desktop 即可。

1.启动服务  

在项目根目录打开终端，运行：
```Bash
docker compose up --build
```

2.访问项目  

前端页面：浏览器访问 http://localhost

API 文档：浏览器访问 http://localhost/api/docs

提示：Docker 模式下，SQLite 数据库文件会自动持久化保存到 backend_data/ 目录中。

方案二：本地手动部署 (开发模式)
如果需要修改代码或进行本地调试，请按以下步骤操作。

1. 环境准备
确保已安装 Python 3.9+，并建议在虚拟环境下操作。

2. 安装依赖  
在项目根目录运行：

```Bash
pip install fastapi uvicorn sqlmodel requests
```
3. 初始化数据  
运行脚本将 data.json 中的初始资源写入 SQLite 数据库：

```Bash
python -m backend.app.seed
```
(成功后，根目录下会自动生成 sql_app.db 文件)

4. 启动服务  
启动后端服务： 后端将运行在 8000 端口。

```Bash
uvicorn backend.app.main:app --reload
```
后端 API 地址：http://localhost:8000

Swagger 文档：http://localhost:8000/docs

启动前端页面： 推荐使用 VS Code 的 Live Server 插件。  

右键点击 frontend/index.html。  

选择 "Open with Live Server"。  

默认运行在 5500 端口 (https://www.google.com/search?q=http://127.0.0.1:5500)。  

注意：手动部署模式下，请确保 frontend/app.js 中的 API_BASE_URL 指向 http://localhost:8000。
