import React from 'react'
import ReactDOM from 'react-dom/client'
import { Widget } from './Widget'
import './index.css'

// Check if root exists, if not create a container
let rootElement = document.getElementById('root')
if (!rootElement) {
    const div = document.createElement('div')
    div.id = 'tour-widget-root'
    document.body.appendChild(div)
    rootElement = div
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <Widget />
    </React.StrictMode>,
)
