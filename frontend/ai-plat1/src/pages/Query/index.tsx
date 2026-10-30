import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import './App.css';
import '../NewChat/index.css';
import { MessageSquare, Settings, History, Plus, Send, User, ArrowRight, Paperclip, Menu, X, Bot, ChevronRight, Edit3, Sparkles } from 'lucide-react';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import { createNewConversationApi } from '@/services/ant-design-pro/api';
import { sendMessageApi } from '@/services/ant-design-pro/api';
// 定义消息对象的类型
type Message = {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

// 定义会话类型
type Conversation = {
  id: string | number;
  title: string;
  active: boolean;
};

// 定义全局的 Session 类型
type Session = {
  session_id: string | number;
  title?: string;
};

function App() {
  // 明确指定 conversations 的类型
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // 修改 currentSessionId 的状态类型为 Session 或 null
  const [currentSessionId, setCurrentSessionId] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [apiError, setApiError] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
// 为 messagesEndRef 明确指定类型，避免类型为 never
const ref = messagesEndRef.current as HTMLElement | null;
if (ref) {
  ref.scrollIntoView({ behavior: "smooth" });
}
  };

  // 组件初始化
  useEffect(() => {
    // 先设置默认欢迎消息
    setMessages([{
      id: 1,
      role: 'assistant',
      content: '你好！我是 DeepSeek AI 助手。有什么我可以帮助你的吗？',
      timestamp: new Date().toLocaleTimeString()
    }]);

    // 加载会话列表
    loadSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取当前用户ID
  // 修改为异步函数，通过调用 queryCurrentUser 方法获取当前用户 ID
  const getCurrentUserId = async () => {
    try {
      const msg = await queryCurrentUser();
      // 假设返回的用户对象中有一个 id 字段表示用户 ID
      return msg.data.id || '1';
    } catch (error) {
      console.error('获取当前用户 ID 失败:', error);
      return '1';
    }
  };

  // 修改 loadSessions 函数以使用异步的 getCurrentUserId
  async function loadSessions() {
    try {
      setLoading(true);
      const userId = await getCurrentUserId();
      const res = await fetch(`/sessions/list?user_id=${userId}`);

      if (!res.ok) {
        throw new Error(`加载会话列表失败，状态码：${res.status}`);
      }

      const sessions = await res.json();

      if (sessions && sessions.length > 0) {
        // 渲染侧边列表
        const formattedSessions = sessions.map((session: Session) => ({
          id: session.session_id,
          title: session.title || '新对话',
          active: false
        }));

        setConversations(formattedSessions);
        setApiError(false);

        // 如果没有当前会话，选择第一个
        if (!currentSessionId && sessions.length > 0) {
          const firstSessionId = sessions[0].session_id;
          selectConversation(firstSessionId);
        }
      } else {
        // 没有会话时创建默认对话
        await createNewConversation();
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
      setApiError(true);

      // 创建默认本地对话作为备选
      const defaultConversation: Conversation = {
        id: 'default-1',
        title: '新对话',
        active: true
      };
      setConversations([defaultConversation]);
      // 修改为调用 selectConversation 函数
      selectConversation('default-1');
    } finally {
      setLoading(false);
    }
  }

  // 创建新对话
  async function createNewConversation() {
    try {
      setLoading(true);

      // 生成必要的参数
      const userId = await getCurrentUserId();

      // 调用新的创建新对话接口
      const newSession = await createNewConversationApi({ user_id: '1' });

      // 设置为当前会话
      setCurrentSessionId(newSession);
      setApiError(false);

      // 创建新对话项
      const newConversation = {
        id: newSession.session_id,
        title: newSession.title || "新对话",
        active: true
      };

      // 更新会话列表，将新对话置顶
      const updatedConversations = conversations.map(conv => ({
        ...conv,
        active: false
      }));

      setConversations([newConversation, ...updatedConversations]);

      // 设置初始消息
      setMessages([{
        id: 1,
        role: 'assistant',
        content: '你好！我是 DeepSeek AI 助手。有什么我可以帮助你的吗？',
        timestamp: new Date().toLocaleTimeString()
      }]);

    } catch (error) {
      console.error('创建新对话失败:', error);
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }

  // 加载会话消息
  async function loadSessionMessages(sessionId) {
    try {
      setLoading(true);

      // 移除本地会话判断逻辑
      // 从API加载会话消息
      const res = await fetch(`api/sessions/${sessionId}/messages?user_id=${getCurrentUserId()}`);

      if (!res.ok) {
        throw new Error(`加载会话消息失败，状态码：${res.status}`);
      }

      const sessionMessages = await res.json();

      if (sessionMessages && sessionMessages.length > 0) {
        const formattedMessages = sessionMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toLocaleTimeString()
        }));
        setMessages(formattedMessages);
      } else {
        // 没有消息时显示默认欢迎消息
        setMessages([{
          id: 1,
          role: 'assistant',
          content: '你好！我是 DeepSeek AI 助手。有什么我可以帮助你的吗？',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }

      setApiError(false);
    } catch (error) {
      console.error('加载会话消息失败:', error);
      setApiError(true);

      // 加载失败时显示默认消息
      setMessages([{
        id: 1,
        role: 'assistant',
        content: '抱歉，加载历史消息失败。你好！我是 DeepSeek AI 助手。',
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || loading) return;

    // 如果没有当前会话，先创建一个
    if (!currentSessionId) {
      await createNewConversation();
      return;
    }

    // 添加用户消息
    const userMessage = {
      id: '1',
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setLoading(true);

    // 用于存储流式响应拼接的内容
    let fullResponse = '';
    // 用于存储助手消息的 ID
    const aiMessageId = Date.now() + 1;

    try {

      // 直接使用 fetch 处理流式响应
      const res = await sendMessageApi(currentSessionId.session_id, '1',currentInput);

      if (!res.body) {
        throw new Error('响应没有 body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                fullResponse += data.content;
                // 实时更新消息列表
                setMessages(prevMessages => {
                  const aiMessageIndex = prevMessages.findIndex(msg => msg.id === aiMessageId);
                  if (aiMessageIndex > -1) {
                    const newMessages = [...prevMessages];
                    newMessages[aiMessageIndex] = {
                      id: aiMessageId,
                      role: 'assistant',
                      content: fullResponse,
                      timestamp: new Date().toLocaleTimeString()
                    };
                    return newMessages;
                  } else {
                    return [
                      ...prevMessages,
                      {
                        id: aiMessageId,
                        role: 'assistant',
                        content: fullResponse,
                        timestamp: new Date().toLocaleTimeString()
                      }
                    ];
                  }
                });
              }
            } catch (parseError) {
              console.error('解析流式数据时出错:', parseError);
            }
          }
        }
      }

      setApiError(false);
    } catch (error) {
      console.error('发送消息失败:', error);
      setApiError(true);

      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉，消息发送失败，请稍后重试。',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 选择对话
  const selectConversation = (sessionId) => {
    const newConversations = conversations.map(conv => ({
      ...conv,
      active: conv.id === sessionId
    }));

    setConversations(newConversations);
    setCurrentSessionId(sessionId);
    loadSessionMessages(sessionId);
  };

  // 处理文件附件
  const handleAttachFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,text/*,.pdf,.doc,.docx';
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      console.log('选择的文件:', files);
      // 这里可以处理文件上传逻辑
    };
    input.click();
  };

  // 处理移动端侧边栏
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // 渲染Agent选择界面
  const renderAgentView = () => (
    <div className="agent-container">
      <div className="agent-header">
        <button
          className="back-button"
          onClick={() => setCurrentView('chats')}
        >
          <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          <span>返回对话</span>
        </button>
      </div>

      {/* 预制Agent */}
      <div className="agent-section">
        <h3 className="agent-section-title">精选智能体</h3>
        <div className="preset-agents">
          {presetAgents.map(agent => (
            <div
              key={agent.id}
              className="agent-card"
              onClick={() => selectAgent(agent)}
            >
              <div className="agent-icon">{agent.icon}</div>
              <div className="agent-info">
                <h4 className="agent-name">{agent.name}</h4>
                <p className="agent-description">{agent.description}</p>
              </div>
              <ChevronRight size={16} className="agent-arrow" />
            </div>
          ))}
        </div>
      </div>

      {/* 自定义Agent */}
      <div className="agent-section">
        <div className="custom-agent-header">
          <h3 className="agent-section-title">自定义智能体</h3>
          <button
            className="create-agent-btn"
            onClick={() => setShowCreateAgent(true)}
          >
            <Plus size={16} />
            <span>创建</span>
          </button>
        </div>

        <div className="custom-agents">
          {customAgents.length === 0 ? (
            <div className="empty-agents">
              <p>还没有自定义智能体</p>
              <p>点击上方"创建"按钮开始</p>
            </div>
          ) : (
            customAgents.map(agent => (
              <div key={agent.id} className="agent-card custom-agent-card">
                <div className="agent-icon">{agent.icon}</div>
                <div className="agent-info">
                  <h4 className="agent-name">{agent.name}</h4>
                  <p className="agent-description">{agent.description}</p>
                </div>
                <div className="agent-actions">
                  <button
                    className="use-agent-btn"
                    onClick={() => selectAgent(agent)}
                    title="使用此智能体"
                  >
                    <ArrowRight size={14} />
                  </button>
                  <button
                    className="delete-agent-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定要删除"${agent.name}"吗？`)) {
                        deleteCustomAgent(agent.id);
                      }
                    }}
                    title="删除此智能体"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // 渲染创建Agent弹窗
  const renderCreateAgentModal = () => (
    showCreateAgent && (
      <div className="modal-overlay" onClick={() => setShowCreateAgent(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>创建自定义智能体</h3>
            <button
              className="modal-close"
              onClick={() => setShowCreateAgent(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label>智能体名称</label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="请输入智能体名称"
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label>系统提示词</label>
              <textarea
                value={newAgentPrompt}
                onChange={(e) => setNewAgentPrompt(e.target.value)}
                placeholder="请输入系统提示词，定义智能体的角色和行为..."
                rows={8}
                maxLength={2000}
              />
              <div className="char-count">
                {newAgentPrompt.length}/2000
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="cancel-btn"
              onClick={() => setShowCreateAgent(false)}
            >
              取消
            </button>
            <button
              className="create-btn"
              onClick={createCustomAgent}
              disabled={!newAgentName.trim() || !newAgentPrompt.trim()}
            >
              创建
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="app-container">
      {/* API状态指示器 */}
      {apiError && (
        <div className="api-status-indicator error">
          API连接失败，使用离线模式
        </div>
      )}

      {/* 移动端遮罩 */}
      {isMobileSidebarOpen && (
        <div className="mobile-mask" onClick={toggleMobileSidebar}></div>
      )}

      {/* 侧边栏 */}
      <div className={`sidebar ${!isSidebarOpen ? 'sidebar-closed' : ''} ${isMobileSidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button
            className="new-chat-button"
            onClick={() => createNewConversation()}
            disabled={loading}
          >
            <Plus size={16} />
            {isSidebarOpen && <span>{loading ? '创建中...' : '新对话'}</span>}
          </button>

          {/* 桌面端切换按钮 */}
          <button
            className="toggle-sidebar-btn desktop-only"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* 移动端关闭按钮 */}
          <button
            className="close-mobile-sidebar mobile-only"
            onClick={toggleMobileSidebar}
          >
            <X size={20} />
          </button>
        </div>

        {/* 视图切换按钮 */}
        <div className="view-tabs">
          <button
            className={`view-tab ${currentView === 'chats' ? 'active' : ''}`}
            onClick={() => setCurrentView('chats')}
          >
            <MessageSquare size={16} />
            {isSidebarOpen && <span>对话</span>}
          </button>
          <button
            className={`view-tab ${currentView === 'agents' ? 'active' : ''}`}
            onClick={() => setCurrentView('agents')}
          >
            <Bot size={16} />
            {isSidebarOpen && <span>智能体</span>}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="sidebar-content">
          {currentView === 'chats' ? (
            <div className="conversations-list">
              {loading && conversations.length === 0 ? (
                <div className="loading-placeholder">加载中...</div>
              ) : conversations.length === 0 ? (
                <div className="empty-conversations">
                  <p>还没有对话记录</p>
                  <p>点击上方"新对话"开始</p>
                </div>
              ) : (
                conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${conversation.active ? 'active' : ''}`}
                    onClick={() => selectConversation(conversation.id)}
                    onMouseEnter={() => setHoveredItemId(conversation.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    {conversation.agent ? (
                      <div className="conversation-agent-icon">
                        {conversation.agent.icon || <Bot size={16} />}
                      </div>
                    ) : (
                      <MessageSquare size={16} />
                    )}
                    {isSidebarOpen && <span>{conversation.title}</span>}

                    {/* 工具提示 */}
                    {!isSidebarOpen && hoveredItemId === conversation.id && (
                      <div className="sidebar-tooltip">
                        {conversation.title}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            renderAgentView()
          )}
        </div>

        <div className="sidebar-footer">
          <button
            className="sidebar-button"
            onMouseEnter={() => setHoveredItemId('history')}
            onMouseLeave={() => setHoveredItemId(null)}
            onClick={() => loadSessions()}
          >
            <History size={18} />
            {isSidebarOpen && <span>刷新历史</span>}
            {!isSidebarOpen && hoveredItemId === 'history' && (
              <div className="sidebar-tooltip">刷新历史</div>
            )}
          </button>

          <button
            className="sidebar-button"
            onMouseEnter={() => setHoveredItemId('settings')}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            <Settings size={18} />
            {isSidebarOpen && <span>设置</span>}
            {!isSidebarOpen && hoveredItemId === 'settings' && (
              <div className="sidebar-tooltip">设置</div>
            )}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className={`main-content ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
        {/* 移动端头部 */}
        <div className="mobile-header">
          <button className="mobile-toggle-btn" onClick={toggleMobileSidebar}>
            <Menu size={20} />
          </button>
          <div className="mobile-title">
            {selectedAgent ? selectedAgent.name : 'DeepSeek Chat'}
          </div>
        </div>

        <div className="chat-container">
          <div className="messages-container">
            {loading && messages.length === 0 ? (
              <div className="loading-placeholder">
                <div className="loading-spinner"></div>
                <span>加载会话中...</span>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="message-avatar">
                    {message.role === 'user' ?
                      <div className="user-avatar"><User size={20} /></div> :
                      <div className="ai-avatar">
                        {selectedAgent?.icon || 'DS'}
                      </div>}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">
                        {message.role === 'user' ? '你' : (selectedAgent?.name || 'DeepSeek')}
                      </span>
                      <span className="message-timestamp">{message.timestamp}</span>
                    </div>
                    <div className="message-text">{message.content}</div>
                  </div>
                </div>
              ))
            )}

            {/* 打字指示器 */}
            {loading && messages.length > 0 && (
              <div className="typing-indicator">
                <div className="message assistant">
                  <div className="message-avatar">
                    <div className="ai-avatar">{selectedAgent?.icon || 'DS'}</div>
                  </div>
                  <div className="message-content">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={selectedAgent ? `向${selectedAgent.name}提问...` : "输入你的问题..."}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              <div className="input-buttons">
                <button
                  className="attach-button"
                  onClick={handleAttachFile}
                  title="附加文件"
                >
                  <Paperclip size={18} />
                </button>

                <button
                  className="send-button"
                  onClick={handleSendMessage}
                  disabled={inputMessage.trim() === '' || loading}
                  title="发送消息"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            <div className="input-info">
              按 Enter 发送，Shift + Enter 换行
              {selectedAgent && (
                <span className="current-agent">
                  · 当前使用：{selectedAgent.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 创建Agent弹窗 */}
      {renderCreateAgentModal()}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


// 预制Agent
const presetAgents = [
{
id: 'xiaohongshu-writer',
name: '小红书写手',
icon: '📝',
description: '专业小红书文案生成，包含emoji和少女语气',
systemPrompt: `你是一个专业的小红书文案写手。请按照以下要求生成小红书文案：

1. 语气要活泼、年轻、有少女感
2. 适当添加emoji表情符号，让文案更生动
3. 使用小红书常见的表达方式和流行词汇
4. 内容要有吸引力，能够引起共鸣
5. 适当添加相关话题标签
6. 保持正能量和积极向上的基调

请根据用户提供的内容，生成适合小红书发布的文案。`
},
{
id: 'typo-checker',
name: '公众号纠错助手',
icon: '✏️',
description: '专业文档错别字检查和纠正',
systemPrompt: `你是一个专业的文档校对助手，专门负责检查和纠正错别字。请按照以下要求工作：

1. 仔细检查用户提供的文档内容
2. 找出所有的错别字、标点符号错误、语法错误
3. 提供正确的修改建议
4. 以清晰的格式列出所有错误和修改建议
5. 如果没有发现错误，请明确说明文档无误
6. 保持专业和准确的校对标准

请开始检查用户提供的文档内容。`
}
];

