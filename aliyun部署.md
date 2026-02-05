# **阿里云 ECS 部署指南**

## **1\. 基础设施概览**

* **服务提供商**：阿里云 (Aliyun)  
* **实例规格**：2 核(vCPU) / 2 GiB 内存  
* **操作系统**：Ubuntu 22.04 64位  
* **技术栈**：FastAPI (后端) \+ SQLite (数据库) \+ Nginx (前端) \+ Docker

## **2\. 环境初始化**

### **2.1 系统安装**

* 通过阿里云控制台“更换系统盘”功能，将原始系统重置为 **Ubuntu 22.04**。

### **2.2 安装 Docker 全家桶**

在终端执行以下指令，搭建容器化地基：

Bash

sudo apt-get update  
sudo apt-get install docker.io docker-compose-v2 \-y  
sudo systemctl start docker  
sudo systemctl enable docker

## **3\. 代码获取与权限配置**

### **3.1 SSH 密钥配置**

为了安全地从 GitHub 拉取代码，配置了服务器专用的 SSH 公钥：

1. 生成密钥：ssh-keygen \-t ed25519 \-C "yuyu111000@outlook.com"。  
2. 获取公钥：cat \~/.ssh/id\_ed25519.pub。  
3. **操作记录**：将该字符串添加到 GitHub 账号的 SSH Keys 列表中。

### **3.2 代码克隆**

```Bash

git clone git@github.com:yuyu-111000/SQTP\_1.git  
cd SQTP\_1
```
## **4\. 镜像加速优化（关键）**

针对国内云服务器拉取 Docker Hub 镜像缓慢的问题，配置了社区加速源：

编辑 /etc/docker/daemon.json：

```JSON
{  
  "registry-mirrors": \[  
    "https://docker.m.daocloud.io",  
    "https://docker.1panel.live"  
  \]  
}
```
重启服务使配置生效：

```Bash
sudo systemctl daemon-reload  
sudo systemctl restart docker
```
## **5\. 项目部署与网络配置**

### **5.1 启动服务**

利用 Docker Compose 实现一键起飞：

```Bash

docker compose up -d
```
* **验证**：通过 docker ps 确认 sqtp-web (Port 80\) 和 sqtp-backend (Port 8000\) 处于 Up 状态。

### **5.2 阿里云安全组（入方向规则）**

必须在阿里云控制台手动开启以下端口，否则会导致 502 或无法访问：

| 协议类型 | 端口范围 | 访问来源 | 备注 |
| :---- | :---- | :---- | :---- |
| TCP | 80/80 | 0.0.0.0/0 | 前端网页访问 |
| TCP | 8000/8000 | 0.0.0.0/0 | 后端 API 接口 |
| TCP | 22/22 | 0.0.0.0/0 | SSH 远程登录 |

## **6\. 常见问题排查 (Troubleshooting)**

* **502 Bad Gateway**：通常是因为后端容器未启动或安全组 8000 端口未打开。  
* **Clone Failed**：检查 GitHub 是否正确添加了服务器生成的 SSH 公钥。  
* **Docker Timeout**：检查 daemon.json 中的镜像加速地址是否有效。

