import React from 'react';
import './History.css';

/**
 * History组件 - 显示单个聊天历史记录
 * @param {Object} props 
 * @param {string} props.chatSessionId - 聊天会话ID
 * @param {string} props.userInput - 用户输入内容
 * @param {Function} props.onClick - 点击回调函数
 */
const History = ({ chatSessionId, userInput, onClick }) => {
  // 限制显示长度，避免过长
  const displayText = userInput.length > 20 
    ? `${userInput.substring(0, 30)}...` 
    : userInput;

  return (
    <div 
      className="history-item"
      onClick={() => onClick(chatSessionId)}
    >
      {displayText}
    </div>
  );
};

export default History;