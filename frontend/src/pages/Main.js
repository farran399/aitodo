import './Main.css';
import { useState, useRef, useEffect } from 'react';
import logo from '../asset/logo.svg';
import Chat from '../components/content/Chat';
import Cookies from 'js-cookie';
import HistoryList from '../components/nav/HistoryList';

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function Main() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const isReasoning = useRef(true);
  const graphData = useRef('');
  const leftBrace = useRef(0);
  const graphing = useRef(false);
  const [chatData, setChatData] = useState([]);
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [chatSessionId, setChatSessionId] = useState('default');
  const [historyList, setHistoryList] = useState([]);

  
  const fetchChatHistory = async () => {
    const token = Cookies.get('token');
    if (!token) {
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/user_chats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setHistoryList(data.data);
      } else {
        console.error('获取聊天记录失败:', data.message);
      }
    } catch (err) {
      console.error('获取聊天记录错误:', err);
    }
  };
  useEffect(() => {
    fetchChatHistory();
  }, []);

  const sessionChange = async () => {
    const token = Cookies.get('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      let response;

      if (chatSessionId === 'default') {
        setChatData([]);
      }
      else {
        response = await fetch(`http://localhost:5000/api/chat/${chatSessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        })

        const chat_history = await response.json();

        if (chat_history.success) {
          setChatData([])
          setChatData(chat_history.data.map(item =>
            item.message_type === 'graph'  // 处理图表数据
              ? { id:generateUniqueId(),type: item.type, content: JSON.parse(item.content)}
              : { id:generateUniqueId(),type: item.type, content: item.content }
          ))
          console.log(chatData);
        } else {
          console.error('获取聊天记录失败:', chat_history.message);
        }
      }
    } catch (err) {
      console.error('获取聊天记录错误:', err);
    }
  }

  const handleSearch = async () => {
    const token = Cookies.get('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    isReasoning.current = true;
    setIsLoading(true);
    setShowResult(true);
    graphData.current = '';

    try {
      const decoder = new TextDecoder();
      let response;

      if (chatSessionId === 'default') {
        response = await fetch('http://localhost:5000/api/new_chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content: searchText })
        });
      } else {
        response = await fetch('http://localhost:5000/api/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content: searchText, session_id: chatSessionId })
        });
      }

      setChatData(prevChatData => [...prevChatData, {
        id: generateUniqueId(),
        type: 'user',
        content: searchText
      }]);

      setChatData(prevChatData => [...prevChatData, {
        id: generateUniqueId(),
        type: 'reasonContent',
        content: ''
      }]);

      fetchChatHistory();
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        try {
          let decodedValue = decoder.decode(value, { stream: true });
          let partValue = '';
          while (decodedValue.indexOf('}\n{') !== -1) {
            partValue = decodedValue.substring(0, decodedValue.indexOf('}\n{') + 1);
            handleDataUpdate(partValue);
            decodedValue = decodedValue.substring(decodedValue.indexOf('}\n{') + 2);
          }
          partValue = decodedValue;
          handleDataUpdate(partValue);
        } catch (e) {
          console.error('数据解析错误:', e);
        }
      }
    } catch (err) {
      console.error('请求错误:', err);
    }
  };

  const handleDataUpdate = (value) => {
    let reciveData = JSON.parse(value);
    let newData = reciveData.content;
    let type = reciveData.type;
    // 判断是否需要更新聊天ID
    if (type === -1) {
      setChatSessionId(reciveData.content);
    } else {
      if (type === 1 && isReasoning.current === true) {
        isReasoning.current = false;
        setChatData(prevChatData => {
          return [...prevChatData, {
            id: generateUniqueId(),
            type: 'content',
            content: ''
          }];
        });
      }
      if (type === 0 && isReasoning.current === false) {
        isReasoning.current = true;
        setChatData(prevChatData => {
          return [...prevChatData, {
            id: generateUniqueId(),
            type: 'reasonContent',
            content: ''
          }];
        });
      }
      // 开始读图表json
      else if (!isReasoning.current && newData.match('{') && newData.match("{").length > 0) {
        leftBrace.current += newData.match("{").length;
        if (graphing.current === false) {
          graphing.current = true;
        }
        setIsLoading(true);
      }
      if (leftBrace.current > 0) {
        graphData.current += newData;
      }
      // 正常内容更新
      else if (!graphing.current) {
        setIsLoading(false);

        setChatData(prevChatData => {
          const lastItem = prevChatData[prevChatData.length - 1];
          return prevChatData.map(item =>
            item.id === lastItem.id  // 使用最后一项的ID而不是chatID
              ? { ...item, content: item.content + newData }
              : item
          );
        });
      }

      // 结束读图表json
      if (!isReasoning.current && newData.match('}') && newData.match('}').length > 0) {
        leftBrace.current -= newData.match('}').length;
        if (leftBrace.current === 0 && graphing.current) {
          graphing.current = false;
          // 找到第一个 { 和最后一个 } 的位置
          const firstBrace = graphData.current.indexOf('{');
          const lastBrace = graphData.current.lastIndexOf('}');

          if (firstBrace === -1 || lastBrace === -1) {
            console.error('图表数据格式错误：未找到完整的JSON对象');
            console.error('图表数据:', graphData.current);
            return null;
          }
          graphData.current = graphData.current.substring(firstBrace, lastBrace + 1);

          try {
            // 解析预处理后的图表数据
            const parsedChartData = new Function(`return ${graphData.current}`)();
            // 添加新的图表
            setIsLoading(false);
            setChatData(prevChatData => {
              return [...prevChatData, {
                id: generateUniqueId(),
                type: 'graph',
                content: parsedChartData
              }];
            });
            setChatData(prevChatData => {
              return [...prevChatData, {
                id: generateUniqueId(),
                type: 'content',
                content: ''
              }];
            });
            graphData.current = ''
          } catch (e) {
            console.error('图表数据解析失败:', e);
            console.error('待解析的数据:', graphData.current);
          }
        }
      }
    }
  };

  // 处理历史记录点击的回调函数
  const handleHistoryClick = (sessionId) => {
    setChatSessionId(sessionId);
    sessionChange();
    setShowResult(true); // 显示结果区域
  };

  return (
    <div className="main">
      <div className={`nav-container ${isNavExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="nav-header">
          <h1 className={`nav-title ${isNavExpanded ? '' : 'hidden'}`}>轻绘</h1>
          <img
            src={logo}
            className={`nav-logo ${isNavExpanded ? 'hidden' : ''}`}
            alt="logo"
          />
          <button
            className="nav-toggle"
            onClick={() => setIsNavExpanded(!isNavExpanded)}
          >
            {isNavExpanded ? '◀' : '▶'}
          </button>
        </div>

        {/* 添加历史记录列表 */}
        {isNavExpanded &&
          <HistoryList
            historyList={historyList}
            onHistoryClick={handleHistoryClick} />
        }
      </div>

      <div className="content-wrapper">
        {/* 只在未显示结果时渲染标题 */}
        {!showResult && (
          <h1 className="title">轻绘</h1>
        )}

        {/* 结果容器 */}
        {showResult && (
          <div className="result-container">
            <Chat chatList={chatData} />
            {isLoading && <div className="spinner"></div>}
          </div>
        )}

        {/* 搜索容器 */}
        <div className="search-container">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchText !== '') {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="search-input"
            placeholder="输入您的问题..."
          />
          <button className="magic-button" onClick={handleSearch}>
            <span className="magic-wand">✨</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Main;
