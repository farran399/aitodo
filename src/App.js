import './App.css';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion'; // 导入 Framer Motion 动画库的组件

function App() {
  // 状态管理
  const [data, setData] = useState(''); // 改为字符串类型，用于存储流式数据
  const [isLoading, setIsLoading] = useState(false); // 控制加载状态
  const [searchText, setSearchText] = useState(''); // 输入框的文本内容
  const [showResult, setShowResult] = useState(false); // 控制结果和动画的显示状态
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true); // 控制是否自动滚动
  const resultRef = useRef(null); // 结果容器的引用

  // 自动滚动到底部的函数
  const scrollToBottom = () => {
    if (resultRef.current && shouldAutoScroll) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  };

  // 监听数据变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [data]);

  // 处理用户滚动事件
  const handleScroll = (e) => {
    const element = e.target;
    const isScrolledToBottom = 
      Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;
    
    // 只有当用户主动向上滚动时才禁用自动滚动
    if (!isScrolledToBottom && shouldAutoScroll) {
      setShouldAutoScroll(false);
    }
    
    // 当用户手动滚动到底部时重新启用自动滚动
    if (isScrolledToBottom && !shouldAutoScroll) {
      setShouldAutoScroll(true);
    }
  };

  // 处理搜索按钮点击事件
  const handleSearch = async () => {
    setIsLoading(true); // 开始加载
    setShowResult(true); // 触发动画和结果显示
    setData(''); // 清空之前的数据
    setShouldAutoScroll(true); // 重置自动滚动状态

    try {
      // 创建响应解码器
      const decoder = new TextDecoder();
      
      const response = await fetch('http://localhost:5000/api/judge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: searchText })
      });
      setIsLoading(false);// 结束加载状态

      // 获取响应的可读流
      const reader = response.body.getReader();
      
      // 循环读取数据流
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 将接收到的数据块解码为文本
        const chunk = decoder.decode(value, { stream: true });
        
        // 更新显示的数据
        setData(prevData => prevData + chunk);
      }
    } catch (err) {
      console.error('请求错误:', err);
      setData('发生错误: ' + err.message);
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
      y: 0,
      x: 0,
      scale: 1
    },
    animate: { // 动画后的状态
      fontSize: "3rem", // 字体缩小
      y: "-30vh", // 向上移动
      x: "-40vw", // 向左移动
      scale: 0.8, // 整体缩放
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 30
      }
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
    <div className="App">
      <div className="content-wrapper">
        {/* 标题动画组件 */}
        <motion.h1
          className="title"
          data-text="AI to DO"
          variants={titleVariants}
          initial="initial"
          animate={showResult ? "animate" : "initial"}
        >
          AI to DO
        </motion.h1>
        {/* 搜索框容器动画组件 */}
        <motion.div
          className="search-container"
          variants={searchContainerVariants}
          initial="initial"
          animate={showResult ? "animate" : "initial"}
        >
          <input
            type="text"
            className="search-input"
            placeholder="输入内容..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button className="magic-button" onClick={handleSearch}>
            <span className="magic-wand">✨</span>
          </button>
        </motion.div>
      </div>

      {/* AnimatePresence 允许动画组件在移除时也能显示动画效果 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="result-container"
            style={{
              position: 'fixed',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              maxHeight: '60vh', // 固定最大高度
              width: '80vw', // 固定宽度
              overflow: 'hidden', // 隐藏溢出内容
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
            }}
          >
            {/* 根据加载状态显示不同内容 */}
            {isLoading ? (
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
            ) : (
              // 结果显示
              <motion.div
                ref={resultRef}
                variants={resultVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="result-text"
                onScroll={handleScroll}
                style={{
                  padding: '20px',
                  color: '#fff',
                  overflowY: 'auto', // 添加垂直滚动条
                  maxHeight: '100%', // 充满父容器
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap', // 保留换行符和空格
                  scrollBehavior: 'smooth', // 平滑滚动
                  '&::webkitscrollbar': {
                    width: '8px'
                  },
                  '&::webkitscrollbartrack': {
                    background: 'rgba(255, 255, 255, 0.1)'
                  },
                  '&::webkitscrollbarthumb': {
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '4px'
                  }
                }}
              >
                {data}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
