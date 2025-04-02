import React from 'react';
import ReactECharts from 'echarts-for-react';

const Chart = ({options}) => {
    return (
        <div style={{ height: '400px', width: '100%' }}>
            <ReactECharts 
                option={options}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
};

export default Chart;
