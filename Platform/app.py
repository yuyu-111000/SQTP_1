from flask import Flask, render_template, session, request, jsonify, redirect, url_for, send_from_directory
from datetime import datetime, timedelta
import os
import uuid

app = Flask(__name__)
app.secret_key = 'shiguangbanxue_secret_key_123456'

# 文件上传目录
UPLOAD_FOLDER = 'uploads'
# 创建uploads目录
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'}

# 检查文件扩展名是否允许
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# 模拟资源数据
resources = [
    {
        'id': 1,
        'category': '学习资料',
        'name': 'Python编程入门',
        'links': [
            {'title': 'Python官方文档', 'url': 'https://docs.python.org/zh-cn/3/'},
            {'title': 'B站Python入门视频', 'url': 'https://www.bilibili.com/video/BV1qW411n7zo/'},
            {'title': 'CSDNPython教程', 'url': 'https://blog.csdn.net/qq_45677671/article/details/105604703'}
        ],
        'description': 'Python编程语言的基础学习资料'
    },
    {
        'id': 2,
        'category': '学习资料',
        'name': '数据结构与算法',
        'links': [
            {'title': 'LeetCode刷题平台', 'url': 'https://leetcode-cn.com/'},
            {'title': 'B站数据结构视频', 'url': 'https://www.bilibili.com/video/BV1nJ411V7bd/'},
            {'title': '知乎算法专栏', 'url': 'https://www.zhihu.com/column/c_1260442070085713920'}
        ],
        'description': '计算机科学的核心课程资料'
    },
    {
        'id': 3,
        'category': '实用工具',
        'name': '在线工具集合',
        'links': [
            {'title': 'ProcessOn流程图', 'url': 'https://www.processon.com/'},
            {'title': 'Markdown编辑器', 'url': 'https://markdown.com.cn/'},
            {'title': 'CSDN工具推荐', 'url': 'https://blog.csdn.net/qq_36186690/article/details/105262677'}
        ],
        'description': '学习和工作中常用的在线工具'
    },
    {
        'id': 4,
        'category': '数学基础',
        'name': '微积分',
        'links': [
            {'title': 'B站微积分视频', 'url': 'https://www.bilibili.com/video/BV1ez4y1X7eF/'},
            {'title': '知乎微积分专栏', 'url': 'https://www.zhihu.com/column/c_1270480571259117568'},
            {'title': 'CSDN微积分笔记', 'url': 'https://blog.csdn.net/weixin_43835757/article/details/106048040'}
        ],
        'description': '微积分基础课程及学习资料'
    },
    {
        'id': 5,
        'category': '数学基础',
        'name': '线性代数',
        'links': [
            {'title': 'B站线性代数视频', 'url': 'https://www.bilibili.com/video/BV1ix411f7Yp/'},
            {'title': '知乎线性代数专栏', 'url': 'https://www.zhihu.com/column/c_1265103401088585728'},
            {'title': 'CSDN线性代数笔记', 'url': 'https://blog.csdn.net/qq_41880073/article/details/103896795'}
        ],
        'description': '线性代数基础课程及学习资料'
    },
    {
        'id': 6,
        'category': '编程学习',
        'name': 'C程序设计',
        'links': [
            {'title': 'B站C语言视频', 'url': 'https://www.bilibili.com/video/BV1sJ411K7oF/'},
            {'title': 'C语言中文网', 'url': 'https://www.runoob.com/cprogramming/c-tutorial.html'},
            {'title': 'CSDNC语言教程', 'url': 'https://blog.csdn.net/qq_45677671/article/details/105604703'}
        ],
        'description': 'C语言程序设计学习资料'
    }
]

# 模拟讨论区数据
discussions = [
    {
        'id': 1,
        'resource_id': 1,
        'username': '小明',
        'content': 'Python入门有什么推荐的视频课程吗？',
        'timestamp': '2024-05-20 14:30:00'
    },
    {
        'id': 2,
        'resource_id': 1,
        'username': '小红',
        'content': '我觉得廖雪峰的教程就很好，通俗易懂。',
        'timestamp': '2024-05-20 15:45:00'
    }
]

