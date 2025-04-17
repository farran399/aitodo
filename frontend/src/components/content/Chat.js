import ReasonContent from './ReasonContent';
import Content from './Content';
import Graph from './Chart';
import UserMessage from './UserMessage';
import './Chat.css';
function Chat ({ chatList }) {
    console.log(chatList);
    return (
        <div className='chat-list'>{
            chatList.map(item => {
            if (item.type === 'reasonContent') {
                return (
                    <div key={item.id} >
                        <ReasonContent children={item.content} />
                    </div>
                )
            }
            if (item.type === 'content') {
                return (
                    <div key={item.id} >
                        <Content children={item.content} />
                    </div>
                )
            }
            if (item.type === 'graph') 
                {const chartData = typeof item.content === 'string' 
                ? JSON.parse(item.content) 
                : item.content;
                return (
                    <div key={item.id} >
                        <Graph options={chartData} />
                    </div>
                )
            }
            if (item.type === 'user') {
                return (
                    <div key={item.id} >
                        <UserMessage children={item.content}></UserMessage>
                    </div>
                )
            }
        })}
        </div>
    )
}

export default Chat;
