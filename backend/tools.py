# 处理火山方舟API
from calendar import c
import description
from volcenginesdkarkruntime import Ark
from database import db, Message, Users, Chat  # 导入数据库模型和数据库实例
from flask import jsonify

# 初始化火山方舟API客户端
client = Ark(
    api_key="b5dd48fa-f25c-4d1d-9645-a9f7ff5311f1",  # API密钥
    base_url="https://ark.cn-beijing.volces.com/api/v3")  # API基础URL


# 响应数据并记录到数据库
def generate_with_record(input_content, session_id):
    """
    生成AI响应并记录到数据库的流式处理函数
    :param input_content: 用户输入的聊天内容
    :param session_id: 聊天会话ID
    :return: 生成器，返回流式响应数据
    """
    # 初始化消息内容容器
    # whole_content = [{'message_type': 'reasonContent', 'message_content': ''},
    #                  {'message_type': 'content', 'message_content': ''},
    #                  {'message_type': 'graph', 'message_content': ''}]  # 新增图表内容容器

    whole_content = []

    # 图表数据处理相关变量
    left_brace = 0
    graphing = False
    graph_data = ""

    # 首先发送会话ID
    yield '''{"content":"%s","type":-1}\n''' % session_id

    # 构建消息列表，初始包含系统消息
    messages_list = [{"role": "system", "content": description.v1}]

    try:
        # 查询该会话的历史消息
        mes = Message.query.filter_by(chat_session_id=session_id).all()

        # 如果有历史消息，添加到消息列表
        if mes:
            for message in mes:
                if message.message_type == 'user':
                    messages_list.append(
                        {"role": "user", "content": message.message_content})
                else:
                    messages_list.append(
                        {"role": "assistant", "content": message.message_content})
        # 添加当前用户消息
        messages_list.append({"role": "user", "content": input_content})
        whole_content.append(
            {'message_type': 'user', 'message_content': input_content})
    except Exception as e:
        yield '''{"error":"查询聊天记录失败","type":-2}\n'''
        return

    try:

        # 调用火山方舟API获取流式响应
        stream = client.chat.completions.create(
            model="ep-20250314182101-klj96",  # 使用的模型名称
            messages=messages_list,  # 完整的消息历史
            stream=True  # 启用流式响应
        )
        graphing = False
        graph_data = ""
        left_brace = 0
        current_chunk = ""  # 用于累积当前的chunk
        current_state = 0  # 0: 等待推理内容, 1: 等待普通内容, 2: 等待图表数据,-1: 内容结束
        # 处理API返回的流式数据
        for chunk in stream:
            if not chunk.choices:
                continue

            # 处理普通内容响应
            if (chunk.choices[0].delta.content is not None) and (chunk.choices[0].delta.content != ''):
                chunk_content = chunk.choices[0].delta.content

                # 修改状态切换逻辑，确保内容完整保存
                if current_state == 0 and current_chunk:  # 从推理切换到普通内容
                    whole_content.append({
                        'message_type': 'reasonContent',
                        'message_content': current_chunk
                    })
                    current_state = 1
                    current_chunk = chunk_content  # 保留当前内容
                else:

                 # 图表数据处理逻辑
                    if '{' in chunk_content and not graphing:
                        current_chunk += chunk_content[0:current_chunk.find('{')-1]
                        whole_content.append({
                            'message_type': 'content',
                            'message_content': current_chunk
                        })
                        current_state = 2
                        current_chunk = chunk_content[current_chunk.find('{'):]
                        graphing = True

                    if graphing:
                        current_chunk += chunk_content
                        left_brace += chunk_content.count('{')
                        left_brace -= chunk_content.count('}')

                        if left_brace == 0 and graphing:
                            graphing = False
                            try:
                                first_brace = current_chunk.find('{')
                                last_brace = current_chunk.rfind('}')
                                
                                if first_brace != -1 and last_brace != -1:
                                    json_str = current_chunk[first_brace:last_brace+1]
                                    # 确保图表数据被正确保存
                                    whole_content.append({
                                        'message_type': 'graph',
                                        'message_content': json_str
                                    })
                                    # 保留图表后的内容
                                    current_chunk = current_chunk[last_brace+1:]
                            except Exception as e:
                                yield '''{"error":"图表数据处理失败","type":-2}\n'''
                    else:
                        current_chunk += chunk_content  # 累积内容

                chunk_content = chunk_dealer(chunk_content)  # 处理特殊字符
                yield '''{"content":"%s","type":1}\n''' % chunk_content

            # 处理推理内容响应
            elif (chunk.choices[0].delta.reasoning_content is not None) and (chunk.choices[0].delta.reasoning_content != ''):
                # 处理特殊字符
                chunk_content = chunk.choices[0].delta.reasoning_content

                if current_state == 1 and current_chunk:  # 等待普通内容
                    whole_content.append(
                        {'message_type': 'content', 'message_content': current_chunk})
                    current_state = 0
                    current_chunk = ""

                current_chunk += chunk_content  # 累积内容
                chunk_content = chunk_dealer(chunk_content)  # 处理特殊字符
                yield '''{"content":"%s","type":0}\n''' % chunk_content  # 发送处理后的内容
        if current_state != 2:
            whole_content.append(
                {'message_type': 'reasonContent', 'message_content': current_chunk})
            current_state = -1
            current_chunk = ""

        # 数据库操作：保存聊天记录
        try:
            for content_chunk in whole_content:
                # 创建消息记录
                mes = Message(
                    chat_session_id=session_id,
                    message_content=content_chunk['message_content'],
                    message_type=content_chunk['message_type'],
                )
                db.session.add(mes)  # 添加到会话

            db.session.commit()  # 提交事务

        except Exception as e:
            db.session.rollback()
            yield '''{"error":"数据库写入失败。%s","type":-2}\n''' % str(e)

    except Exception as e:
        yield '''{"error":"API请求失败","type":%s}\n''' % str(e)
        return


def chunk_dealer(chunk):
    """
    处理特殊字符，防止JSON格式错误
    :param chunk: 原始内容片段
    :return: 处理后的安全字符串
    """
    # 转义反斜杠
    chunkContent = chunk.replace('\\', '\\\\')
    # 转义换行符
    chunkContent = chunkContent.replace('\n', '\\n')
    # 转义制表符
    chunkContent = chunkContent.replace('\t', '\\t')
    # 转义双引号
    chunkContent = chunkContent.replace('"', '\\"')
    return chunkContent
