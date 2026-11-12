import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from '../store/useStore';
import { act } from '../store/actions';
import { greeting, reply, type HausiIntent } from '../store/hausi';
import { TEACHER_TITLE } from '../store/constants';
import type { ChatMessage, Homework, Student } from '../store/types';
import { SUBJECTS } from '../data/subjects';
import { HausiBig, HausiHead } from './Hausi';
import { IconSend, IconSpeaker, IconX } from './icons';
import './HausiChat.css';

interface Props { hw: Homework; student: Student; focus: number; onClose: () => void }

export function HausiChat({ hw, student, focus, onClose }: Props) {
  const key = `${student.id}:${hw.id}`;
  const settings = useStore((s) => s.data.settings);
  const stored = useStore((s) => s.data.chats[key]);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const lang = SUBJECTS[hw.subject].lang;
  const messages: ChatMessage[] = stored ?? [{ from: 'hausi', text: greeting(hw, lang) }];
  const canSpeak = !!lang && typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length]);

  const push = (msgs: ChatMessage[]) => { act.chat(student.id, hw.id, msgs, { from: 'hausi', text: greeting(hw, lang) }); };

  const ask = (intent: HausiIntent, kidText: string) => {
    const tipRound = messages.filter((m) => m.from === 'kid' && m.text === 'Gib mir einen Tipp').length;
    push([{ from: 'kid', text: kidText }, { from: 'hausi', text: reply(hw, intent, focus, kidText, settings.hausiSchoolTopicsOnly, tipRound) }]);
  };

  const speak = () => {
    const t = hw.tasks[focus];
    const say = t.kind === 'question' ? t.question : t.kind === 'transform' ? t.word : `${t.left} ${t.right}`;
    const u = new SpeechSynthesisUtterance(say);
    u.lang = lang!;
    u.rate = 0.85;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang!.slice(0, 2)));
    if (voice) u.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    push([{ from: 'kid', text: 'Sprich es vor' }, { from: 'hausi', text: `Hör gut zu: «${say}». Sprich es mir nach!` }]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    ask('frei', t);
    setText('');
  };

  return (
    <aside className="chat" aria-label="Hausi-Chat">
      <div className="chat-head">
        <HausiBig size={56} />
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div className="chat-name">Hausi</div>
          <div className="chat-sub">hilft dir – verrät aber keine Lösungen</div>
          {settings.hausiTeacherCanRead && <div className="chat-read">{TEACHER_TITLE} kann diesen Chat lesen.</div>}
        </div>
        <button type="button" className="chat-close" aria-label="Chat schliessen" onClick={onClose}><IconX size={22} /></button>
      </div>
      <div className="chat-list" ref={listRef} aria-live="polite">
        {messages.map((m, i) => m.from === 'hausi' ? (
          <div key={i} className="msg hausi"><HausiHead /><div className="bubble">{m.text}</div></div>
        ) : (
          <div key={i} className="msg kid">
            <div className="bubble">{m.text}</div>
            <div className="kid-avatar" role="img" aria-label={student.name}>
              {student.photo ? <img src={student.photo} alt="" /> : student.name[0]}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-quick">
        <button type="button" onClick={() => ask('tipp', 'Gib mir einen Tipp')}>Gib mir einen Tipp</button>
        <button type="button" onClick={() => ask('erklaeren', 'Erklär es nochmal')}>Erklär es nochmal</button>
        {canSpeak && <button type="button" onClick={speak}><IconSpeaker size={16} /> Sprich es vor</button>}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input type="text" aria-label="Nachricht an Hausi" placeholder="Nachricht an Hausi…" value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="send" />
        <button type="submit" aria-label="Senden"><IconSend size={20} /></button>
      </form>
    </aside>
  );
}
