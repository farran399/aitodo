from flask_sqlalchemy import SQLAlchemy # 数据库
from datetime import datetime

db = SQLAlchemy()
    
class Users(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(16), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 建立与Chat的关系
    chats = db.relationship('Chat', backref='users', lazy=True)
    
    def __init__(self, username, password):
        self.username = username
        self.password = password
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def __str__(self):
        return f'User(id={self.id}, username={self.username}, created_at={self.created_at})'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat()
        }

class Chat(db.Model):
    __tablename__ = 'chat'
    
    chat_session_id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 建立与Message的关系
    messages = db.relationship('Message', backref='chat', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, chat_session_id, user_id):
        self.chat_session_id = chat_session_id
        self.user_id = user_id
    
    def __repr__(self):
        return f'<Chat {self.chat_session_id}>'
    
    def __str__(self):
        return f'Chat(session_id={self.chat_session_id}, user_id={self.user_id}, created_at={self.created_at})'
    
    def to_dict(self):
        return {
            'chat_session_id': self.chat_session_id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat(),
            'messages': [message.to_dict() for message in self.messages]
        }

class Message(db.Model):
    __tablename__ = 'message'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    chat_session_id = db.Column(db.String(50), db.ForeignKey('chat.chat_session_id'))
    content = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, chat_session_id, content, role):
        self.chat_session_id = chat_session_id
        self.content = content
        self.role = role
    
    def __repr__(self):
        return f'<Message {self.id}>'
    
    def __str__(self):
        return f'Message(id={self.id}, role={self.role}, content={self.content[:50]}...)'
    
    def to_dict(self):
        return {
            'id': self.id,
            'chat_session_id': self.chat_session_id,
            'content': self.content,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }
