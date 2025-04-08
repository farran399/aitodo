import './Main.css';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // 导入 Framer Motion 动画库的组件
import logo from '../asset/logo.svg'; // 确保logo.svg在正确的位置
import Chat from '../components/Chat';
import Cookies from 'js-cookie';

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function Main() {
  // 状态管理
  const [isLoading, setIsLoading] = useState(false); // 控制加载状态
  const [searchText, setSearchText] = useState(''); // 输入框的文本内容
  const [showResult, setShowResult] = useState(false); // 控制结果和动画的显示状态
  const isReasoning = useRef(true);//推理数据
  const graphData = useRef('');//图表数据
  const leftBrace = useRef(0);//左大括号数量
  const graphing = useRef(false);//是否正在读取图表数据
  const [chatData, setChatData] = useState([]);//聊天记录
  const [isNavExpanded, setIsNavExpanded] = useState(true); // 添加导航栏展开状态
  const [chatSessionId, setChatSessionId] = useState('default');//聊天会话ID

  // 导航栏动画配置
  const navVariants = {
    expanded: {
      width: '20vw',
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    collapsed: {
      width: '5vw',
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  };

  // 导航栏标题动画配置
  const navTitleVariants = {
    expanded: {
      fontSize: '2rem',
      opacity: 1,
      transition: {
        duration: 0.3
      }
    },
    collapsed: {
      fontSize: '0',
      opacity: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  // 导航栏Logo动画配置
  const logoVariants = {
    expanded: {
      opacity: 0,
      scale: 0,
      transition: {
        duration: 0.3
      }
    },
    collapsed: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  // 处理搜索按钮点击事件
  const handleSearch = async () => {
    const token = Cookies.get('token');
    if (!token) {
      // 如果没有 token，重定向到登录页面
      window.location.href = '/login';
      return;
    }

    isReasoning.current = true;
    setIsLoading(true); // 开始加载
    setShowResult(true); // 触发动画和结果显示
    graphData.current = ''
    try {
      // 创建响应解码器
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
      // 发送消息

      setChatData([{
        id: generateUniqueId(),
        type: 'user',
        content: searchText
      }]);

      setChatData(prevChatData => {
        return [...prevChatData, {
          id: generateUniqueId(),
          type: 'reasonContent',
          content: ''
        }];
      });
      // 获取响应的可读流
      const reader = response.body.getReader();

      // 循环读取数据流
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        // 将接收到的数据块解码为文本
        try {
          let decodedValue = decoder.decode(value, { stream: true })
          let partValue = '';
          // 拆分读取数据流
          while (decodedValue.indexOf('}\n{') !== -1) {
            partValue = decodedValue.substring(0, decodedValue.indexOf('}\n{') + 1);
            // 更新显示的数据
            handleDataUpdate(partValue);
            decodedValue = decodedValue.substring(decodedValue.indexOf('}\n{') + 2);
          }
          partValue = decodedValue;
          handleDataUpdate(partValue);
        } catch (e) {
          console.error('数据解析错误:', e);
          console.error('待解析的数据:', decoder.decode(value, { stream: true }));
        }
      }
    } catch (err) {
      console.error('请求错误:', err);
    }
  };

  //数据处理函数
  const handleDataUpdate = (value) => {
    let reciveData = JSON.parse(value);
    let newData = reciveData.content;
    let type = reciveData.type;
    // 判断是否需要更新聊天ID
    if (type ===-1 ) {
      setChatSessionId(reciveData.content);
    }else{
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

  // 搜索框容器的动画配置
  const searchContainerVariants = {
    initial: { // 初始状态
      y: 0,
      scale: 1
    },
    animate: { // 动画后的状态
      y: "30vh", // 向下移动屏幕高度的 30%
      scale: 0.7, // 缩小到原来的 70%
      transition: {
        type: "spring", // 使用弹簧动画
        stiffness: 50, // 弹簧刚度，值越小动画越柔和
        damping: 30 // 阻尼，控制弹簧的"弹跳"程度
      }
    }
  };
  // 标题的动画配置
  const titleVariants = {
    initial: { // 初始状态
      fontSize: "4.2rem",
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1
    },
    animate: { // 动画后的状态
      opacity: 0,
    }
  };

  // 加载动画的配置
  const spinnerVariants = {
    animate: {
      rotate: 360, // 360度旋转
      transition: {
        duration: 1, // 持续1秒
        repeat: Infinity, // 无限重复
        ease: "linear" // 线性动画，保持匀速旋转
      }
    }
  };

  // 结果显示的动画配置
  const resultVariants = {
    initial: { opacity: 0, y: 20 }, // 初始状态：透明且略微向下偏移
    animate: { // 显示状态
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    },
    exit: { // 退出状态
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className="main">
      <motion.div
        className="nav-container"
        variants={navVariants}
        animate={isNavExpanded ? 'expanded' : 'collapsed'}
      >
        <div className="nav-header">
          <motion.h1
            className="nav-title"
            variants={navTitleVariants}
            animate={isNavExpanded ? 'expanded' : 'collapsed'}
          >
            轻绘
          </motion.h1>
          <motion.img
            src={logo}
            className="nav-logo"
            variants={logoVariants}
            animate={isNavExpanded ? 'expanded' : 'collapsed'}
          />
          <button
            className="nav-toggle"
            onClick={() => setIsNavExpanded(!isNavExpanded)}
          >
            {isNavExpanded ? '◀' : '▶'}
          </button>
        </div>
      </motion.div>

      <div className="chat-container">
        <div className="content-wrapper">
          {/* 标题动画组件 */}
          <motion.h1
            className="title"
            data-text="轻绘"
            variants={titleVariants}
            initial="initial"
            animate={showResult ? "animate" : "initial"}
          >
            轻绘
          </motion.h1>
          {/* 搜索框容器动画组件 */}
          <motion.div
            className="search-container"
            variants={searchContainerVariants}
            initial="initial"
            animate={showResult ? "animate" : "initial"}
            style={{
              width: '70vw',
            }}
          >
            <motion.input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchText !== '') {
                  e.preventDefault(); // 防止默认行为
                  handleSearch();
                }
              }}
              className="search-input"
              placeholder="输入您的问题..."
              style={{
                width: '100%',
              }}
            />
            <button className="magic-button" onClick={handleSearch}>
              <span className="magic-wand">✨</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* AnimatePresence 允许动画组件在移除时也能显示动画效果 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="result-container"
            style={{
              position: 'fixed',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              height: '60vh', // 固定最大高度
              width: '80vw', // 固定宽度
              display: 'flex',
              borderRadius: '10px',
            }}
          >
            {/* 根据加载状态显示不同内容 */}
            <motion.div
              variants={resultVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="result"
              style={{
                padding: '20px',
                height: '100%', // 充满父容器
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap', // 保留换行符和空格
              }}
            >
              <Chat chatList={chatData} />
              {isLoading && (
                // 加载动画
                <motion.div
                  variants={spinnerVariants}
                  animate="animate"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #007bff',
                    borderRadius: '50%',
                    margin: '20px auto'
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Main;
