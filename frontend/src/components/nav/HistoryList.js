import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import History from './History';
import './HistoryList.css';

/**
 * HistoryList组件 - 显示聊天历史列表
 * @param {Object} props 
 * @param {Array} props.historyList - 聊天历史记录列表
 * @param {Function} props.onHistoryClick - 点击历史记录的回调函数
 */
const HistoryList = ({ historyList,onHistoryClick }) => {

  return (
    <div className="history-list">
      {historyList.map((chat) => (
        <History
          key={chat.chat_session_id}
          chatSessionId={chat.chat_session_id}
          userInput={chat.user_input}
          onClick={onHistoryClick}
        />
      ))}
    </div>
  );
};

export default HistoryList;