# 在线用户管理
online_users = {}

@app.route('/')
def index():
    return render_template('index.html', resources=resources)

@app.route('/study_room')
def study_room():
    # 计算在线人数
    online_count = len(online_users)
    return render_template('study_room.html', online_count=online_count)

@app.route('/discussion/<int:resource_id>')
def discussion(resource_id):
    # 获取资源信息
    resource = next((r for r in resources if r['id'] == resource_id), None)
    if resource is None:
        # 如果资源不存在，重定向到首页
        return redirect(url_for('index'))
    # 获取对应资源的讨论
    resource_discussions = [d for d in discussions if d['resource_id'] == resource_id]
    return render_template('discussion.html', resource=resource, discussions=resource_discussions)

@app.route('/api/join_study', methods=['POST'])
def join_study():
    username = request.form.get('username', '匿名用户')
    user_id = request.remote_addr  # 使用IP作为临时用户ID
    
    if user_id not in online_users:
        online_users[user_id] = {
            'username': username,
            'join_time': datetime.now()
        }
    
    return jsonify({'status': 'success', 'online_count': len(online_users)})

@app.route('/api/leave_study', methods=['POST'])
def leave_study():
    user_id = request.remote_addr
    if user_id in online_users:
        del online_users[user_id]
    
    return jsonify({'status': 'success', 'online_count': len(online_users)})

@app.route('/api/send_message', methods=['POST'])
def send_message():
    resource_id = int(request.form.get('resource_id', 0))
    username = request.form.get('username', '匿名用户')
    content = request.form.get('content', '').strip()
    
    # 验证内容不为空
    if not content:
        return jsonify({'status': 'error', 'message': '内容不能为空'})
    
    # 验证资源是否存在
    resource = next((r for r in resources if r['id'] == resource_id), None)
    if not resource:
        return jsonify({'status': 'error', 'message': '资源不存在'})
    
    # 创建新消息
    new_msg = {
        'id': len(discussions) + 1,
        'resource_id': resource_id,
        'username': username,
        'content': content,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    discussions.append(new_msg)
    return jsonify({'status': 'success', 'message': new_msg})

@app.route('/api/get_online_count')
def get_online_count():
    return jsonify({'online_count': len(online_users)})

@app.route('/upload')
def upload():
    return render_template('upload.html', resources=resources)

@app.route('/upload_file', methods=['POST'])
def upload_file():
    # 检查是否有文件上传
    if 'file' not in request.files:
        flash('未选择文件', 'error')
        return redirect(request.url)
    
    file = request.files['file']
    title = request.form.get('title', '')
    resource_id = int(request.form.get('resource_id', 0))
    
    # 检查文件是否为空
    if file.filename == '':
        flash('未选择文件', 'error')
        return redirect(request.url)
    
    # 检查文件是否允许上传
    if not allowed_file(file.filename):
        flash('文件类型不允许', 'error')
        return redirect(request.url)
    
    # 检查资源是否存在
    resource = next((r for r in resources if r['id'] == resource_id), None)
    if not resource:
        flash('资源不存在', 'error')
        return redirect(request.url)
    
    # 生成唯一的文件名
    filename = str(uuid.uuid4()) + '_' + file.filename
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    # 将文件添加到资源的文件列表
    if 'files' not in resource:
        resource['files'] = []
    
    resource['files'].append({
        'title': title,
        'filename': filename,
        'original_filename': file.filename,
        'upload_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })
    
    flash('文件上传成功', 'success')
    return redirect(url_for('upload'))

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

if __name__ == '__main__':
    # 创建templates和static目录
    for folder in ['templates', 'static', 'static/css', 'static/js']:
        if not os.path.exists(folder):
            os.makedirs(folder)
    
    app.run(debug=False, host='0.0.0.0', port=8000)