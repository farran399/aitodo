# api部分
import os
import description
from volcenginesdkarkruntime import Ark

client = Ark(
    api_key="b5dd48fa-f25c-4d1d-9645-a9f7ff5311f1",
    base_url="https://ark.cn-beijing.volces.com/api/v3")

# flask部分
from flask import Flask, jsonify,Response,request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 全局启用跨域支持

# @app.route('/api/achieve', methods=['POST'])
def how_to_achieve(wish,judge):
    try:
        # 尝试获取 JSON 格式的数据
        data = request.get_json()
        if data and 'content' in data:
            input = data['content']
        
        if not input:
            return jsonify({'error': '没有接收到content数据'}), 400
            
        # 流式响应
        def generate():
            # 使用deepseek-r1-250120模型动态生成
            stream = client.chat.completions.create(
                model="ep-20250314182101-klj96",
                messages=[
                    {"role": "system", "content": judge},
                    {"role": "user", "content": wish},
                ],
                stream=True
            )
            for chunk in stream:
                if not chunk.choices:
                    continue
                # 检查并只返回非None的reasoning_content
                if chunk.choices[0].delta.reasoning_content is not None:
                    yield f"{chunk.choices[0].delta.reasoning_content}"
                # else:
                #     if not reason_end:
                #         yield f"REASONEND"
                #     reason_end = True
                # 检查并只返回非None的content
                if chunk.choices[0].delta.content is not None:
                    yield f"{chunk.choices[0].delta.content}"
                
        return Response(generate(), mimetype='text/plain')
    except Exception as e:
        return jsonify({'error': f'处理请求时发生错误: {str(e)}'}), 500

@app.route('/api/judge', methods=['POST'])
def judge():
    try:
        data = request.get_json()
        if data and 'content' in data:
            input = data['content']
        if not input:
            return jsonify({'error': '没有接收到content数据'}), 400
        
        completion = client.chat.completions.create(
                model="deepseek-v3-241226",
                messages=[
                    {"role": "system", "content": description.v3},
                    {"role": "user", "content": input},
                ]
            )
        # 获取判断结果
        judgement = completion.choices[0].message.content
        # 根据判断结果选择不同的prompt
        if judgement == "YES":
            return how_to_achieve(input,description.v1_yes)
        elif judgement == "NO":
            return how_to_achieve(input,description.v1_no)
        elif judgement == "UNDEFINE":
            return how_to_achieve(input,description.v1_undefine)
        
        return jsonify({'result': completion.choices[0].message.content}), 200
    
    except Exception as e:
        return jsonify({'error': f'处理请求时发生错误: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)