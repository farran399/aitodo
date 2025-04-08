# flask主程序
from flask import Flask, jsonify, Response, request,current_app
from flask_cors import CORS
from tools import generate_with_record  # 处理火山方舟API
from sqlScript.sessionGenerator import SessionIDGenerator  # 雪花算法生成session_id
from database import db,Chat,Message,Users  # 配置数据库
from flask_sqlalchemy import SQLAlchemy  # 数据库
import hashlib  # 用于MD5加密
import jwt
from functools import wraps
from datetime import datetime, timedelta


class BaseConfig(object):

    # 数据库的配置
    DIALCT = "mysql"
    DRITVER = "pymysql"
    HOST = '127.0.0.1'
    PORT = "3306"
    USERNAME = "root"
    PASSWORD = "123456"
    DBNAME = 'aitodo'

    SQLALCHEMY_DATABASE_URI = f"{DIALCT}+{DRITVER}://{USERNAME}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?charset=utf8"
    SQLALCHEMY_TRACK_MODIFICATIONS = True

    # JWT配置
    JWT_SECRET_KEY = "Aitodo816*"  # 用于签名JWT的密钥
    JWT_EXPIRE_HOURS = 24  # Token过期时间（小时）


app = Flask(__name__)
app.config.from_object(BaseConfig)  # 配置数据库
db.init_app(app)
CORS(app)  # 全局启用跨域支持
app.debug = True  # 调试模式，用于开发环境

# JWT认证中间件


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # 从请求头中获取token
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # 提取Bearer token
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({
                    'success': False,
                    'message': '无效的认证头部'
                }), 401

        if not token:
            return jsonify({
                'success': False,
                'message': '缺少认证Token'
            }), 401

        try:
            # 验证Token
            data = jwt.decode(
                token,
                app.config['JWT_SECRET_KEY'],
                algorithms=["HS256"]
            )

            # 获取当前用户
            current_user = Users.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': '用户不存在'
                }), 401

        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'message': 'Token已过期'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'message': '无效的Token'
            }), 401

        # 将用户信息传递给被装饰的函数
        return f(current_user, *args, **kwargs)

    return decorated


# 流式响应处理


@app.route('/api/login', methods=['POST'])
def login():
    try:
        # 获取登录数据
        data = request.get_json()

        # 验证数据完整性
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({
                'success': False,
                'message': '登录信息不完整'
            }), 400

        username = data['username']
        password = data['password']

        # 查询用户
        user = Users.query.filter_by(username=username).first()
        if not user:
            return jsonify({
                'success': False,
                'message': '用户名或密码错误'
            }), 401

        # 验证密码
        salt = "Aitodo816*"
        salted_password = password + salt
        md5 = hashlib.md5()
        md5.update(salted_password.encode('utf-8'))
        encrypted_password = md5.hexdigest()

        if user.password != encrypted_password:
            return jsonify({
                'success': False,
                'message': '用户名或密码错误'
            }), 401

        # 生成Token
        token = jwt.encode(
            {
                'user_id': user.id,
                'username': user.username,
                # 设置过期时间
                'exp': datetime.utcnow() + timedelta(
                    hours=app.config['JWT_EXPIRE_HOURS']
                )
            },
            app.config['JWT_SECRET_KEY'],
            algorithm="HS256"
        )

        # 返回Token和用户信息
        return jsonify({
            'success': True,
            'message': '登录成功',
            'data': {
                'token': token,
                'user': {
                    'id': user.id,
                    'username': user.username
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500


@app.route('/api/register', methods=['POST'])
def register():
    try:
        # 获取POST请求中的数据
        data = request.get_json()

        # 验证请求数据是否完整
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({
                'success': False,
                'message': '注册信息不完整'
            }), 400

        username = data['username']
        password = data['password']

        # 检查用户名长度
        if len(username) < 3 or len(username) > 20:
            return jsonify({
                'success': False,
                'message': '用户名长度必须在3-20个字符之间'
            }), 400

        # 检查密码长度
        if len(password) < 6 or len(password) > 16:
            return jsonify({
                'success': False,
                'message': '密码长度必须在6-16个字符之间'
            }), 400

        # 查询用户名是否已存在
        existing_user = Users.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': '用户名已存在'
            }), 409  # 409 Conflict

        # 密码加盐处理
        salt = "Aitodo816*"  # 加盐字符串
        salted_password = password + salt

        # MD5加密
        md5 = hashlib.md5()
        md5.update(salted_password.encode('utf-8'))
        encrypted_password = md5.hexdigest()

        # 创建新用户
        new_user = Users(
            username=username,
            password=encrypted_password
        )

        # 将新用户添加到数据库
        try:
            db.session.add(new_user)
            db.session.commit()

            # 返回成功信息
            return jsonify({
                'success': True,
                'message': '注册成功',
                'data': {
                    'user_id': new_user.id,
                    'username': new_user.username,
                    'created_at': new_user.created_at.isoformat()
                }
            }), 201  # 201 Created

        except Exception as e:
            # 数据库操作失败，回滚事务
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'数据库错误: {str(e)}'
            }), 500

    except Exception as e:
        # 处理其他可能的错误
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500

