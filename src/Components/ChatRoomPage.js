import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, startAfter, deleteDoc, doc } from 'firebase/firestore';
import { firestore, db } from '../firebase';
import { ref, get } from 'firebase/database';
import styles from './ChatRoomPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as ChatIcon } from "../assets/Chat.svg";
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import EmojiPicker from 'emoji-picker-react';

const MESSAGES_LIMIT = 50;
const MAX_MESSAGES = 1000;
const LOAD_MORE_COUNT = 30;

const formatDateLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const msgDate = date.toDate ? date.toDate() : new Date(date);

  if (
    msgDate.getDate() === today.getDate() &&
    msgDate.getMonth() === today.getMonth() &&
    msgDate.getFullYear() === today.getFullYear()
  ) {
    return "Today";
  }

  if (
    msgDate.getDate() === yesterday.getDate() &&
    msgDate.getMonth() === yesterday.getMonth() &&
    msgDate.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }

  return msgDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function ChatRoomPage() {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [canChat, setCanChat] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastDocRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {   
      subscribeToMessages();
    }
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCurrentUser = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/');
        return;
      }

      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const user = {
          uid: userId,
          displayName: data.Name || data.UserName || 'Anonymous',
          userName: data.UserName || 'user',
          type: data.UserType || 'Free',
        };
        setCurrentUser(user);
        setCanChat(user.type === 'Pro' || user.type === 'Elite');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const subscribeToMessages = () => {
    const q = query(
      collection(firestore, 'world_chat'),
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_LIMIT)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();

      setMessages(newMessages);
      
      if (snapshot.docs.length > 0) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }
      
      setHasMore(snapshot.docs.length === MESSAGES_LIMIT);
      setLoading(false);
    });

    return unsubscribe;
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || !lastDocRef.current) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(firestore, 'world_chat'),
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(LOAD_MORE_COUNT)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
        const olderMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).reverse();

        setMessages(prev => [...olderMessages, ...prev]);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        setHasMore(snapshot.docs.length === LOAD_MORE_COUNT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  const deleteOldMessages = async () => {
    try {
      const q = query(
        collection(firestore, 'world_chat'),
        orderBy('timestamp', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > MAX_MESSAGES) {
        const messagesToDelete = snapshot.docs.length - MAX_MESSAGES;
        const deletePromises = snapshot.docs
          .slice(0, messagesToDelete)
          .map(docSnap => deleteDoc(doc(firestore, 'world_chat', docSnap.id)));
        
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error deleting old messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !canChat) return;

    try {
      await addDoc(collection(firestore, 'world_chat'), {
        text: newMsg,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderUserName: currentUser.userName,
        senderType: currentUser.type,
        timestamp: serverTimestamp(),
      });

      setNewMsg('');
      setShowEmoji(false);
      
      // Delete old messages if exceeding limit
      await deleteOldMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMsg((prev) => prev + emojiObject.emoji);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : names[0].substring(0, 2).toUpperCase();
  };

  const getUserTypeColor = (type) => {
    switch(type) {
      case 'Elite': return '#FFD700';
      case 'Pro': return '#C0C0C0';
      default: return '#CD7F32';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const getDateSafe = (ts) => {
    if (!ts) return null;
    try {
      return ts.toDate ? ts.toDate() : new Date(ts);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className={styles["chat-room-page"]}>
        <Navbar
          pageName="Chat Room"
          Icon={ChatIcon}
          buttons={[
            { label: "Ranking", variant: "secondary", route: "/leaderboard" },
            { label: "My Routine", variant: "secondary", route: "/routine" },
            { label: "Activity", variant: "secondary", route: "/activity" },
            { label: "My Page", variant: "secondary", route: "/mypage" },
          ]}
        />
        <div className={styles["loading-container"]}>
          <div className={styles["spinner"]}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["chat-room-page"]}>
      <Navbar
        pageName="Chat Room"
        Icon={ChatIcon}
        buttons={[
          { label: "Activity", variant: "secondary", route: "/activity" },
          { label: "ChatRoom", variant: "primary", route: "/chatroom" },
        ]}
      />

      <div className={styles["chat-container"]}>
        <div className={styles["chat-header"]}>
          <h2>Community Chat</h2>
          <p className={styles["chat-subtitle"]}>Connect with Pro & Elite members</p>
        </div>

        <div 
          className={styles["messages-container"]} 
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {loadingMore && (
            <div className={styles["load-more-indicator"]}>
              <div className={styles["small-spinner"]}></div>
              <span>Loading more messages...</span>
            </div>
          )}
          
          {!hasMore && messages.length > 0 && (
            <div className={styles["no-more-messages"]}>
              <span>No more messages to load</span>
            </div>
          )}

          {messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === currentUser?.uid;
            const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId;
            
            // ---- Date Divider Logic ----
            const currentMsgDate = getDateSafe(msg.timestamp);
            const prevMsgDate =
              index > 0 ? getDateSafe(messages[index - 1]?.timestamp) : null;

            const isNewDay =
              currentMsgDate &&
              (!prevMsgDate ||
                currentMsgDate.getDate() !== prevMsgDate.getDate() ||
                currentMsgDate.getMonth() !== prevMsgDate.getMonth() ||
                currentMsgDate.getFullYear() !== prevMsgDate.getFullYear());

            return (
              <React.Fragment key={msg.id}>
                {/* DATE DIVIDER */}
                {isNewDay && currentMsgDate && (
                  <div className={styles["date-divider"]}>
                    <span>{formatDateLabel(msg.timestamp)}</span>
                  </div>
                )}

                {/* MESSAGE BUBBLE */}
                <div 
                  key={msg.id} 
                  className={`${styles["message"]} ${isOwnMessage ? styles["own"] : styles["other"]}`}
                >
                  {!isOwnMessage && showAvatar && (
                    <div className={styles["message-avatar"]}>
                      <Avatar 
                        initials={getInitials(msg.senderName)} 
                        size={35}
                        className={styles["chat-avatar"]}
                      />
                    </div>
                  )}
                  {!isOwnMessage && !showAvatar && (
                    <div className={styles["message-avatar-spacer"]}></div>
                  )}
                  
                  <div className={styles["message-content"]}>
                    {showAvatar && (
                      <div className={styles["message-header"]}>
                        <span className={styles["sender-name"]}>{msg.senderName}</span>
                        <span 
                          className={styles["sender-type"]}
                          style={{ color: getUserTypeColor(msg.senderType) }}
                        >
                          {msg.senderType}
                        </span>
                      </div>
                    )}
                    <div className={styles["message-bubble"]}>
                      <p className={styles["message-text"]}>{msg.text}</p>
                    </div>
                    {msg.timestamp && (
                        <span className={styles["message-time"]}>
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef}></div>
        </div>

        {canChat ? (
          <form onSubmit={sendMessage} className={styles["chat-input-container"]}>
            <div className={styles["input-wrapper"]}>
              <button 
                type="button" 
                className={styles["emoji-button"]}
                onClick={() => setShowEmoji(!showEmoji)}
              >
                😊
              </button>
              
              <input
                type="text"
                placeholder="Type your message..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                className={styles["message-input"]}
                maxLength={500}
              />
              
              <button 
                type="submit" 
                className={styles["send-button"]}
                disabled={!newMsg.trim()}
              >
                Send
              </button>
            </div>

            {showEmoji && (
              <div className={styles["emoji-picker-container"]}>
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  width="100%"
                  height="350px"
                />
              </div>
            )}
          </form>
        ) : (
          <div className={styles["read-only-notice"]}>
            <p>Only Pro and Elite members can send messages</p>
            <button 
              className={styles["upgrade-button"]}
              onClick={() => navigate('/pricing')}
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}