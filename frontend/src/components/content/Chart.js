import React, { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';

const Chart = ({options}) => {
    const chartRef = useRef(null);

    useEffect(() => {
        // 组件卸载时清理图表实例
        return () => {
            if (chartRef.current) {
                try {
                    chartRef.current.getEchartsInstance().dispose();
                } catch (e) {
                    console.error('图表实例清理失败:', e);
                }
            }
        };
    }, []);

    return (
        <div style={{ height: '400px', width: '100%' }}>
            <ReactECharts 
                ref={chartRef}
                option={options}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
};

export default Chart;
