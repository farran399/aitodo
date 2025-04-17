import './UserMessage.css';

function UserMessage({ children }) {
    return (
        <div className="user-message">
            <div className="user-message-content">
                {children}
            </div>
        </div>
    );
}

export default UserMessage;