# api部分
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

@app.route('/api/achieve', methods=['POST'])
def how_to_achieve():
    try:
        # 尝试获取 JSON 格式的数据
        dialog = request.get_json()
        if dialog and 'content' in dialog:
            input = dialog['content']
        
        if not input:
            return jsonify({'error': '没有接收到content数据'}), 400
            
        # 流式响应
        def generate():
            # 使用模型deepseek-v3-241226动态生成
            stream = client.chat.completions.create(
                model="ep-20250314182101-klj96",
                messages=[
                    {"role": "system", "content": description.v1},
                    {"role": "user", "content": input},
                ],
                stream=True
            )
            for chunk in stream:
                if not chunk.choices:
                    continue
                # 检查并只返回非None的reasoning_content
                if (chunk.choices[0].delta.reasoning_content is not None) and (chunk.choices[0].delta.reasoning_content != ''):
                    chunkContent = (chunk.choices[0].delta.reasoning_content).replace('\\','\\\\')
                    chunkContent = chunkContent.replace('\n', '\\n')
                    chunkContent = chunkContent.replace('"', '\\"')
                    yield '''{"content":"%s","type":0}\n'''% chunkContent
                # else:
                #     if not reason_end:
                #         yield f"REASONEND"
                #     reason_end = True
                # 检查并只返回非None的content
                if (chunk.choices[0].delta.content is not None) and (chunk.choices[0].delta.content != ''):
                    chunkContent = (chunk.choices[0].delta.content).replace('\\','\\\\')
                    chunkContent = chunkContent.replace('\n', '\\n')
                    chunkContent = chunkContent.replace('"', '\\"')
                    yield '''{"content":"%s","type":1}\n'''% chunkContent
                
        return Response(generate(), mimetype='application/json')
    except Exception as e:
        return jsonify({'error': f'处理请求时发生错误: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)