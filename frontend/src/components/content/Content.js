import ReactMarkdown from 'react-markdown';
import 'github-markdown-css';
import { useMemo } from 'react';

function Content({ children }) {
  // 使用useMemo优化渲染，当children变化时才重新渲染
  const memoizedContent = useMemo(() => (
    <ReactMarkdown>{children}</ReactMarkdown>
  ), [children]);

  return (
    <div className='markdown-body content'>
      {memoizedContent}
    </div>
  )
}

export default Content;
