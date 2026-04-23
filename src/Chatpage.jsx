import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { 
  collection, query, where, onSnapshot, orderBy, 
  addDoc, serverTimestamp, doc, updateDoc, limit 
} from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import translations from './translations';
import LangSwitcher from './LangSwitcher';

const ChatPage = () => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const chatIdFromNav = location.state?.chatId;
  const { lang } = useLanguage();
  const t = translations[lang];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastUpdate", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChats(chatList);

      if (chatIdFromNav) {
        const found = chatList.find(c => c.id === chatIdFromNav);
        if (found) setActiveChat(found);
      }
    });

    return () => unsubscribe();
  }, [chatIdFromNav]);

  useEffect(() => {
    if (!activeChat?.id) return;

    const q = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [activeChat?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: text,
        lastUpdate: serverTimestamp()
      });
    } catch (err) {
      setNewMessage(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const getOtherName = (chat) => {
    const user = auth.currentUser;
    if (!user) return '';
    const otherId = chat.participants?.find(id => id !== user.uid);
    if (!otherId) return '';
    if (chat.participantNames && chat.participantNames[otherId]) {
      return chat.participantNames[otherId];
    }
    return chat.participantEmails?.find(e => e !== user.email) || '';
  };

  // Chat matnlari
  const chatTitles = {
    uz: { title: 'Chatlar', empty: "Hali chatlar yo'q", placeholder: 'Xabar yozing...', selectMsg: '💬 Suhbatni tanlang', firstMsg: 'Birinchi bo\'lib yozing!' },
    ru: { title: 'Чаты', empty: 'Чатов пока нет', placeholder: 'Написать сообщение...', selectMsg: '💬 Выберите чат', firstMsg: 'Напишите первым!' },
  };
  const ct = chatTitles[lang];

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/5 to-blue-600/5 pointer-events-none"></div>
      
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-gray-800/40 backdrop-blur-xl border-r border-gray-700/50 flex flex-col shrink-0 relative z-10">
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-700 text-primary transition-all"
          >
            ⬅
          </button>
          <span className="text-xl font-bold">{ct.title}</span>
          <div className="ml-auto">
            <LangSwitcher variant="chat" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 space-y-2">
              <span className="text-4xl block">👻</span>
              <p className="text-sm">{ct.empty}</p>
            </div>
          ) : (
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`w-full flex items-center gap-4 p-4 border-b border-gray-700/50 transition-all hover:bg-gray-700/50 text-left ${activeChat?.id === chat.id ? 'bg-primary/20 border-l-4 border-l-primary' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20">
                  {getOtherName(chat)[0]?.toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <strong className="block text-sm font-bold text-white truncate">{getOtherName(chat)}</strong>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{chat.lastMessage || '...'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-gray-900 relative">
        {activeChat ? (
          <>
            <header className="flex items-center gap-4 p-4 bg-gray-800/50 backdrop-blur-md border-b border-gray-700 z-10">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary border border-primary/20 shrink-0">
                {getOtherName(activeChat)[0]?.toUpperCase()}
              </div>
              <span className="font-bold text-lg">{getOtherName(activeChat)}</span>
            </header>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center space-y-2">
                    <span className="text-5xl block animate-bounce">👋</span>
                    <p>{ct.firstMsg}</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.senderId === auth.currentUser?.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={`max-w-[75%] p-4 text-sm leading-relaxed ${
                        isMine 
                        ? 'self-end bg-primary text-white rounded-2xl rounded-tr-none shadow-lg shadow-primary/10' 
                        : 'self-start bg-gray-800 text-gray-100 rounded-2xl rounded-tl-none border border-gray-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            <form className="p-4 bg-gray-800 border-t border-gray-700 flex gap-3 items-center" onSubmit={sendMessage}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ct.placeholder}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="w-12 h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95 shrink-0"
              >
                ✈️
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-xl font-medium">
            <div className="text-center space-y-4">
              <div className="text-7xl opacity-20">💬</div>
              <p>{ct.selectMsg}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPage;