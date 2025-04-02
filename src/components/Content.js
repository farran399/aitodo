import ReactMarkdown from 'react-markdown';
import 'github-markdown-css';

function Content ({ children }){
    return (
        <div className=' markdown-body content'>
            <ReactMarkdown >{children}
            </ReactMarkdown>
        </div>
    )
}

export default Content;
