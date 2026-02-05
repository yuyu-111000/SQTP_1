 1. 环境准备  
 确保已安装 Python 3.9+，并建议在虚拟环境下操作。

 2. 安装依赖
```Bash
pip install fastapi uvicorn sqlmodel requests
```
 3. 初始化数据
 运行脚本将 data.json 中的初始资源写入 SQLite 数据库：

```Bash
python -m backend.app.seed
```
 4. 启动服务
 后端：运行在 8000 端口。

```Bash
uvicorn backend.app.main:app --reload
```
前端：使用 VS Code Live Server 插件运行 frontend/index.html（建议端口 5500）
