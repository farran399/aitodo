import './App.css';
import { useState, useRef } from 'react';
import Chart from './chart';  // 导入已有的 chart 组件
import { motion, AnimatePresence } from 'framer-motion'; // 导入 Framer Motion 动画库的组件

function App() {
  // 状态管理
  const [isLoading, setIsLoading] = useState(false); // 控制加载状态
  const [searchText, setSearchText] = useState(''); // 输入框的文本内容
  const [showResult, setShowResult] = useState(false); // 控制结果和动画的显示状态
  const resultRef = useRef(null); // 结果容器的引用
  const [charts, setCharts] = useState([]); // 用于存储图表组件列表
  const [accumulatedData, setAccumulatedData] = useState('');
  const accumulatedDataRef = useRef(''); // 添加 ref 来实时追踪数据
  const leftBrace = useRef(0);
  const [graphing, setGraphing] = useState(false);
  const [data, setData] = useState(''); // 改为字符串类型，用于存储流式数据

  // 处理搜索按钮点击事件
  const handleSearch = async () => {
    setIsLoading(true); // 开始加载
    setShowResult(true); // 触发动画和结果显示
    setData('') // 清空之前的数据
    accumulatedDataRef.current = ''
    try {
      // 创建响应解码器
      const decoder = new TextDecoder();

      const response = await fetch('http://localhost:5000/api/achieve', {
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
        if (done) {
          break;
        }
        // 将接收到的数据块解码为文本
        const chunk = decoder.decode(value, { stream: true });

        // 更新显示的数据
        handleDataUpdate(chunk);
      }
    } catch (err) {
      console.error('请求错误:', err);
      setData('发生错误: ' + err.message);
    }
  };

  //数据处理函数
  const handleDataUpdate = (newData) => {
    let startIndex = data.length;
    // 开始读图表json
    if(newData.match(/{/g).length>0){
      leftBrace.current += newData.match(/{/g).length;
      setGraphing(true);
    }
    // 结束读图表json
    if(newData.match(/}/g).length>0){
      leftBrace.current -= newData.match(/}/g).length;
      if(leftBrace.current==0){
        setGraphing(false);
      }
    }
    // 使用 ref 来实时更新和访问数据
    accumulatedDataRef.current += newData;
    setAccumulatedData(accumulatedDataRef.current);

    // 检查是否包含完整的图表数据
    const checkAndExtractChart = (data) => {
      let startIndex = data.indexOf('AAAAA');
      if (startIndex === -1) return null;

      let endIndex = data.indexOf('BBBBB', startIndex);
      if (endIndex === -1) return null;

      // 提取AAAA和BBBB之间的内容
      let chartData = data.substring(startIndex + 4, endIndex);

      // 预处理图表数据
      const processChartData = (rawData) => {
        // 找到第一个 { 和最后一个 } 的位置
        const firstBrace = rawData.indexOf('{');
        const lastBrace = rawData.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
          console.error('图表数据格式错误：未找到完整的JSON对象');
          return null;
        }

        // 只保留 {} 之间的内容
        return rawData.substring(firstBrace, lastBrace + 1);
      };

      const processedData = processChartData(chartData);
      if (!processedData) return null;

      console.log('处理后的图表数据:', processedData);

      return {
        chartData: processedData,
        remainingText: data.substring(0, startIndex) + data.substring(endIndex + 4)
      };
    };

    const extraction = checkAndExtractChart(accumulatedDataRef.current);

    if (extraction) {
      try {
        // 解析预处理后的图表数据

        console.log('当前的数据长度:', extraction.chartData.length);
        console.log('当前的数据:', extraction.chartData);
        const parsedChartData = JSON.parse(extraction.chartData);

        // 添加新的图表
        // setCharts(prevCharts => [...prevCharts, {
        //   id: Date.now(),
        //   options: parsedChartData
        // }]);
        setCharts([{id: Date.now(),
             options: parsedChartData}])

        // 更新文本和累积数据
        setData(prevData => prevData + extraction.remainingText);
        accumulatedDataRef.current = extraction.remainingText;
        setAccumulatedData(extraction.remainingText);
      } catch (e) {
        console.error('图表数据解析失败:', e);
        console.error('待解析的数据:', extraction.chartData);
        setData(prevData => prevData + newData);
      }
    } else {
      // 如果没有完整的图表数据，就更新显示文本
        setData(prevData => prevData + newData);
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
          data-text="AItoDO"
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
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              width: '100%',
              boxSizing: 'border-box'
            }}
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
                {charts.map(chart => (
                  <div key={chart.id} style={{ margin: '20px 0' }}>
                    <Chart options={chart.options} />
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
