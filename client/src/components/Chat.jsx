import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';

export default function Chat({ messages, canGuess, placeholder }) {
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    socket.emit('guess', { text: t });
    setText('');
  };

  return (
    <div className="panel chat">
      <h3>Chat &amp; Guesses</h3>
      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.system ? 'system' : ''} ${m.variant || ''}`}>
            {m.system ? (
              <span className="msg-text">{m.text}</span>
            ) : (
              <>
                <b style={{ color: m.color }}>{m.playerName}:</b>{' '}
                <span className="msg-text">{m.text}</span>
              </>
            )}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={send}>
        <input
          className="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder || (canGuess ? 'Type your guess…' : 'Type a message…')}
          maxLength={100}
        />
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  );
}
