import './ReasonContent.css';

function ReasonContent ({id,children}) {
    return (
        <div key={id} className="ReasonContent">{children}</div>
    )
}

export default ReasonContent;
