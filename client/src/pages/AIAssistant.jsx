import { useState, useRef, useEffect } from 'react';
import api from '../api';

const QUICK = [
  'Show pending cases',
  'Find all missing children below age 10',
  'Generate an FIR draft for the most recent open incident',
  "Summarize today's work",
  'Which station has the most incidents?',
  'Recommend where to deploy patrols right now',
  'Translate the latest incident description to Hindi'
];

export default function AIAssistant() {
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Ask me about your cases, duties, or patrols — or pick a quick question on the left.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [msgs]);

  const ask = async (question) => {
    if (!question.trim() || busy) return;
    setMsgs(m => [...m, { role: 'user', text: question }]);
    setInput('');
    setBusy(true);
    setMsgs(m => [...m, { role: 'bot', text: 'Thinking…', pending: true }]);
    try {
      const res = await api.post('/ai/ask', { question });
      setMsgs(m => m.filter(x => !x.pending).concat({ role: 'bot', text: res.data.answer }));
    } catch (e) {
      const errText = e.response?.data?.error || 'AI assistant is unavailable right now.';
      setMsgs(m => m.filter(x => !x.pending).concat({ role: 'bot', text: errText }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="vtitle">AI assistant</h2>
      <p className="vsub">Ask about cases, get a draft report, or check today's deployment — backed by live Claude, using your current data as context.</p>
      <div className="ai-shell">
        <div className="ai-quick">
          {QUICK.map(q => <button key={q} className="ai-q-btn" onClick={() => ask(q)}>{q}</button>)}
        </div>
        <div className="ai-chat">
          <div className="ai-msgs" ref={boxRef}>
            {msgs.map((m, i) => (
              <div className={'ai-msg ' + m.role} key={i}><div className="ai-bubble">{m.text}</div></div>
            ))}
          </div>
          <div className="ai-input-row">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..." onKeyDown={e => { if (e.key === 'Enter') ask(input); }} />
            <button className="btn primary small" onClick={() => ask(input)} disabled={busy}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
