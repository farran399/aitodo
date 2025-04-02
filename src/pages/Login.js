import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../asset/logo.svg';
import Cookies from 'js-cookie';

function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  // 处理输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      if (isLogin) {
        // 登录成功，保存token到cookie
        Cookies.set('token', data.data.token, { expires: 7 }); // 1天过期
        Cookies.set('user', JSON.stringify(data.data.user), { expires: 7 });
        navigate('/'); // 导航到主页
      } else {
        // 注册成功，切换到登录
        setIsLogin(true);
        setFormData({ username: '', password: '' });
      }
    } catch (err) {
      setError('服务器错误，请稍后重试');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo" />
          <h1 className="login-title">轻绘</h1>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="用户名"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="密码"
              required
              minLength={6}
              maxLength={16}
            />
          </div>

          <button type="submit" className="submit-button">
            {isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="form-footer">
          <span
            className="switch-mode"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData({ username: '', password: '' });
              setError('');
            }}
          >
            {isLogin ? '立即注册' : '返回登录'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;