# 新对话
@app.route('/api/new_chat', methods=['POST'])
@token_required
def newchat(current_user):
    try:
        dialog = request.get_json()
        if not dialog or 'content' not in dialog:
            return jsonify({'error': '没有接收到content数据'}), 400

        input_content = dialog['content']
        session_id = SessionIDGenerator().generate()
        
        # 创建聊天记录
        chat = Chat(
            chat_session_id=session_id,
            user_id=current_user.id,
            user_input=input_content,
        )
        
        try:
            db.session.add(chat)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'创建新对话失败: {str(e)}'}), 500

        # 创建生成器函数并确保应用上下文
        def generate_stream():
            with app.app_context():
                try:
                    for chunk in generate_with_record(input_content, session_id):
                        yield chunk
                except Exception as e:
                    yield '''{"error":"流式响应异常","type":-2}\n'''

        return Response(generate_stream(), mimetype='application/json')

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500

# 发送消息
@app.route('/api/message', methods=['POST'])
@token_required
def chat(current_user):
    try:
        dialog = request.get_json()
        if not dialog or 'content' not in dialog or 'session_id' not in dialog:
            return jsonify({'error': '缺少必要参数'}), 400

        input_content = dialog['content']
        session_id = dialog['session_id']

        # 创建生成器函数并确保应用上下文
        def generate_stream():
            with app.app_context():
                try:
                    for chunk in generate_with_record(input_content, session_id):
                        yield chunk
                except Exception as e:
                    yield '''{"error":"流式响应异常","type":-2}\n'''

        return Response(generate_stream(), mimetype='application/json')

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500

# 获取聊天记录
@app.route('/api/user_chats', methods=['GET'])
@token_required
def get_chat(current_user):
    try:
        # 获取当前用户的所有聊天记录
        chats = Chat.query.filter_by(user_id=current_user.id).order_by(Chat.created_at.desc()).all()

        # 转换为字典列表
        chat_list = [chat.to_dict() for chat in chats]
        
        return jsonify({
            'success': True,
            'message': '获取对话列表成功',
            'data': chat_list
        }), 200

    except Exception as e:
        return jsonify({
           'success': False,
           'message': f'服务器错误: {str(e)}'
        }), 500

@app.route('/api/chat/<session>/', methods=['GET'])
@token_required
def get_chat_by_session(session):
    try:
        # 获取指定session的所有聊天记录
        chats = Message.query.filter_by(chat_session_id=session).order_by(Message.created_at.desc()).all()
        # 转换为字典列表
        chat_list = [chat.to_dict() for chat in chats]

        return jsonify({
           'success': True,
           'message': '获取聊天记录成功',
            'data': chat_list
        }), 200

    except Exception as e:
        return jsonify({
          'success': False,
          'message': f'服务器错误: {str(e)}'
        }), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)
