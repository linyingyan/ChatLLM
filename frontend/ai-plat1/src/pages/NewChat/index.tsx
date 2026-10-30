// App.jsx - 集成API接口版本 + Agent功能
import React, {useState, useRef, useEffect, StrictMode} from 'react';
import { FiUser, FiSettings, FiLogOut } from "react-icons/fi";
import JSON5 from 'json5';
import './App.css';
import './index.css';
import {
 message,
} from 'antd';
import {  MessageSquare, Settings, History, Plus, Send, User, ArrowRight, ArrowLeft, Paperclip, Menu, X, Bot, ChevronRight, Edit3, Sparkles, RefreshCw, LogOut, HelpCircle, ChevronDown,
   Check, Trash2, Upload, Database, CheckSquare, Square, Search, FileText  } from 'lucide-react';
import {createRoot} from "react-dom/client";
import { createNewConversationApi,createAgentApi,getCustomAgentsApi,
   getSessionListApi, getSessionHistoryApi,deleteAgentApi,deleteSessionApi,
   PostAttachFileApi,createKnowledgeBaseApi,InsertKnowledgeBaseApi,DeleteKnowledgeBaseApi,
   DeleteKnowledgeBaseFileApi,QueryKnowledgeBaseApi,getKnowledgeBaseListApi, getKnowledgeBaseFilesApi
    } from "@/services/ant-design-pro/api";
import { sendMessageApi } from '@/services/ant-design-pro/api';
import { IP_CONFIG } from '@/config/ipConfig';
 // 定义全局的 Session 类型
 type Session = {
  session_id: string | number;
  title?: string;
};
function App() {
  const {pinyin} = require('pinyin');
  const [conversations, setConversations] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<Session | null>(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [fileResults, setFileResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Agent相关状态
  const [currentView, setCurrentView] = useState('chats'); // 'chats' | 'agents'
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [customAgents, setCustomAgents] = useState([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showAgentManagement, setShowAgentManagement] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');

  // 知识库相关状态
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [showCreateKnowledge, setShowCreateKnowledge] = useState(false);
  const [newKnowledgeName, setNewKnowledgeName] = useState('');
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [currentKnowledgeBase, setCurrentKnowledgeBase] = useState(null);
  const [showKnowledgeDetail, setShowKnowledgeDetail] = useState(false);
  const [newKnowledgeFiles, setNewKnowledgeFiles] = useState([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState(null);
  const [showKnowledgeDropdown, setShowKnowledgeDropdown] = useState(false);
  const knowledgeSelectorRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 200
  });
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentSelectorRef = useRef(null);
  const [agentDropdownPosition, setAgentDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 200
  });
  // 在组件中添加状态记录当前消息上下文
  const [currentMessageContext, setCurrentMessageContext] = useState({
    aiMessageId: null,
    userQuery: null
  });
  const [tempSelectedKnowledgeForMessage, setTempSelectedKnowledgeForMessage] = useState(new Set()); // 发送消息临时选择
  // 文档批量选择状态
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const fileInputRef = useRef(null);
  const createKnowledgeFileRef = useRef(null);
  const detailFileInputRef = useRef(null);
   // 新增：设置菜单状态
   const [showSettingsMenu, setShowSettingsMenu] = useState(false);
   const messagesEndRef = useRef(null);
  //加载相关状态
  const [isKnowledgeBasesLoading, setIsKnowledgeBasesLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [expandedToolContents, setExpandedToolContents] = useState({});
  const [showMCPModal, setShowMCPModal] = useState(false);
  const [isAMapEnabled, setIsAMapEnabled] = useState(false);
  // 知识库管理弹窗状态
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  // 获取当前用户ID
  const getCurrentUserId = () => {
    return localStorage.getItem('userId');
  };
  //退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  }
  //处理中文字符
  function convertToPinyinIfChinese(text) {
    // 检查字符串是否包含中文字符
    const isChinese = /[\u4e00-\u9fa5]/.test(text);

    if (isChinese) {
      // 转换为拼音，不带声调，用空格分隔
      const pinyinArray = pinyin(text, {
        style: pinyin.STYLE_NORMAL, // 不带声调
        segment: false,             // 不启用分词
        heteronym: false            // 不启用多音字模式
      });

      // 将二维数组转换为一维并用空格连接
      return pinyinArray.map(arr => arr[0]).join(' ');
    }

    // 如果不是中文，返回原字符串
    return text;
  }
  // 个人中心页面加载
  const handleProfileClick = () => {
    message.info('个人中心功能开发中...');
  };
  // 切换展开/收起状态的函数
  const toggleToolContent = (messageId) => {
    setExpandedToolContents(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };
  //添加MCP
  const handleAddServer = () => {
    message.success("请联系管理员(#^.^#)") // 显示无权限弹窗
  };
  //
  const user_id = getCurrentUserId();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 组件初始化
  useEffect(() => {
    // 加载自定义Agent
    loadCustomAgents();
    // 加载知识库
    loadKnowledgeBases();
    // 先设置默认欢迎消息
    setMessages([{
      id: 1,
      role: 'assistant',
      content: '你好！我是 DeepSeek AI 助手。有什么我可以帮助你的吗？',
      timestamp: new Date().toLocaleTimeString()
    }]);

    // 加载会话列表
    loadSessions();

     // 点击外部关闭设置菜单
     const handleClickOutside = (event) => {
      if (showSettingsMenu && !event.target.closest('.settings-menu-container')) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    const handleDeleteFile = (index: number) => {
    setFileResults(prevResults => [
      ...prevResults.slice(0, index),
      ...prevResults.slice(index + 1)
    ]);
  };

  return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    if (showKnowledgeDropdown && knowledgeSelectorRef.current) {
      const rect = knowledgeSelectorRef.current.getBoundingClientRect();

      setDropdownPosition({
        top: rect.top - 185, // 计算顶部位置使下拉菜单底部对齐按钮顶部
        left: rect.left,
        width: rect.width
      });
    }
  }, [showKnowledgeDropdown, knowledgeBases.length]);
  useEffect(() => {
    if (showAgentDropdown && agentSelectorRef.current) {
      const rect = agentSelectorRef.current.getBoundingClientRect();

      setAgentDropdownPosition({
        top: rect.top - 185, // 计算顶部位置使下拉菜单底部对齐按钮顶部
        left: rect.left,
        width: rect.width
      });
    }
  }, [showAgentDropdown, presetAgents.length, customAgents.length]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 关闭知识库下拉菜单
      if (showKnowledgeDropdown && knowledgeSelectorRef.current &&
          !knowledgeSelectorRef.current.contains(event.target)) {
        setShowKnowledgeDropdown(false);
      }

      // 关闭智能体下拉菜单
      if (showAgentDropdown && agentSelectorRef.current &&
          !agentSelectorRef.current.contains(event.target)) {
        setShowAgentDropdown(false);
      }

      // 关闭设置菜单
      if (showSettingsMenu && !event.target.closest('.settings-menu-container')) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showKnowledgeDropdown, showAgentDropdown, showSettingsMenu]);
  // 加载自定义Agent
  const loadCustomAgents = async () => {
    try {
      // 1. 首先尝试从API获取
      const response = await getCustomAgentsApi(user_id);

      // 2. 转换API返回的数据格式
      const agentsFromApi = response.custom_agents.map(agent => ({
        id: agent.agent_id,
        name: agent.name,
        icon: '🤖',
        description: '自定义智能体',
        systemPrompt: agent.system_prompt,
        isCustom: true,
        createdAt: agent.created_at,
        userId: agent.user_id
      }));

      // 3. 保存到本地存储
      localStorage.setItem('customAgents', JSON.stringify(agentsFromApi));

      // 4. 更新状态
      setCustomAgents(agentsFromApi);

    } catch (error) {
      console.error('从API加载Agent失败，尝试从本地加载:', error);

      // 5. 如果API失败，回退到本地存储
      try {
        const saved = localStorage.getItem('customAgents');
        if (saved) {
          setCustomAgents(JSON.parse(saved));
        }
      } catch (localError) {
        console.error('从本地加载Agent失败:', localError);
      }
    }
  };

  // 保存自定义Agent
  const saveCustomAgents = (agents) => {
    try {
      localStorage.setItem('customAgents', JSON.stringify(agents));
      setCustomAgents(agents);
    } catch (error) {
      console.error('保存自定义Agent失败:', error);
    }
  };

  //创建自定义Agent
  const createCustomAgent = async () => {
    if (!newAgentName.trim() || !newAgentPrompt.trim()) {
      alert('请填写Agent名称和系统提示词');
      return;
    }

    try {
      // 调用API创建Agent
      const response = await createAgentApi(
        newAgentName,
        user_id, // 假设这是获取当前用户ID的函数
        newAgentPrompt
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建Agent失败');
      }

      const responseData = await response.json();

      // 创建本地Agent对象
      const newAgent = {
        id: responseData.agent_id, // 使用服务器返回的ID
        name: newAgentName,
        icon: '🤖',
        description: '自定义智能体',
        systemPrompt: newAgentPrompt,
        isCustom: true
      };

      // 更新本地状态
      const updatedAgents = [...customAgents, newAgent];
      saveCustomAgents(updatedAgents);

      setNewAgentName('');
      setNewAgentPrompt('');
      setShowCreateAgent(false);

      message.success('Agent创建成功！');

    } catch (error) {
      console.error('创建Agent失败:', error);
      message.error(error.message || '创建Agent失败，请重试');
    }
  };

  // 删除自定义Agent
  const deleteCustomAgent = async (agentId,agentname) => {
    try {
      // 调用删除自定义Agent的API接口
      await deleteAgentApi(agentId);
      // 删除成功后返回信息
      console.log({message: `Agent '${agentId}' 已删除`});
      message.success(`Agent '${agentname}' 已删除`);
      // 更新本地的Agent数组
      const updatedAgents = customAgents.filter(agent => agent.id !== agentId);
      saveCustomAgents(updatedAgents);
    } catch (error) {
      console.error('删除自定义Agent失败:', error);
    }
  };
  // 删除对话
  const deleteConversation = async (conversationId, event) => {
    event.stopPropagation(); // 防止触发选择对话

    if (!confirm('确定要删除这个对话吗？此操作无法撤销。')) {
      return;
    }

    try {
      // 从本地列表中移除
      const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
      setConversations(updatedConversations);

      // 处理当前会话被删除的情况
      if (currentSessionId === conversationId) {
        // 查找第一个不是被删除对话的会话
        const validConversation = updatedConversations.find(conv => conv.id !== conversationId);

        if (validConversation) {
          // 如果有符合条件的会话，切换到第一个有效会话
          setCurrentSessionId(validConversation.id);
          await loadSessionMessages(validConversation.id);
        } else {
          // 如果没有符合条件的会话，重置为初始状态
          setCurrentSessionId(null);
          setMessages([{
            id: 1,
            role: 'assistant',
            content: '这里是云五山智能问答平台，很高兴为您服务，请点击"新对话"按钮开始对话吧！',
            timestamp: new Date().toLocaleTimeString()
          }]);
          setSelectedAgent(null);
        }
      }

      // 如果不是本地对话，调用API删除
      if (!conversationId.startsWith('local-') && !conversationId.startsWith('default-')) {
        await deleteSessionApi(conversationId);
        message.success('会话删除成功');
      }

      console.log(`对话 ${conversationId} 已删除`);
    } catch (error) {
      console.error('删除对话失败:', error);
      message.error('删除对话失败，请稍后重试');
    }
  };


  // 刷新历史记录
  const refreshHistory = async () => {
    setLoading(true);
    try {
      await loadSessions();
    } catch (error) {
      console.error('刷新历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };
  // 加载知识库
  const loadKnowledgeBases = async () => {
    try {
      setIsKnowledgeBasesLoading(true);
      const response = await getKnowledgeBaseListApi(user_id);
      const knowledgeBaseList = response.data;

      if (!Array.isArray(knowledgeBaseList)) {
        console.error('API 返回的知识库列表不是数组:', knowledgeBaseList);
        setKnowledgeBases([]);
        return;
      }

      // 使用Map来去重，以knowledge_base_id为key
      const knowledgeBaseMap = new Map();

      const knowledgeBasesWithFiles = await Promise.all(
        knowledgeBaseList.map(async (kb) => {
          // 如果已经处理过这个知识库，直接返回之前的结果
          if (knowledgeBaseMap.has(kb.knowledge_base_id)) {
            return knowledgeBaseMap.get(kb.knowledge_base_id);
          }

          try {
            const response = await getKnowledgeBaseFilesApi(kb.knowledge_base_id);
            // 确保即使API返回null/undefined，也有默认空数组
            const files = response.data?.files || [];

            // 过滤掉file_name为'default.txt'的文件
            const filteredFiles = files.filter(file =>
              file.file_name !== 'default.txt' && file.file_name !== 'default.TXT'
            );

            // 转换文件格式
            const processedFiles = filteredFiles.map(file => {
              // 从文件名中提取文件类型（后缀名）
              const fileExtension = file.file_name?.split('.').pop()?.toLowerCase() || 'unknown';

              return {
                id: file.file_id,  // 使用API返回的file_id
                name: file.file_name,  // 使用API返回的file_name
                size: 0,  // API没有返回文件大小，设为0或可以根据需要获取实际大小
                type: fileExtension,  // 根据文件名后缀设置类型
                uploadedAt: file.created_at || new Date().toISOString()  // 使用API返回的created_at
              };
            });

            const knowledgeBase = {
              id: kb.knowledge_base_id,
              name: kb.kb_name,
              createdAt: kb.created_at,
              documents: processedFiles, // 使用转换后的文件列表
              description: `包含 ${kb.documents?.length} 个文档的知识库`,
              updatedAt: new Date().toISOString()
            };

            // 存入Map，避免重复处理
            knowledgeBaseMap.set(kb.knowledge_base_id, knowledgeBase);

            return knowledgeBase;
          } catch (error) {
            console.error(`获取知识库 ${kb.kb_name} 文件失败:`, error);
            const knowledgeBase = {
              id: kb.knowledge_base_id,
              name: kb.kb_name,
              createdAt: kb.created_at,
              documents: [], // 出错时返回空数组
              description: '加载失败',
              updatedAt: new Date().toISOString()
            };

            knowledgeBaseMap.set(kb.knowledge_base_id, knowledgeBase);
            return knowledgeBase;
          }
        })
      );

      // 再次去重（虽然Promise.all返回的顺序可能与输入顺序一致，但为了保险）
      const uniqueKnowledgeBases = Array.from(new Map(
        knowledgeBasesWithFiles.map(kb => [kb.id, kb])
      ).values());

      setKnowledgeBases(uniqueKnowledgeBases);
    } catch (error) {
      console.error('加载知识库失败:', error);
      setKnowledgeBases([]); // 出错时设置为空数组
    } finally {
      setIsKnowledgeBasesLoading(false);
    }
  };

  // 保存知识库
  const saveKnowledgeBases = (knowledgeBases) => {
    try {
      //TODO 这里删除
      setKnowledgeBases(knowledgeBases);
    } catch (error) {
      console.error('保存知识库失败:', error);
    }
  };

  // 创建知识库
  const createKnowledgeBase = async () => {
    const documents = [];
    if (!newKnowledgeName.trim()) {
      message.error('请填写知识库名称');
      return;
    }
    const isDuplicate = knowledgeBases.some(kb => kb.name === newKnowledgeName.trim());
    if (isDuplicate) {
      message.error('该知识库名称已存在，请使用其他名称。');
      return;
    }
    try {
      // 调用创建知识库的 API
      const time = (Date.now() - 1609459200000).toString(36); // 从2021-01-01开始计算
      const random = Math.random().toString(36).substring(2, 8);
      const kbId =  convertToPinyinIfChinese(newKnowledgeName);
      await createKnowledgeBaseApi(user_id, newKnowledgeName,kbId);
      if (newKnowledgeFiles.length > 0) {
        for (const fileInfo of newKnowledgeFiles) {
          const timestamp = Date.now();
          const randomNum = Math.floor(Math.random() * 1000);
          const fileId = `${timestamp}${randomNum}`;
          const fileName = fileInfo.name; // 假设响应中有文件名

          await InsertKnowledgeBaseApi(kbId, fileId, fileInfo,newKnowledgeName);
          documents.push({
            id: fileId,
            name: fileName,
            size: newKnowledgeFiles.find(file => file.name === fileName)?.size || 0,
            type: newKnowledgeFiles.find(file => file.name === fileName)?.type || '',
            uploadedAt: new Date().toISOString()
          });
        }
      }

      const newKnowledge = {
        id: kbId,
        name: newKnowledgeName,
        description: `包含 ${documents.length} 个文档的知识库`,
        documents: documents,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedKnowledgeBases = [...knowledgeBases, newKnowledge];
      saveKnowledgeBases(updatedKnowledgeBases);
      message.success(`知识库"${newKnowledgeName}"创建成功！`);

      setNewKnowledgeName('');
      setNewKnowledgeFiles([]);
      setShowCreateKnowledge(false);

    } catch (error) {
      console.error('创建知识库失败:', error);
      message.error('创建知识库失败，请重试');
    }
  };
  // 删除知识库
  const deleteKnowledgeBase = async (knowledgeId) => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      // 调用删除知识库的 API
      await DeleteKnowledgeBaseApi(knowledgeId);

      const updatedKnowledgeBases = knowledgeBases.filter(kb => kb.id !== knowledgeId);
      saveKnowledgeBases(updatedKnowledgeBases);
      setSelectedKnowledgeBases(prev => {
        const newSet = new Set(prev);
        newSet.delete(knowledgeId);
        return newSet;
      });
      message.success('知识库删除成功');
    } catch (error) {
      console.error('删除知识库失败:', error);
      message.error('删除知识库失败，请稍后重试');
    }finally {
      setIsDeleting(false);
    }
  };

  // 批量删除知识库
const batchDeleteKnowledgeBases = async () => {
  if (isDeleting) return;
  if (selectedKnowledgeBases.size === 0) {
    alert('请选择要删除的知识库');
    return;
  }

  if (!confirm(`确定要删除选中的 ${selectedKnowledgeBases.size} 个知识库吗？此操作无法撤销。`)) {
    return;
  }

  try {
    setIsDeleting(true);
    // 遍历选中的知识库 ID，调用删除 API
    const deletePromises = Array.from(selectedKnowledgeBases).map(async (knowledgeId) => {
      await DeleteKnowledgeBaseApi(knowledgeId);
    });

    // // 等待所有删除操作完成
    await Promise.all(deletePromises);

    const updatedKnowledgeBases = knowledgeBases.filter(kb => !selectedKnowledgeBases.has(kb.id));
    saveKnowledgeBases(updatedKnowledgeBases);
    setSelectedKnowledgeBases(new Set());
    message.success('批量删除知识库成功');
  } catch (error) {
    console.error('批量删除知识库失败:', error);
    message.error('批量删除知识库失败，请稍后重试');
  }finally {
    setIsDeleting(false);
  }
};

  const toggleKnowledgeSelection = (knowledgeId) => {
    setSelectedKnowledgeBases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(knowledgeId)) {
        newSet.delete(knowledgeId);
      } else {
        newSet.add(knowledgeId);
      }
      return newSet;
    });
  };

  // 切换知识库选择状态（别名函数）
  const toggleKnowledgeBaseSelection = (knowledgeId) => {
    toggleKnowledgeSelection(knowledgeId);
  };
  // 全选/取消全选知识库
  const selectAllKnowledgeBases = () => {
    if (selectedKnowledgeBases.size === knowledgeBases.length) {
      setSelectedKnowledgeBases(new Set());
    } else {
      setSelectedKnowledgeBases(new Set(knowledgeBases.map(kb => kb.id)));
    }
  };
  // 上传文件到知识库
  const handleFileUpload = () => {
    if (selectedKnowledgeBases.size === 0) {
      message.error('请先选择要上传到的知识库');
      return;
    }
    fileInputRef.current?.click();
  };
  // 处理文件上传
const handleFileChange = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  console.log('选择的文件:', files);
  setUploading(true);

  try {
    // 先收集所有要更新的文档
    const updates = [];

    for (const file of files) {
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      const fileId = `${timestamp}${randomNum}`;

      for (const kbId of selectedKnowledgeBases) {
        const kb = knowledgeBases.find(kb => kb.id === kbId);
        if (!kb) continue;

        // 检查文件是否已存在
        const fileExists = kb.documents.some(doc => doc.name === file.name);
        if (fileExists) {
          console.log(`文件 ${file.name} 已存在于知识库 ${kb.name} 中，跳过上传。`);
          continue;
        }

        const kbName = kb.name;

        // 调用 API 向知识库上传文件
        await InsertKnowledgeBaseApi(kbId, fileId, file, kbName);

        // 收集更新信息，不立即更新状态
        updates.push({
          kbId,
          document: {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
          }
        });
      }
    }

    // 所有文件上传完成后，一次性更新状态
    if (updates.length > 0) {
      setKnowledgeBases(prevBases => {
        const newBases = [...prevBases];

        updates.forEach(({kbId, document}) => {
          const kbIndex = newBases.findIndex(kb => kb.id === kbId);
          if (kbIndex !== -1) {
            newBases[kbIndex] = {
              ...newBases[kbIndex],
              documents: [...newBases[kbIndex].documents, document],
              updatedAt: new Date().toISOString()
            };
          }
        });

        return newBases;
      });
    }

    message.success(`成功上传 ${files.length} 个文件到 ${selectedKnowledgeBases.size} 个知识库`);
  } catch (error) {
    console.error('文件上传失败:', error);
    message.error('文件上传失败，请重试');
  } finally {
    setUploading(false);

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

  // 创建知识库时的文件处理
  const handleCreateKnowledgeFileChange = (event) => {
    const files = Array.from(event.target.files);
    setNewKnowledgeFiles(prev => [...prev, ...files]);
  };

  const removeNewKnowledgeFile = (index) => {
    setNewKnowledgeFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 打开知识库详情
  const openKnowledgeDetail = (knowledge) => {
    setCurrentKnowledgeBase(knowledge);
    setShowKnowledgeDetail(true);
    // 清空文档选中状态
    setSelectedDocuments(new Set());
  };

  // 向知识库上传文件
  const uploadToCurrentKnowledge = () => {
    detailFileInputRef.current?.click();
  };

  // 在知识库详情中删除文件
  const deleteDocumentFromKnowledge = async (fileId) => {
    if(isDeletingFile) return;
    if (!currentKnowledgeBase) return;

    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      setIsDeletingFile(true);
      // 调用删除文件 API
      await DeleteKnowledgeBaseFileApi(currentKnowledgeBase.id, [fileId]);

      const updatedKnowledgeBases = knowledgeBases.map(kb => {
        if (kb.id === currentKnowledgeBase.id) {
          return {
            ...kb,
            documents: kb.documents.filter(doc => doc.id !== fileId),
            updatedAt: new Date().toISOString()
          };
        }
        return kb;
      });

      saveKnowledgeBases(updatedKnowledgeBases);

      // 更新当前知识库数据
      const updated = updatedKnowledgeBases.find(kb => kb.id === currentKnowledgeBase.id);
      setCurrentKnowledgeBase(updated);

      // 清除已删除文档的选中状态
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });

      message.success('文件删除成功');
    } catch (error) {
      console.error('删除文件失败:', error);
      message.error('删除文件失败，请重试');
    }finally {
      setIsDeletingFile(false);
    }
  };

  // 文档批量操作函数
  const toggleDocumentSelection = (fileId) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllDocuments = () => {
    if (!currentKnowledgeBase) return;

    if (selectedDocuments.size === currentKnowledgeBase.documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(currentKnowledgeBase.documents.map(doc => doc.id)));
    }
  };

  // 切换全选状态（知识库管理模态框中使用）
  const toggleSelectAllDocuments = () => {
    selectAllDocuments();
  };

  // 批量删除文档
const batchDeleteDocuments = async () => {
  if (isDeletingFile) return;
  if (!currentKnowledgeBase || selectedDocuments.size === 0) {
    alert('请选择要删除的文档');
    return;
  }

  if (!confirm(`确定要删除选中的 ${selectedDocuments.size} 个文档吗？此操作无法撤销。`)) {
    return;
  }

  try {
    setIsDeletingFile(true);
    const documentIdsArray = Array.from(selectedDocuments);
    // 逐个调用删除文件 API

    await DeleteKnowledgeBaseFileApi(currentKnowledgeBase.id, documentIdsArray);


    const updatedKnowledgeBases = knowledgeBases.map(kb => {
      if (kb.id === currentKnowledgeBase.id) {
        return {
          ...kb,
          documents: kb.documents.filter(doc => !selectedDocuments.has(doc.id)),
          updatedAt: new Date().toISOString()
        };
      }
      return kb;
    });

    saveKnowledgeBases(updatedKnowledgeBases);

    // 更新当前知识库数据
    const updated = updatedKnowledgeBases.find(kb => kb.id === currentKnowledgeBase.id);
    setCurrentKnowledgeBase(updated);

    // 清空选中状态
    setSelectedDocuments(new Set());

    message.success('批量删除文档成功');
  } catch (error) {
    console.error('批量删除文档失败:', error);
    message.error('批量删除文档失败，请重试');
  }finally {
    setIsDeletingFile(false);
  }
};

// 删除选中的文档（知识库管理模态框中使用）
const deleteSelectedDocuments = async () => {
  await batchDeleteDocuments();
};

 // 详情页面的文件上传处理
const handleDetailFileChange = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0 || !currentKnowledgeBase) return;

  setUploading(true);

  try {
    const newDocuments = [];

    // 使用Promise.all并行处理所有文件
    await Promise.all(files.map(async (file) => {
      // 检查文件名称是否已存在
      const existingFile = currentKnowledgeBase.documents.some(doc => doc.name === file.name);
      if (existingFile) {
        console.log(`文件 "${file.name}" 已存在于知识库中，跳过上传。`);
        return;
      }

      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      const fileId = `${timestamp}${randomNum}`;
      const kbId = currentKnowledgeBase.id;
      const kbName = currentKnowledgeBase.name;

      // 调用 API 向知识库上传文件，添加 kb_name 参数
      await InsertKnowledgeBaseApi(kbId, fileId, file, kbName);

      // 收集新文档信息
      newDocuments.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      });
    }));

    // 如果有新文档上传成功，更新状态
    if (newDocuments.length > 0) {
      const updatedKnowledgeBases = knowledgeBases.map(kb => {
        if (kb.id === currentKnowledgeBase.id) {
          return {
            ...kb,
            documents: [...kb.documents, ...newDocuments],
            updatedAt: new Date().toISOString()
          };
        }
        return kb;
      });

      saveKnowledgeBases(updatedKnowledgeBases);

      // 更新当前知识库数据
      const updated = updatedKnowledgeBases.find(kb => kb.id === currentKnowledgeBase.id);
      setCurrentKnowledgeBase(updated);
    }

    message.success(`成功上传 ${newDocuments.length} 个文件到"${currentKnowledgeBase.name}"`);
  } catch (error) {
    console.error('文件上传失败:', error);
    message.error('文件上传失败，请重试');
  } finally {
    setUploading(false);
    setSelectedDocuments(new Set());

    if (detailFileInputRef.current) {
      detailFileInputRef.current.value = '';
    }
  }
};

   // 处理设置菜单项点击
   const handleSettingsMenuClick = (action) => {
    setShowSettingsMenu(false);

    switch (action) {
      case 'system':
        console.log('打开系统设置');
        alert('系统设置功能开发中...');
        break;
      case 'contact':
        console.log('联系我们');
        alert('联系我们功能开发中...');
        break;
      case 'logout':
        if (confirm('确定要退出登录吗？')) {
          console.log('退出登录');
          // 这里添加退出登录的逻辑
          localStorage.clear();
          window.location.href = '/login';
        }
        break;
    }
  };

   // 获取总智能体数量
   const getTotalAgentsCount = () => {
    return presetAgents.length + customAgents.length;
  };

   // 获取知识库总数量
   const getTotalKnowledgeBasesCount = () => {
    return knowledgeBases.length;
  };

  // 加载会话列表 - 增强错误处理
  async function loadSessions() {
    console.log('开始加载会话列表');
    try {
      setLoading(true);
      setApiError(false);

      // 使用 getSessionListApi 获取会话列表
      const sessions = await getSessionListApi(user_id);
      console.log('获取到的会话数据:', sessions);

      if (sessions && Array.isArray(sessions)) {
        // 格式化会话数据
        const formattedSessions = sessions.map(session => {
          let title = '新对话';
          if (session.preview) {
            const startIndex = session.preview.indexOf('用户输入：');
            if (startIndex !== -1) {
              const inputContent = session.preview.slice(startIndex + 5);
              title = inputContent.slice(0, 5) + '...';
            }
          }
          return {
            id: session.session_id,
            title: title,
            agent: session.agent || null,
            active: false
          };
        });

        console.log('格式化后的会话数据:', formattedSessions);

        // 更新会话列表状态
        setConversations(formattedSessions);

        // 如果没有当前会话，选择第一个（如果有的话）
        if (!currentSessionId && formattedSessions.length > 0) {
          // 确保使用格式化后的会话ID
          setCurrentSessionId(formattedSessions[0].id);
          // 直接调用selectConversation可能会使用旧的conversations状态
          // 所以改为直接更新状态和加载消息
          const updatedConversations = formattedSessions.map((conv, index) => ({
            ...conv,
            active: index === 0
          }));
          setConversations(updatedConversations);
          loadSessionMessages(formattedSessions[0].id);
        }
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
      setApiError(true);
      setConversations([]);

      if (!currentSessionId) {
        setMessages([{
          id: 1,
          role: 'assistant',
          content: '这里是云五山智能问答平台，很高兴为您服务，请点击"新对话"按钮开始对话吧！',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } finally {
      setLoading(false);
    }
  }

  // 创建新对话 - 支持Agent
  async function createNewConversation(agent = null) {
    try {
      setLoading(true);

      const conversationData = {
        user_id: getCurrentUserId(),
        initial_message: "新对话已开始"
      };

      // 如果选择了Agent，添加Agent信息
      if (agent) {
        conversationData.agent_id = agent.id;
        conversationData.agent_name = agent.name;
        conversationData.system_prompt = agent.systemPrompt;
      }

      console.log(user_id);
      // 调用创建新对话的API
      const newSession = await createNewConversationApi({ user_id: user_id });


      // 设置为当前会话
      setCurrentSessionId(newSession.session_id);
      setSelectedAgent(agent);
      setApiError(false);

      // 创建新对话项
      const newConversation = {
        id: newSession.session_id,
        title: agent ? `${agent.name} - 新对话` : "新对话",
        agent: agent,
        active: true
      };

      // 更新会话列表，将新对话置顶
      const updatedConversations = conversations.map(conv => ({
        ...conv,
        active: false
      }));

      setConversations([newConversation, ...updatedConversations]);

      // 设置初始消息
      const welcomeMessage = agent
        ? `你好！我是${agent.name}。${agent.description}。有什么我可以帮助你的吗？`
        : '你好！我是 你的 AI 助手。有什么我可以帮助你的吗？';

      setMessages([{
        id: 1,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toLocaleTimeString()
      }]);

      // 切换到对话视图
      setCurrentView('chats');

    } catch (error) {
      console.error('创建新对话失败:', error);
      setApiError(true);

      // API失败时创建本地对话作为备选
      const localId = `local-${Date.now()}`;
      const localConversation = {
        id: localId,
        title: agent ? `${agent.name} - 新对话 (离线)` : "新对话 (离线)",
        agent: agent,
        active: true
      };

      const updatedConversations = conversations.map(conv => ({
        ...conv,
        active: false
      }));

      setConversations([localConversation, ...updatedConversations]);
      setCurrentSessionId(localId);
      setSelectedAgent(agent);

      const welcomeMessage = agent
        ? `你好！我是${agent.name}。当前处于离线模式，功能可能受限。`
        : '你好！我是 你的 AI 助手。当前处于离线模式，功能可能受限。';

      setMessages([{
        id: 1,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toLocaleTimeString()
      }]);

      // 切换到对话视图
      setCurrentView('chats');
    } finally {
      setLoading(false);
    }
  }
  // 加载会话消息 - 增强错误处理
  async function loadSessionMessages(sessionId) {
    console.log('开始加载会话消息:', sessionId);
    try {
      setLoading(true);
      setApiError(false);
      setCurrentSessionId(sessionId);
      console.log('设置当前会话ID:', currentSessionId);

      // 从API加载会话消息
      const response = await getSessionHistoryApi(sessionId);
      console.log('API原始响应:', response);

      // 处理API返回的数据
      let historyMessages = [];

      if (response.history_json) {
        try {
          // 1. 首先尝试直接解析
          historyMessages = JSON.parse(response.history_json);
        } catch (e) {
          console.warn('标准JSON解析失败，尝试宽松模式:', e);

          // 2. 尝试使用更宽松的解析方式
          try {
            // 处理常见的JSON格式问题
            let jsonStr = response.history_json;

            // 处理转义的双引号
            jsonStr = jsonStr.replace(/\\"/g, '"');

            // 处理换行符
            jsonStr = jsonStr.replace(/\\n/g, '\n');

            // 处理未转义的控制字符
            jsonStr = jsonStr.replace(/[\x00-\x1F]/g, '');

            // 处理单引号（转换为双引号）
            jsonStr = jsonStr.replace(/'/g, '"');

            // 处理未引用的键
            jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

            // 处理多余的逗号
            jsonStr = jsonStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');

            // 使用JSON5进行宽松解析
            historyMessages = JSON5.parse(jsonStr);
          } catch (looseError) {
            console.error('宽松模式解析失败:', looseError);

            // 3. 最后尝试分割为行并单独处理
            try {
              // 假设每行是一个独立的消息对象
              const lines = response.history_json.split('\n').filter(line => line.trim());
              historyMessages = lines.map(line => {
                try {
                  return JSON.parse(line);
                } catch (e) {
                  // 如果单行解析失败，尝试提取关键字段
                  const roleMatch = line.match(/"role":\s*"([^"]+)"/) ||
                    line.match(/'role':\s*'([^']+)'/);
                  const contentMatch = line.match(/"content":\s*"([^"]+)"/) ||
                    line.match(/'content':\s*'([^']+)'/);

                  return {
                    role: roleMatch ? roleMatch[1] : 'assistant',
                    content: contentMatch ? contentMatch[1] : line,
                    timestamp: new Date().toISOString()
                  };
                }
              });
            } catch (fallbackError) {
              console.error('回退解析失败:', fallbackError);
              throw new Error('无法解析历史消息');
            }
          }
        }
      }

      console.log('解析后的消息数组:', historyMessages);

      // 格式化消息数据
      const formattedMessages = [];
      let toolContentBuffer = null;
      if (Array.isArray(historyMessages)) {
        historyMessages.forEach((msg, index) => {
          // 确保消息对象有必要的属性
          const role = msg.role || (index % 2 === 0 ? 'user' : 'assistant');
          let content = msg.content || '';
          // 格式化时间戳
          const timestamp = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
            : new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
          // 处理用户消息 - 提取真正的用户输入部分
          if (role === 'user') {
            // 检查是否是包含系统提示的格式
              const userInputMatch = content.match(/用户输入：(.+)$/);
              if (userInputMatch && userInputMatch[1]) {
                content = userInputMatch[1].trim();
              }
          }

          // 处理助手消息 - 过滤标记文本并提取真实回复
          // 处理助手消息
          // 处理 assistant 消息
          if (role === 'assistant') {
            // 跳过空的 assistant 消息
            if (content.trim() === '') {
              return;
            }
            // 处理特殊字符和换行
            content = content
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\r/g, '\r')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
            // 如果有缓存的 tool 内容，将其作为 toolContent 字段
            const messageObj = {
              id: `${sessionId}-msg-${index}`,
              role,
              content,
              timestamp,
              toolContent: undefined
            };
            if (toolContentBuffer) {
              messageObj.toolContent = toolContentBuffer;
              toolContentBuffer = null;
            }

            formattedMessages.push(messageObj);
            return;
          }

          if (role === 'tool') {
            // 提取 text='' 包裹的内容，如果没有则使用整个内容
            const extractedText = content.match(/text='([^']*)'/) || [null, content];
            toolContentBuffer = extractedText[1]
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\r/g, '\r')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
            return;
          }
          // 处理特殊字符和换行
          content = content
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');

          formattedMessages.push({
            id: `${sessionId}-msg-${index}`,
            role,
            content,
            timestamp
          });
        });
      }

      console.log('处理后的格式化消息:', formattedMessages);

      // 如果没有消息，显示默认欢迎消息
      if (formattedMessages.length === 0) {
        const conversation = conversations.find(conv => conv.id === sessionId);
        const agent = conversation?.agent;

        const welcomeMessage = agent
          ? `你好！我是${agent.name}。${agent.description}。有什么我可以帮助你的吗？`
          : '你好！我是 你的 AI 助手。有什么我可以帮助你的吗？';

        setMessages([{
          id: 1,
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        }]);
      } else {
        setMessages(formattedMessages);
      }

    } catch (error) {
      console.error('加载会话消息失败:', error);
      setApiError(true);

      let errorMessage = '抱歉，加载历史消息失败。';
      if (error.name === 'AbortError') {
        errorMessage = '加载超时，请检查网络连接。';
      } else if (error.message.includes('404')) {
        errorMessage = '会话不存在或已被删除。';
      } else if (error.message.includes('403')) {
        errorMessage = '没有权限访问此会话。';
      } else if (error.message.includes('无法解析历史消息')) {
        errorMessage = '历史消息格式错误，请联系管理员。';
      }

      setMessages([{
        id: 1,
        role: 'assistant',
        content: errorMessage + ' 你好！我是 你的 AI 助手。',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }]);
    } finally {
      setLoading(false);
    }
  }

   // 发送消息 - 支持Agent和附件
// 发送消息 - 支持Agent和附件
  const handleSendMessage = async () => {
    // 允许空文本但有附件的情况
    if ((inputMessage.trim() === '' && fileResults.length === 0) || loading) return;

    // 获取选中的知识库ID
    const selectedKbId = tempSelectedKnowledgeForMessage.size > 0
      ? Array.from(tempSelectedKnowledgeForMessage)[0]
      : null;

    let knowledgeKeywords = [];

    if (selectedKbId) {
      try {
        const selectedKbIdStr = typeof selectedKbId === 'string' ? selectedKbId : String(selectedKbId);
        const queryResponse = await QueryKnowledgeBaseApi(inputMessage, selectedKbIdStr, 3);
        knowledgeKeywords = Array.isArray(queryResponse?.results)
          ? queryResponse.results.filter(Boolean)
          : [];
      } catch (error) {
        console.error('查询知识库失败:', error);
        message.error('查询知识库失败，请稍后重试');
      }
    }

    // 如果没有当前会话，先创建一个
    if (!currentSessionId) {
      await createNewConversation(selectedAgent);
      return;
    }

    // 添加用户消息（包含附件信息）
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString(),
      attachments: fileResults.length > 0 ? [...fileResults] : undefined
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      let fullResponse = '';
      const aiMessageId = Date.now() + 1;

      // 基础消息格式
      let inputmessage = `用户输入：${inputMessage}`;

      // 构建最终发送的消息
      let finalMessage = inputmessage;

      // 如果有附件，构建附件提示词
      let attachmentsPrompt = '';
      if (fileResults.length > 0) {
        attachmentsPrompt =
          `附件内容：\n${fileResults.map(file =>
            `[${file.filename}]: ${file.file_content || '无文本内容'}`).join("\n")}\n}`;

        // 组合附件提示和用户输入
        finalMessage = `${attachmentsPrompt}\n${inputmessage}`;
      }

      // 消息发送成功后清空附件列表
      setFileResults([]);

      // 如果有知识库关键词，添加到消息前面
      if (knowledgeKeywords.length > 0) {
        const keywordsPrompt = `系统提示：{以下是来自知识库的相关关键词，请参考这些关键词理解用户问题\n` +
          `相关关键词：${knowledgeKeywords.join("，")}\n}`;

        // 组合知识库提示、附件提示和用户输入
        finalMessage = `${keywordsPrompt}\n${attachmentsPrompt}\n${inputmessage}`;
      }

      // 如果有选择的Agent，组合Agent的Prompt
      const agentPrompt = selectedAgent ? selectedAgent.systemPrompt : '';
      const combinedInput = agentPrompt ? `${agentPrompt}\n\n${finalMessage}` : finalMessage;
      console.log('发送的消息内容:', combinedInput);

      // 调用API发送消息
      const apiResponse = await sendMessageApi(
        currentSessionId,
        isAMapEnabled,
        user_id,
        combinedInput
      );

      if (!apiResponse.ok) {
        throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
      }

      const reader = apiResponse.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // 流式处理完成后，获取历史消息并提取tool内容
          try {
            const response = await getSessionHistoryApi(currentSessionId);
            if (response.history_json) {
              let historyMessages = [];

              // 尝试标准JSON解析
              try {
                historyMessages = JSON.parse(response.history_json);
              } catch (e) {
                // 宽松解析逻辑
                try {
                  let jsonStr = response.history_json
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/[\x00-\x1F]/g, '')
                    .replace(/'/g, '"')
                    .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
                    .replace(/,\s*]/g, ']')
                    .replace(/,\s*}/g, '}');

                  historyMessages = JSON5.parse(jsonStr);
                } catch (looseError) {
                  console.error('宽松模式解析失败:', looseError);
                  // 尝试行解析作为最后手段
                  const lines = response.history_json.split('\n').filter(line => line.trim());
                  historyMessages = lines.map(line => {
                    try {
                      return JSON.parse(line);
                    } catch (e) {
                      const roleMatch = line.match(/"role":\s*"([^"]+)"/) || line.match(/'role':\s*'([^']+)'/);
                      const contentMatch = line.match(/"content":\s*"([^"]+)"/) || line.match(/'content':\s*'([^']+)'/);
                      return {
                        role: roleMatch ? roleMatch[1] : 'assistant',
                        content: contentMatch ? contentMatch[1] : line,
                        timestamp: new Date().toISOString()
                      };
                    }
                  });
                }
              }

              if (Array.isArray(historyMessages)) {
                // 查找最后一个assistant消息
                let lastAssistantIndex = -1;
                for (let i = historyMessages.length - 1; i >= 0; i--) {
                  if (historyMessages[i].role === 'assistant') {
                    lastAssistantIndex = i;
                    break;
                  }
                }

                // 检查前一条消息是否是tool
                if (lastAssistantIndex > 0 &&
                  historyMessages[lastAssistantIndex - 1].role === 'tool') {
                  const toolMessage = historyMessages[lastAssistantIndex - 1];
                  let toolContent = toolMessage.content;

                  // 提取text=''内容（如果存在）
                  const textMatch = toolContent.match(/text='([^']*)'/);
                  if (textMatch && textMatch[1]) {
                    toolContent = textMatch[1];
                  }

                  // 更新当前消息的toolContent
                  setMessages(prevMessages => {
                    const aiMessageIndex = prevMessages.findIndex(msg => msg.id === aiMessageId);
                    if (aiMessageIndex > -1) {
                      const newMessages = [...prevMessages];
                      newMessages[aiMessageIndex] = {
                        ...newMessages[aiMessageIndex],
                        toolContent: toolContent
                          .replace(/\\n/g, '\n')
                          .replace(/\\t/g, '\t')
                          .replace(/\\r/g, '\r')
                          .replace(/\\"/g, '"')
                          .replace(/\\\\/g, '\\')
                      };
                      return newMessages;
                    }
                    return prevMessages;
                  });
                }
              }
            }
          } catch (error) {
            console.error('获取历史消息失败:', error);
            // 可以选择性地处理错误
          }
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                fullResponse += data.content;
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
    } catch (error) {
      console.error('发送消息失败:', error);
      setApiError(true);

      let errorMessage = '抱歉，消息发送失败，请稍后重试。';
      if (error.message.includes('timeout') || error.name === 'AbortError') {
        errorMessage = '请求超时，请检查网络连接后重试。';
      }

      const errorMessageObj = {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prevMessages => [...prevMessages, errorMessageObj]);
    } finally {
      setLoading(false);
    }
  };

  // 选择对话
  const selectConversation = (sessionId: string) => {
    const conversation = conversations.find(conv => conv.id === sessionId);

    if (!conversation) {
      console.error('Conversation not found:', sessionId);
      return;
    }

    setConversations(prev => prev.map(conv => ({
      ...conv,
      active: conv.id === sessionId
    })));

    setCurrentSessionId(sessionId); // 确保这里是字符串
    setSelectedAgent(conversation?.agent || null);
    loadSessionMessages(sessionId);
  };

  // 处理用户上传附件(不包含知识库)
  const handleAttachFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,text/*,.pdf,,.docx,.xlsx,.pptx,.md';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      console.log('选择的文件:', files);
      try {
        // 调用接口上传文件
        const response = await PostAttachFileApi(files);
        if (response.results && Array.isArray(response.results)) {
          message.success('上传成功');
          // 存储 results 数组，这里可以根据实际需求修改存储方式，例如使用 state
          setFileResults(prevResults => [...prevResults, ...response.results]);
          console.log('存储的文件结果:', response.results);
        }
      } catch (error) {
        message.error('文件上传失败+error');
        console.error('文件上传失败:', error);
      }
    };
    input.click();
  };

  // 处理移动端侧边栏
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // 选择Agent并创建新对话
  const selectAgent = (agent) => {
    createNewConversation(agent);
  };

  // 渲染智能体视图
  const renderAgentView = () => (
    <div className="flex-1 bg-white">
      <div className="p-8">
        <div className="mb-8">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => setCurrentView('chats')}
          >
            <ArrowLeft size={16} />
            <span>返回对话</span>
          </button>
        </div>

        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">精选智能体</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presetAgents.map(agent => (
              <div
                key={agent.id}
                className="p-6 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
                onClick={() => selectAgent(agent)}
              >
                <div className="text-3xl mb-4">{agent.icon}</div>
                <h4 className="font-semibold text-gray-800 mb-2">{agent.name}</h4>
                <p className="text-gray-600 text-sm mb-4">{agent.description}</p>
                <div className="flex justify-end">
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">自定义智能体</h3>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowCreateAgent(true)}
            >
              <Plus size={16} />
              <span>创建智能体</span>
            </button>
          </div>

          {customAgents.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Bot size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">还没有自定义智能体</p>
              <p>点击"创建智能体"按钮开始</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customAgents.map(agent => (
                <div key={agent.id} className="p-6 border border-gray-200 rounded-xl">
                  <div className="text-3xl mb-4">{agent.icon}</div>
                  <h4 className="font-semibold text-gray-800 mb-2">{agent.name}</h4>
                  <p className="text-gray-600 text-sm mb-4">{agent.description}</p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      onClick={() => selectAgent(agent)}
                    >
                      使用
                    </button>
                     <button
                      className="py-2 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除"${agent.name}"吗？`)) {
                          deleteCustomAgent(agent.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

   // 渲染知识库详情页面
   const renderKnowledgeDetailView = () => (
    <div className="agent-container">
      <div className="agent-header">
        <button
          className="back-button"
          onClick={() => {
            setShowKnowledgeDetail(false);
            setCurrentKnowledgeBase(null);
            // 清空文档选中状态
            setSelectedDocuments(new Set());
          }}
        >
          <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          <span>返回知识库</span>
        </button>
      </div>

      {/* 知识库信息 */}
      <div className="knowledge-detail-header">
        <div className="knowledge-detail-info">
          <div className="knowledge-detail-icon">📚</div>
          <div>
            <h2 className="knowledge-detail-title">{currentKnowledgeBase?.name}</h2>
            <p className="knowledge-detail-description">
              {currentKnowledgeBase?.documents.length} 个文档 ·
              创建于 {currentKnowledgeBase ? new Date(currentKnowledgeBase.createdAt).toLocaleDateString() : ''}
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="knowledge-detail-actions">
        <button
          className="upload-btn"
          onClick={uploadToCurrentKnowledge}
          disabled={uploading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: uploading ? '#6b7280' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          <Upload size={16} />
          <span>{uploading ? '上传中...' : '上传文档'}</span>
        </button>

        <button
          className="batch-delete-documents-btn"
          onClick={batchDeleteDocuments}
          disabled={selectedDocuments.size === 0|| isDeletingFile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: selectedDocuments.size === 0 ? '#6b7280' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: selectedDocuments.size === 0 || isDeletingFile ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          <Trash2 size={16} />
          <span>{isDeleting ? '删除中...' : `批量删除 (${selectedDocuments.size})`}</span>
        </button>
      </div>

      {/* 文档列表 */}
      <div className="agent-section">
        <div className="custom-agent-header">
          <h3 className="agent-section-title">文档列表</h3>
          {currentKnowledgeBase?.documents && currentKnowledgeBase.documents.length > 0 && (
            <button
              className="select-all-documents-btn"
              onClick={selectAllDocuments}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'none',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              {selectedDocuments.size === currentKnowledgeBase.documents.length ?
                <CheckSquare size={14} /> :
                <Square size={14} />
              }
              <span>
                {selectedDocuments.size === currentKnowledgeBase.documents.length ? '取消全选' : '全选'}
              </span>
            </button>
          )}
        </div>
        <div className="documents-list">
        {!currentKnowledgeBase?.documents || currentKnowledgeBase.documents.length === 0 ? (
          <div className="empty-documents">
            <p>还没有上传文档</p>
            <p>点击上方"上传文档"按钮开始</p>
          </div>
        ) : (
          currentKnowledgeBase.documents.map(doc => (
            <div
              key={doc.id}
              className="document-card"
              style={{
                border: hoveredItemId === doc.id ? '1px solid #3b82f6' : '1px solid transparent',
                transition: 'border-color 0.2s ease'
              }}
              onMouseEnter={() => setHoveredItemId(doc.id)}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              {/* 优化后的勾选按钮 */}
              <div className="document-checkbox">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDocumentSelection(doc.id);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: selectedDocuments.has(doc.id) ? 'none' : '2px solid #d1d5db',
                    borderRadius: '6px',
                    background: selectedDocuments.has(doc.id) ? '#3b82f6' : 'white',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '12px',
                    opacity: hoveredItemId === doc.id || selectedDocuments.has(doc.id) ? 1 : 0,
                    marginRight: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedDocuments.has(doc.id)) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                >
                  {selectedDocuments.has(doc.id) && '✓'}
                </button>
              </div>

                <div className="document-icon">
                  {doc.name.endsWith('pdf') ? '📄' :
                    doc.name.endsWith('.docx') || doc.name.endsWith('.doc') ? '📝' :
                    doc.name.endsWith('.txt') || doc.name.endsWith('.md') ? '📄' :
                   '📄'}
                </div>

                <div className="document-info">
                  <h4 className="document-name">{doc.name}</h4>
                  <p className="document-meta">
                    上传于 {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="document-actions">
                <button
                  className="delete-document-btn"
                  onClick={() => deleteDocumentFromKnowledge(doc.id)}
                  title="删除文档"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#da3633',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    opacity: hoveredItemId === doc.id ? 1 : 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#da3633';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#da3633';
                  }}
                >
                  🗑
                </button>
              </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 隐藏的文件输入 - 知识库详情页面专用 */}
      <input
        ref={detailFileInputRef}
        type="file"
        multiple
        accept='image/*,text/*,.pdf,,.docx,.xlsx,.pptx,.md'
        onChange={handleDetailFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );


  // 渲染创建Agent弹窗
  const renderCreateAgentModal = () => (
    showCreateAgent && (
      <div className="modal-overlay" onClick={() => setShowCreateAgent(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>创建Agent</h3>
            <button
              className="modal-close"
              onClick={() => {
                setShowCreateAgent(false);
                setNewAgentName('');
                setNewAgentPrompt('');
              }}
              style={{
                padding: '8px',
                background: 'none',
                border: 'none',
                color: '#8b949e',
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                fontSize: '20px'
              }}
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label>Agent名称</label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="请输入Agent名称"
              />
            </div>
            <div className="form-group">
              <label>系统提示词</label>
              <textarea
                value={newAgentPrompt}
                onChange={(e) => setNewAgentPrompt(e.target.value)}
                placeholder="请输入系统提示词"
                rows={5}
              />
            </div>
          </div>

          <div className="modal-footer">
          <button
              className="cancel-button"
              style={{ backgroundColor: '#ff4444', color: 'white' }}
              onClick={() => {
                setShowCreateAgent(false);
                setNewAgentName('');
                setNewAgentPrompt('');
              }}
            >
              取消
            </button>
            <button
              className="confirm-button"
              style={{ backgroundColor: '#00c853', color: 'white' }}
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

  // 渲染智能体管理弹窗
  const renderAgentManagementModal = () => {
    if (!showAgentManagement) return null;

    // 统计信息
    const totalAgents = presetAgents.length + customAgents.length;
    const activeAgents = selectedAgent ? 1 : 0;
    const customAgentsCount = customAgents.filter(agent => agent.isCustom !== false).length;
    const presetAgentsCount = presetAgents.length;

    return (
      <div
        className="agent-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAgentManagement(false);
          }
        }}
      >
        <div
          className="agent-modal-content"
          style={{
            width: '95vw',
            height: '90vh',
            backgroundColor: '#0d1117',
            borderRadius: '12px',
            border: '1px solid #30363d',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* 弹窗头部 */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #30363d',
            backgroundColor: '#161b22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* 标题和统计 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#e6edf3',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🤖 智能体管理
              </h2>

              {/* 统计信息 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#21262d',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  textAlign: 'center',
                  minWidth: '70px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#2ea043' }}>
                    {totalAgents}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>总数</div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#21262d',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  textAlign: 'center',
                  minWidth: '70px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>
                    {presetAgentsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>内置</div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#21262d',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  textAlign: 'center',
                  minWidth: '70px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#f59e0b' }}>
                    {customAgentsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>自定义</div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#21262d',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  textAlign: 'center',
                  minWidth: '70px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#8b5cf6' }}>
                    {activeAgents}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>已选择</div>
                </div>
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowAgentManagement(false);
              }}
              style={{
                width: '40px',
                height: '40px',
                border: 'none',
                borderRadius: '8px',
                background: '#21262d',
                color: '#8b949e',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#30363d';
                e.target.style.color = '#e6edf3';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#21262d';
                e.target.style.color = '#8b949e';
              }}
            >
              ✕
            </button>
          </div>

          {/* 弹窗内容 */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '24px',
            overflow: 'hidden'
          }}>
            {/* 内置智能体区域 */}
            <div style={{
              flex: '0 0 auto',
              backgroundColor: '#161b22',
              borderRadius: '12px',
              border: '1px solid #30363d',
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#e6edf3',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  内置智能体
                  <span style={{
                    fontSize: '12px',
                    color: '#8b949e',
                    fontWeight: 'normal'
                  }}>({presetAgentsCount}个)</span>
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '12px'
              }}>
                {/* 默认助手选项 */}
                <div
                  onClick={() => {
                    setSelectedAgent(null);
                    setShowAgentManagement(false);
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: !selectedAgent ? '#1f2937' : '#21262d',
                    border: !selectedAgent ? '2px solid #4f46e5' : '1px solid #30363d',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedAgent) return;
                    e.target.style.backgroundColor = '#30363d';
                    e.target.style.borderColor = '#4f46e5';
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedAgent) return;
                    e.target.style.backgroundColor = '#21262d';
                    e.target.style.borderColor = '#30363d';
                  }}
                >
                  {!selectedAgent && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#4f46e5',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'white'
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#4f46e5',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      🤖
                    </div>
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#e6edf3',
                        marginBottom: '2px'
                      }}>
                        默认助手
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#8b949e'
                      }}>
                        通用AI助手
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#8b949e',
                    lineHeight: '1.4'
                  }}>
                    提供通用的AI对话服务，适用于各种日常问题和任务。
                  </div>
                </div>

                {/* 预设智能体 */}
                {presetAgents.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setShowAgentManagement(false);
                    }}
                    style={{
                      padding: '16px',
                      backgroundColor: selectedAgent?.id === agent.id ? '#1f2937' : '#21262d',
                      border: selectedAgent?.id === agent.id ? '2px solid #4f46e5' : '1px solid #30363d',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedAgent?.id === agent.id) return;
                      e.target.style.backgroundColor = '#30363d';
                      e.target.style.borderColor = '#4f46e5';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAgent?.id === agent.id) return;
                      e.target.style.backgroundColor = '#21262d';
                      e.target.style.borderColor = '#30363d';
                    }}
                  >
                    {selectedAgent?.id === agent.id && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#4f46e5',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'white'
                      }}>
                        ✓
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#4f46e5',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        {agent.icon}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#e6edf3',
                          marginBottom: '2px'
                        }}>
                          {agent.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#8b949e'
                        }}>
                          内置智能体
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#8b949e',
                      lineHeight: '1.4'
                    }}>
                      {agent.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 自定义智能体区域 */}
            <div style={{
              flex: 1,
              backgroundColor: '#161b22',
              borderRadius: '12px',
              border: '1px solid #30363d',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#e6edf3',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  自定义智能体
                  <span style={{
                    fontSize: '12px',
                    color: '#8b949e',
                    fontWeight: 'normal'
                  }}>({customAgentsCount}个)</span>
                </h3>

                <button
                  onClick={() => {
                    setShowCreateAgent(true);
                    setShowAgentManagement(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#4338ca';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#4f46e5';
                  }}
                >
                  ➕ 创建智能体
                </button>
              </div>

              <div style={{
                flex: 1,
                overflow: 'auto'
              }}>
                {customAgents.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#8b949e'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无自定义智能体</div>
                    <div style={{ fontSize: '14px' }}>点击上方按钮创建您的第一个智能体</div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '12px'
                  }}>
                    {customAgents.map(agent => (
                      <div
                        key={agent.id}
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowAgentManagement(false);
                        }}
                        style={{
                          padding: '16px',
                          backgroundColor: selectedAgent?.id === agent.id ? '#1f2937' : '#21262d',
                          border: selectedAgent?.id === agent.id ? '2px solid #4f46e5' : '1px solid #30363d',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedAgent?.id === agent.id) return;
                          e.target.style.backgroundColor = '#30363d';
                          e.target.style.borderColor = '#4f46e5';
                        }}
                        onMouseLeave={(e) => {
                          if (selectedAgent?.id === agent.id) return;
                          e.target.style.backgroundColor = '#21262d';
                          e.target.style.borderColor = '#30363d';
                        }}
                      >
                        {selectedAgent?.id === agent.id && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '20px',
                            height: '20px',
                            backgroundColor: '#4f46e5',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: 'white'
                          }}>
                            ✓
                          </div>
                        )}

                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomAgent(agent.id,agent.name);
                          }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: selectedAgent?.id === agent.id ? '36px' : '8px',
                            width: '20px',
                            height: '20px',
                            backgroundColor: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#dc2626';
                          }}
                        >
                          🗑️
                        </button>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#4f46e5',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px'
                          }}>
                            {agent.icon || '🤖'}
                          </div>
                          <div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#e6edf3',
                              marginBottom: '2px'
                            }}>
                              {agent.name}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#8b949e'
                            }}>
                              自定义智能体
                            </div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#8b949e',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {agent.systemPrompt || '暂无描述'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染创建知识库弹窗
  const renderCreateKnowledgeModal = () => (
    showCreateKnowledge && (
      <div
        className="modal-overlay"
        style={{ zIndex: 10000 }}
        onClick={() => setShowCreateKnowledge(false)}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>创建知识库</h3>
            <button
              className="modal-close"
              onClick={() => {
                setShowCreateKnowledge(false);
                setNewKnowledgeFiles([]);
              }}
              style={{
                padding: '8px',
                background: 'none',
                border: 'none',
                color: '#8b949e',
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                fontSize: '20px'
              }}
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label>知识库名称</label>
              <input
                type="text"
                value={newKnowledgeName}
                onChange={(e) => setNewKnowledgeName(e.target.value)}
                placeholder="请输入知识库名称"
                maxLength={50}
              />
              <div className="form-hint">
                知识库用于存储相关文档，为AI提供专业知识支持
              </div>
            </div>

            <div className="form-group">
              <label>上传文档（可选）</label>
              <button
                type="button"
                onClick={() => createKnowledgeFileRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  background: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={16} />
                <span>点击选择文件或拖拽文件到这里</span>
              </button>

              {newKnowledgeFiles.length > 0 && (
                <div className="uploaded-files">
                  <div className="files-header">
                    <span>已选择 {newKnowledgeFiles.length} 个文件：</span>
                  </div>
                  {newKnowledgeFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{file.name}</span>
                      <button
                        onClick={() => removeNewKnowledgeFile(index)}
                        className="remove-file-btn"
                        style={{
                          marginLeft: 'auto',
                          padding: '4px',
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={createKnowledgeFileRef}
                type="file"
                multiple
                accept='image/*,text/*,.pdf,,.docx,.xlsx,.pptx,.md'
                onChange={handleCreateKnowledgeFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="cancel-btn"
              onClick={() => {
                setShowCreateKnowledge(false);
                setNewKnowledgeFiles([]);
              }}
            >
              取消
            </button>
            <button
              className="create-btn"
              onClick={createKnowledgeBase}
              disabled={!newKnowledgeName.trim()}
            >
              创建知识库
            </button>
          </div>
        </div>
      </div>
    )
  );

  // 渲染知识库管理弹窗
  const renderKnowledgeManagementModal = () => {
    if (!showKnowledgeModal) return null;

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 获取文件图标
    const getFileIcon = (type) => {
      switch (type) {
        case 'pdf': return '📄';
        case 'docx':
        case 'doc': return '📝';
        case 'txt': return '📄';
        case 'xlsx':
        case 'xls': return '📊';
        default: return '📄';
      }
    };

    // 过滤知识库
    const filteredKnowledgeBases = knowledgeBases.filter(kb =>
      kb.name.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
      kb.description?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
    );

    // 统计信息
    const totalDocuments = knowledgeBases.reduce((sum, kb) => sum + kb.documents.length, 0);
    const selectedKnowledgeCount = selectedKnowledgeBases.size;

    return (
      <div
        className="knowledge-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowKnowledgeModal(false);
            setCurrentKnowledgeBase(null);
            setSelectedKnowledgeBases(new Set());
            setSelectedDocuments(new Set());
            setSearchTerm('');
          }
        }}
      >
        <div
          className="knowledge-modal-content"
          style={{
            width: '95vw',
            height: '90vh',
            backgroundColor: '#0d1117',
            borderRadius: '12px',
            border: '1px solid #30363d',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* 弹窗头部 */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #30363d',
            backgroundColor: '#161b22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={32} style={{ color: '#2ea043' }} />
                <div>
                  <h1 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    margin: 0,
                    color: '#e6edf3'
                  }}>
                    知识库管理中心
                  </h1>
                  <p style={{
                    fontSize: '14px',
                    color: '#8b949e',
                    margin: '4px 0 0 0'
                  }}>
                    集中管理您的文档和知识库，为AI提供专业知识支持
                  </p>
                </div>
              </div>
            </div>

            {/* 统计信息和关闭按钮 */}
            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center'
            }}>
              {/* 统计信息卡片 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#21262d',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  textAlign: 'center',
                  minWidth: '70px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#2ea043' }}>
                    {isKnowledgeBasesLoading ? '...' : knowledgeBases.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>知识库</div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#21262d',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  textAlign: 'center',
                  minWidth: '70px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>
                    {isKnowledgeBasesLoading ? '...' : totalDocuments}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>文档</div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#21262d',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  textAlign: 'center',
                  minWidth: '70px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#f59e0b' }}>
                    {selectedKnowledgeCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>已选择</div>
                </div>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={() => {
                  setShowKnowledgeModal(false);
                  setCurrentKnowledgeBase(null);
                  setSelectedKnowledgeBases(new Set());
                  setSelectedDocuments(new Set());
                  setSearchTerm('');
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#21262d',
                  color: '#8b949e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#da3633';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#21262d';
                  e.target.style.color = '#8b949e';
                }}
                title="关闭知识库管理"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 工具栏 */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #30363d',
            backgroundColor: '#161b22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* 左侧操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setShowCreateKnowledge(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  backgroundColor: '#238636',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <Plus size={16} />
                新建知识库
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedKnowledgeCount === 0 || uploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  backgroundColor: selectedKnowledgeCount === 0 || uploading ? '#30363d' : '#3b82f6',
                  color: selectedKnowledgeCount === 0 || uploading ? '#8b949e' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedKnowledgeCount === 0 || uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {uploading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    批量上传 ({selectedKnowledgeCount})
                  </>
                )}
              </button>

              <button
                onClick={batchDeleteKnowledgeBases}
                disabled={selectedKnowledgeCount === 0 || isDeleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  backgroundColor: selectedKnowledgeCount === 0 ? '#30363d' : '#da3633',
                  color: selectedKnowledgeCount === 0 ? '#8b949e' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedKnowledgeCount === 0 || isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                {isDeleting ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    批量删除 ({selectedKnowledgeCount})
                  </>
                )}
              </button>

              <button
                onClick={selectAllKnowledgeBases}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  backgroundColor: '#21262d',
                  color: '#e6edf3',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                {selectedKnowledgeCount === filteredKnowledgeBases.length && filteredKnowledgeBases.length > 0 ?
                  <CheckSquare size={16} /> : <Square size={16} />
                }
                {selectedKnowledgeCount === filteredKnowledgeBases.length && filteredKnowledgeBases.length > 0 ? '取消全选' : '全选'}
              </button>

              <button
                onClick={loadKnowledgeBases}
                disabled={isKnowledgeBasesLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  backgroundColor: '#21262d',
                  color: '#e6edf3',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  cursor: isKnowledgeBasesLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                <RefreshCw size={16} style={{
                  animation: isKnowledgeBasesLoading ? 'spin 1s linear infinite' : 'none'
                }} />
                刷新
              </button>
            </div>

            {/* 右侧搜索框 */}
            <div style={{
              position: 'relative',
              minWidth: '320px',
              maxWidth: '450px',
              flex: '1'
            }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#8b949e'
              }} />
              <input
                type="text"
                placeholder="搜索知识库名称或描述..."
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 18px 12px 44px',
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#e6edf3',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '28px',
                    height: '28px',
                    border: 'none',
                    borderRadius: '4px',
                    background: 'transparent',
                    color: '#8b949e',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 主内容区 */}
          <div style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden'
          }}>
            {/* 左侧知识库列表 */}
            <div style={{
              width: currentKnowledgeBase ? '450px' : '100%',
              borderRight: currentKnowledgeBase ? '1px solid #30363d' : 'none',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0d1117',
              transition: 'width 0.3s ease'
            }}>
              {/* 列表头部 */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #30363d',
                backgroundColor: '#161b22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: 0,
                  color: '#e6edf3'
                }}>
                  知识库列表 {filteredKnowledgeBases.length > 0 && `(${filteredKnowledgeBases.length})`}
                </h3>

                {searchTerm && (
                  <div style={{
                    fontSize: '12px',
                    color: '#8b949e',
                    background: '#21262d',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    搜索: "{searchTerm}"
                  </div>
                )}
              </div>

              {/* 知识库列表 */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '12px 16px'
              }}>
                {isKnowledgeBasesLoading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '300px',
                    color: '#8b949e'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '20px'
                    }}></div>
                    <p style={{ fontSize: '16px' }}>加载知识库中...</p>
                  </div>
                ) : filteredKnowledgeBases.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    color: '#8b949e'
                  }}>
                    <Database size={80} style={{ marginBottom: '20px', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '20px', margin: '0 0 12px 0', color: '#e6edf3' }}>
                      {searchTerm ? '未找到匹配的知识库' : '还没有知识库'}
                    </h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '14px' }}>
                      {searchTerm ? '尝试调整搜索条件' : '创建您的第一个知识库来开始管理文档'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowCreateKnowledge(true)}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: '#238636',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        创建知识库
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {filteredKnowledgeBases.map(kb => (
                      <div
                        key={kb.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '18px',
                          backgroundColor: currentKnowledgeBase?.id === kb.id ? '#264f78' : '#161b22',
                          border: `1px solid ${currentKnowledgeBase?.id === kb.id ? '#4f9cf9' : '#30363d'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onClick={() => setCurrentKnowledgeBase(kb)}
                        onMouseEnter={(e) => {
                          if (currentKnowledgeBase?.id !== kb.id) {
                            e.currentTarget.style.backgroundColor = '#21262d';
                            e.currentTarget.style.borderColor = '#4f9cf9';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentKnowledgeBase?.id !== kb.id) {
                            e.currentTarget.style.backgroundColor = '#161b22';
                            e.currentTarget.style.borderColor = '#30363d';
                            e.currentTarget.style.transform = 'translateY(0px)';
                          }
                        }}
                      >
                        {/* 选择框 */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleKnowledgeBaseSelection(kb.id);
                          }}
                          style={{
                            width: '22px',
                            height: '22px',
                            border: `2px solid ${selectedKnowledgeBases.has(kb.id) ? '#3b82f6' : '#8b949e'}`,
                            borderRadius: '4px',
                            backgroundColor: selectedKnowledgeBases.has(kb.id) ? '#3b82f6' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            marginRight: '14px',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                          }}
                        >
                          {selectedKnowledgeBases.has(kb.id) && (
                            <Check size={14} style={{ color: 'white' }} />
                          )}
                        </div>

                        {/* 知识库图标 */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: '#2ea043',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          flexShrink: 0
                        }}>
                          <Database size={24} style={{ color: 'white' }} />
                        </div>

                        {/* 知识库信息 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#e6edf3',
                            marginBottom: '6px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {kb.name}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#8b949e',
                            marginBottom: '8px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                           包含 {kb.documents?.length || 0} 个文档
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            fontSize: '12px',
                            color: '#8b949e'
                          }}>
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FileText size={12} />
                              {kb.documents?.length || 0} 个文档
                            </span>
                            <span>
                              创建于 {new Date(kb.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* 右侧箭头 */}
                        <div style={{
                          marginLeft: '12px',
                          color: '#8b949e',
                          transition: 'all 0.2s ease',
                          transform: currentKnowledgeBase?.id === kb.id ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}>
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧详情面板 */}
            {currentKnowledgeBase && (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0d1117'
              }}>
                {/* 详情头部 */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #30363d',
                  backgroundColor: '#161b22'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#2ea043',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Database size={20} style={{ color: 'white' }} />
                      </div>
                      <div>
                        <h2 style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          margin: 0,
                          color: '#e6edf3'
                        }}>
                          {currentKnowledgeBase.name}
                        </h2>
                        <p style={{
                          fontSize: '14px',
                          color: '#8b949e',
                          margin: '4px 0 0 0'
                        }}>
                          包含 {currentKnowledgeBase.documents?.length || 0} 个文档的知识库
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentKnowledgeBase(null)}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#21262d',
                        color: '#8b949e',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        transition: 'all 0.2s ease'
                      }}
                      title="关闭详情"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    <button
                      onClick={() => detailFileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: uploading ? '#30363d' : '#3b82f6',
                        color: uploading ? '#8b949e' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {uploading ? (
                        <>
                          <div style={{
                            width: '14px',
                            height: '14px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          上传文档
                        </>
                      )}
                    </button>

                    <button
                      onClick={deleteSelectedDocuments}
                      disabled={selectedDocuments.size === 0 || isDeletingFile}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: selectedDocuments.size === 0 ? '#30363d' : '#da3633',
                        color: selectedDocuments.size === 0 ? '#8b949e' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: selectedDocuments.size === 0 || isDeletingFile ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isDeletingFile ? (
                        <>
                          <div style={{
                            width: '14px',
                            height: '14px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          删除中...
                        </>
                      ) : (
                        <>
                          🗑️
                          删除文档 ({selectedDocuments.size})
                        </>
                      )}
                    </button>

                    <div style={{
                      marginLeft: 'auto',
                      fontSize: '14px',
                      color: '#8b949e'
                    }}>
                      共 {currentKnowledgeBase.documents?.length || 0} 个文档
                    </div>
                  </div>
                </div>

                {/* 文档列表 */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '16px 20px'
                }}>
                  {currentKnowledgeBase.documents?.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '80px 20px',
                      color: '#8b949e'
                    }}>
                      <FileText size={80} style={{ marginBottom: '20px', opacity: 0.5 }} />
                      <h3 style={{ fontSize: '18px', margin: '0 0 12px 0', color: '#e6edf3' }}>
                        还没有文档
                      </h3>
                      <p style={{ margin: '0 0 20px 0', fontSize: '14px' }}>
                        上传文档来为这个知识库添加内容
                      </p>
                      <button
                        onClick={() => detailFileInputRef.current?.click()}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        上传文档
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {/* 文档列表工具栏 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#161b22',
                        borderRadius: '8px',
                        border: '1px solid #30363d'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <button
                            onClick={toggleSelectAllDocuments}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              backgroundColor: '#21262d',
                              color: '#e6edf3',
                              border: '1px solid #30363d',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {selectedDocuments.size === currentKnowledgeBase.documents?.length && currentKnowledgeBase.documents?.length > 0 ?
                              <CheckSquare size={14} /> : <Square size={14} />
                            }
                            {selectedDocuments.size === currentKnowledgeBase.documents?.length && currentKnowledgeBase.documents?.length > 0 ? '取消全选' : '全选'}
                          </button>

                          {selectedDocuments.size > 0 && (
                            <span style={{
                              fontSize: '12px',
                              color: '#8b949e',
                              background: '#21262d',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}>
                              已选择 {selectedDocuments.size} 个文档
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 文档项列表 */}
                      {currentKnowledgeBase.documents?.map(doc => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px',
                            backgroundColor: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#21262d';
                            e.currentTarget.style.borderColor = '#4f9cf9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#161b22';
                            e.currentTarget.style.borderColor = '#30363d';
                          }}
                        >
                          {/* 选择框 */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDocumentSelection(doc.id);
                            }}
                            style={{
                              width: '20px',
                              height: '20px',
                              border: `2px solid ${selectedDocuments.has(doc.id) ? '#3b82f6' : '#8b949e'}`,
                              borderRadius: '4px',
                              backgroundColor: selectedDocuments.has(doc.id) ? '#3b82f6' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              marginRight: '12px',
                              transition: 'all 0.2s ease',
                              flexShrink: 0
                            }}
                          >
                            {selectedDocuments.has(doc.id) && (
                              <Check size={12} style={{ color: 'white' }} />
                            )}
                          </div>

                          {/* 文件图标 */}
                          <div style={{
                            fontSize: '24px',
                            marginRight: '12px',
                            flexShrink: 0
                          }}>
                            {getFileIcon(doc.type)}
                          </div>

                          {/* 文档信息 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#e6edf3',
                              marginBottom: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {doc.name}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              fontSize: '12px',
                              color: '#8b949e'
                            }}>
                               <span>{(doc.name ? doc.name.split('.').pop() : 'FILE').toUpperCase()}</span>
                              <span>{formatFileSize(doc.size || 0)}</span>
                              <span>上传于 {new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* 删除按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDocument(doc.id);
                            }}
                            disabled={isDeletingFile}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              borderRadius: '6px',
                              background: isDeletingFile ? '#21262d' : '#2d333b',
                              color: isDeletingFile ? '#6e7681' : '#f85149',
                              cursor: isDeletingFile ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s cubic-bezier(0.3, 0, 0.5, 1)',
                              marginLeft: '8px',
                              boxShadow: '0 1px 0 rgba(27, 31, 36, 0.04)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              if (!isDeletingFile) {
                                e.currentTarget.style.background = '#f85149';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.boxShadow = '0 1px 0 rgba(27, 31, 36, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isDeletingFile) {
                                e.currentTarget.style.background = '#2d333b';
                                e.currentTarget.style.color = '#f85149';
                                e.currentTarget.style.boxShadow = '0 1px 0 rgba(27, 31, 36, 0.04)';
                              }
                            }}
                            title="删除文档"
                          >
                            {isDeletingFile ? (
                              <span style={{
                                display: 'inline-block',
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(240, 246, 252, 0.1)',
                                borderTopColor: '#6e7681',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }} />
                            ) : (
                              '🗑️'
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept='image/*,text/*,.pdf,,.docx,.xlsx,.pptx,.md'
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <input
            ref={detailFileInputRef}
            type="file"
            multiple
            accept='image/*,text/*,.pdf,,.docx,.xlsx,.pptx,.md'
            onChange={handleDetailFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    );
  };

  // 渲染设置菜单
  const renderSettingsMenu = () => (
    showSettingsMenu && (
      <div className="settings-dropdown">
        <div className="settings-menu-item" onClick={() => handleSettingsMenuClick('system')}>
          <span style={{ fontSize: '16px', marginRight: '12px' }}>⚙️</span>
          <span>系统设置</span>
        </div>
        <div className="settings-menu-item" onClick={() => handleSettingsMenuClick('contact')}>
          <span style={{ fontSize: '16px', marginRight: '12px' }}>❓</span>
          <span>联系我们</span>
        </div>
        <div className="settings-menu-divider"></div>
        <div className="settings-menu-item danger" onClick={() => handleSettingsMenuClick('logout')}>
          <span style={{ fontSize: '16px', marginRight: '12px' }}>🚪</span>
          <span>退出登录</span>
        </div>
      </div>
    )
  );

  const handleDeleteFile = (index: number) => {
    setFileResults(prevResults => [
      ...prevResults.slice(0, index),
      ...prevResults.slice(index + 1)
    ]);
  };

  //处理知识库选择
  const handleKnowledgeBaseSelect = (knowledgeBaseIds) => {
    // 1. 更新选中的知识库ID状态
    setSelectedKnowledgeBases(new Set(knowledgeBaseIds));

    // 2. 如果没有选择知识库，直接返回
    if (knowledgeBaseIds.length === 0) return;

    // 3. 获取选中的知识库对象
    const selectedKBs = knowledgeBases.filter(kb => knowledgeBaseIds.includes(kb.id));
    if (selectedKBs.length === 0) return;

    // 4. 这里可以添加后续逻辑
    console.log(`已选择知识库: ${selectedKBs.map(kb => kb.name).join(', ')}`);

    // 5. 可以在这里添加提示信息
    message.info(`已选择知识库: ${selectedKBs.map(kb => kb.name).join(', ')}`);
  };

    //清除知识库选择
  const clearKnowledgeBaseSelection = () => {
    setSelectedKnowledgeBases(new Set());
    setShowKnowledgeDropdown(false);
    message.info('已清除知识库选择');
  };

  return (

    <div className="app-container">
      {/* 添加CSS动画 */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

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
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: loading ? '#30363d' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            {isSidebarOpen && <span>{loading ? '创建中...' : '新对话'}</span>}
          </button>

          {/* 桌面端切换按钮 */}
          <button
            className="toggle-sidebar-btn desktop-only"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              padding: '8px',
              border: '1px solid #30363d',
              background: '#21262d',
              color: '#e6edf3',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>

          {/* 移动端关闭按钮 */}
          <button
            className="close-mobile-sidebar mobile-only"
            onClick={toggleMobileSidebar}
            style={{
              display: 'none',
              padding: '8px',
              background: 'none',
              border: 'none',
              color: '#e6edf3',
              cursor: 'pointer',
              borderRadius: '4px',
              alignSelf: 'flex-end',
              fontSize: '20px'
            }}
          >
            ✕
          </button>
        </div>

        {/* 视图切换按钮 */}
        <div className="view-tabs">
          <button
            className={`view-tab ${currentView === 'chats' ? 'active' : ''}`}
            onClick={() => setCurrentView('chats')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              background: currentView === 'chats' ? '#4f46e5' : 'none',
              color: currentView === 'chats' ? 'white' : '#8b949e',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              fontWeight: currentView === 'chats' ? '500' : 'normal'
            }}
          >
            <span style={{ fontSize: '16px' }}>💬</span>
            {isSidebarOpen && <span>对话</span>}
          </button>
          <button
            className={`view-tab ${currentView === 'agents' ? 'active' : ''}`}
            onClick={() => {
              setShowAgentManagement(true);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              color: '#8b949e',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              fontWeight: 'normal'
            }}
          >
            <span style={{ fontSize: '16px' }}>🤖</span>
            {isSidebarOpen && <span>智能体</span>}
          </button>

          <button
          className={`view-tab`}
          onClick={() => setShowKnowledgeModal(true)}
          disabled={isKnowledgeBasesLoading}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            background: 'none',
            color: '#8b949e',
            borderRadius: '6px',
            cursor: isKnowledgeBasesLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            fontWeight: 'normal'
          }}
        >
          <span style={{
            fontSize: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isKnowledgeBasesLoading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                加载中
              </>
            ) : (
              <>
                📚
                {isSidebarOpen && <span>知识库</span>}
              </>
            )}
          </span>
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
                        {conversation.agent.icon || <span style={{ fontSize: '16px' }}>🤖</span>}
                      </div>
                    ) : (
                      <span style={{ fontSize: '16px' }}>💬</span>
                    )}
                    {isSidebarOpen && (
                      <div className="conversation-info">
                        <span className="conversation-title">{conversation.title}</span>
                        {conversation.preview && (
                          <span className="conversation-preview">{conversation.preview}</span>
                        )}
                      </div>
                    )}

                    {/* 删除按钮 */}
                    {(hoveredItemId === conversation.id || !isSidebarOpen) && (
                      <button
                        className="delete-conversation-btn"
                        onClick={(e) => deleteConversation(conversation.id, e)}
                        title="删除对话"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '24px',
                          height: '24px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'rgba(218, 54, 51, 0.1)',
                          color: '#da3633',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: hoveredItemId === conversation.id ? 1 : 0,
                          transition: 'all 0.2s ease',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#da3633';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(218, 54, 51, 0.1)';
                          e.target.style.color = '#da3633';
                        }}
                      >
                        ✕
                      </button>
                    )}

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
            <div className="other-view">
              <p style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>其他视图</p>
            </div>
          )}
        </div>

        {/* 侧边栏底部 */}
        <div className="sidebar-footer">
          {/* 统计信息 */}
          {isSidebarOpen && (
             <div className="agents-stats">
             <div className="stats-card">
               {/* 新增智能体选择器 */}
                <div className="agent-selector" ref={agentSelectorRef} style={{ position: 'relative' }}>
                <div
                  className="agent-dropdown-trigger"
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: showAgentDropdown ? '#264f78' : '#30363d',
                    color: '#e6edf3',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minWidth: '180px',
                    height: '40px',
                    boxSizing: 'border-box',
                    marginRight: '8px',
                    border: '1px solid #404040',
                    transition: 'all 0.2s ease',
                    boxShadow: showAgentDropdown ? '0 0 0 2px rgba(79, 70, 229, 0.3)' : 'none'
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '130px',
                    fontSize: '13px'
                  }}>
                    {selectedAgent ? selectedAgent.name : '选择智能体'}
                  </span>
                  <span style={{
                    marginLeft: '8px',
                    flexShrink: 0,
                    transform: showAgentDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}>▼</span>
                </div>

                {/* 智能体下拉菜单 */}
                {showAgentDropdown && (
                  <div
                    className="agent-dropdown-menu"
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#1a1d23',
                      border: '1px solid #404040',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                      zIndex: 1000,
                      maxHeight: '400px',
                      overflowY: 'auto',
                      marginBottom: '8px',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {/* 默认选项 */}
                    <div
                      onClick={() => {
                        setSelectedAgent(null);
                        setShowAgentDropdown(false);
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #30363d',
                        backgroundColor: !selectedAgent ? '#264f78' : 'transparent',
                        color: '#e6edf3',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedAgent) return;
                        e.target.style.backgroundColor = '#30363d';
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedAgent) return;
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🤖</span>
                        <span>默认助手</span>
                      </span>
                    </div>

                    {/* 预设智能体 */}
                    {presetAgents.length > 0 && (
                      <>
                        <div style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          color: '#8b949e',
                          backgroundColor: '#161b22',
                          borderBottom: '1px solid #30363d'
                        }}>
                          精选智能体
                        </div>
                        {presetAgents.map(agent => (
                          <div
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setShowAgentDropdown(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #30363d',
                              backgroundColor: selectedAgent?.id === agent.id ? '#264f78' : 'transparent',
                              color: '#e6edf3',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedAgent?.id === agent.id) return;
                              e.target.style.backgroundColor = '#30363d';
                            }}
                            onMouseLeave={(e) => {
                              if (selectedAgent?.id === agent.id) return;
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span>{agent.icon}</span>
                            <span>{agent.name}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* 自定义智能体 */}
                    {customAgents.length > 0 && (
                      <>
                        <div style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          color: '#8b949e',
                          backgroundColor: '#161b22',
                          borderBottom: '1px solid #30363d',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>自定义智能体</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAgentManagement(true);
                              setShowAgentDropdown(false);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#4f46e5',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '2px 4px'
                            }}
                          >
                            管理
                          </button>
                        </div>
                        {customAgents.map(agent => (
                          <div
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setShowAgentDropdown(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #30363d',
                              backgroundColor: selectedAgent?.id === agent.id ? '#264f78' : 'transparent',
                              color: '#e6edf3',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedAgent?.id === agent.id) return;
                              e.target.style.backgroundColor = '#30363d';
                            }}
                            onMouseLeave={(e) => {
                              if (selectedAgent?.id === agent.id) return;
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span>{agent.icon || '🤖'}</span>
                            <span>{agent.name}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* 创建智能体选项 */}
                    <div
                      onClick={() => {
                        setShowCreateAgent(true);
                        setShowAgentDropdown(false);
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        color: '#4f46e5',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#30363d';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>+</span>
                      <span>创建智能体</span>
                    </div>
                  </div>
                )}
                </div>
               <div className="stats-icon">
                 <Bot size={16} />
               </div>
             </div>
             <div className="stats-card">
               <div className="stats-info">
                 <span className="stats-number">
                 {isKnowledgeBasesLoading ? (
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                ) : getTotalKnowledgeBasesCount()}
                  </span>
                 <span className="stats-label">知识库</span>
               </div>
               <div className="stats-icon">
                 <Database size={16} />
               </div>
             </div>
           </div>
          )}

          <button
            className="sidebar-button"
            onMouseEnter={() => setHoveredItemId('history')}
            onMouseLeave={() => setHoveredItemId(null)}
            onClick={refreshHistory}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '6px',
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              gap: '12px',
              color: '#e6edf3',
              transition: 'all 0.2s ease',
              position: 'relative',
              fontSize: '14px',
              width: '100%',
              opacity: loading ? 0.6 : 1
            }}
          >
            <span style={{
              fontSize: '18px',
              animation: loading ? 'spin 1s linear infinite' : 'none',
              display: 'inline-block'
            }}>🔄</span>
            {isSidebarOpen && <span>{loading ? '刷新中...' : '刷新历史'}</span>}
            {!isSidebarOpen && hoveredItemId === 'history' && (
              <div className="sidebar-tooltip">刷新历史</div>
            )}
          </button>

          <div className="user-menu-container" style={{ position: 'relative' }}>
          <button
            className="sidebar-button"
            onMouseEnter={() => setHoveredItemId('user')}
            onMouseLeave={() => setHoveredItemId(null)}
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: '12px',
              color: '#e6edf3',
              transition: 'all 0.2s ease',
              position: 'relative',
              fontSize: '14px',
              width: '100%'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {/* 默认头像或用户真实头像 */}
              <img
                src={'/icons/image.png'}
                alt="用户头像"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {isSidebarOpen && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{ '登录用户'}</span>
              </div>
            )}
            {!isSidebarOpen && hoveredItemId === 'user' && (
              <div className="sidebar-tooltip">用户中心</div>
            )}
          </button>

          {/* 用户菜单弹窗 */}
          {showUserMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              width: '100%',
              backgroundColor: '#1f2937',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '8px 0',
              marginBottom: '8px',
              zIndex: 100
            }}>
              <button
              onClick={() => handleProfileClick()}
              style={{
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                color: '#e6edf3',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                ':hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <FiUser size={16} />
              个人中心
            </button>

            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }}></div>

            <button
              onClick={() => handleLogout()}
              style={{
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                color: '#e6edf3',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                ':hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <FiLogOut size={16} />
              退出登录
            </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className={`main-content ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`} style={{ flexGrow: 1, width: 'calc(100% - 侧边栏宽度)' }}>
        {/* 移动端头部 */}
        <div className="mobile-header">
          <button
            className="mobile-toggle-btn"
            onClick={toggleMobileSidebar}
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              color: '#e6edf3',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
              fontSize: '20px'
            }}
          >
            ☰
          </button>
          <div className="mobile-title">
            {selectedAgent ? selectedAgent.name : 'Astrum Chat'}
          </div>
        </div>
        <div className="chat-container" style={{ width: '70vw', maxWidth: '100%', margin: '0', padding: '0' }}>
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
                    {message.role === 'user' ? (
                      <div className="user-avatar">
                        <span style={{ fontSize: '20px' }}>👤</span>
                      </div>
                    ) : (
                      <div className="ai-avatar">
                        <img
                          src={'/ai-avatar.png'}
                          alt="AI头像"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                    <span className="message-role">
                      {message.role === 'user'
                        ? '你'
                        : (selectedAgent?.name || 'AI小助手')}
                    </span>
                      <span className="message-timestamp">{message.timestamp}</span>
                    </div>
                    {/* 渲染主内容 */}
                    {message.content && (
                      <div className="message-text">
                        {message.content}
                      </div>
                    )}
                    {/* 渲染 tool 内容（如果有） */}
                    {message.toolContent && (
                      <div className="tool-content-wrapper">
                        <div className="tool-content-header" onClick={() => toggleToolContent(message.id)}>
                          <span>点击展开MCP检索全部内容</span>
                          <span className="tool-content-toggle-icon">
                            {expandedToolContents[message.id] ? '▲' : '▼'}
                          </span>
                        </div>
                        {expandedToolContents[message.id] && (
                          <div className="tool-content-expanded">
                            {message.toolContent}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* 打字指示器 */}
            {loading && messages.length > 0 && (
              <div className="typing-indicator">
                <div className="message assistant">
                  <div className="message-avatar">
                    <div className="ai-avatar">
                      <img
                      src={'ai-avatar.png'}
                      alt="AI头像"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
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
            {fileResults.length > 0 && (
              <div className="uploaded-files">
                <h4>已上传文件</h4>
                <div className="file-list">
                  {fileResults.map((file, index) => (
                    <div key={index} className="file-item">
                      {file.filename}
                      <button
                        className="file-delete-btn"
                        onClick={() => handleDeleteFile(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                {/* 扳手按钮 - MCP服务设置 */}
                <button
                  className="mcp-settings-button"
                  onClick={() => {
                    setShowMCPModal(true);
                    document.body.classList.add('modal-open');
                  }}
                  title="MCP服务设置"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#30363d',
                    color: '#e6edf3',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '16px'
                  }}
                >
                  🔧
                </button>
               {/* 知识库选择器 */}
              <div className="knowledge-selector" ref={knowledgeSelectorRef}>
                <div
                  className="knowledge-dropdown-trigger"
                  onClick={() => setShowKnowledgeDropdown(!showKnowledgeDropdown)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#30363d',
                    color: '#e6edf3',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minWidth: '160px',
                    height: '36px',
                    boxSizing: 'border-box'
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '130px',
                    fontSize: '13px'
                  }}>
                    {tempSelectedKnowledgeForMessage.size === 0
                      ? '选择知识库'
                      : knowledgeBases.find(kb => tempSelectedKnowledgeForMessage.has(kb.id))?.name || '选择知识库'
                    }
                  </span>
                  <span style={{ marginLeft: '8px', flexShrink: 0 }}>
                    {showKnowledgeDropdown ? '▲' : '▼'}
                  </span>
                </div>

                {showKnowledgeDropdown && (
                  <div
                    className="knowledge-dropdown-menu"
                    style={{
                      position: 'fixed',
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      background: '#21262d',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      height: '180px',
                      overflowY: 'auto',
                      width: '220px',
                      border: '1px solid #30363d'
                    }}
                  >
                    {knowledgeBases.length === 0 ? (
                      <div style={{ padding: '8px', color: '#8b949e', fontSize: '13px' }}>暂无知识库</div>
                    ) : (
                      <>
                        <div style={{
                          padding: '4px 8px',
                          marginBottom: '8px',
                          borderBottom: '1px solid #30363d',
                          color: '#8b949e',
                          fontSize: '13px'
                        }}>
                          本次对话使用（单选）
                        </div>
                        <div
                          className="knowledge-dropdown-item"
                          onClick={() => {
                            setTempSelectedKnowledgeForMessage(new Set()); // 清除临时选择
                            setShowKnowledgeDropdown(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: tempSelectedKnowledgeForMessage.size === 0 ? '#4f46e5' : 'transparent',
                            color: tempSelectedKnowledgeForMessage.size === 0 ? 'white' : '#e6edf3',
                            margin: '2px 0',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s ease',
                            fontSize: '13px'
                          }}
                        >
                          <span style={{
                            marginRight: '8px',
                            width: '16px',
                            textAlign: 'center'
                          }}>
                            {tempSelectedKnowledgeForMessage.size === 0 ? '✓' : '○'}
                          </span>
                          <span>不使用知识库</span>
                        </div>
                        {knowledgeBases.map(kb => (
                          <div
                            key={kb.id}
                            className="knowledge-dropdown-item"
                            onClick={() => {
                              setTempSelectedKnowledgeForMessage(new Set([kb.id])); // 只选择当前知识库（临时）
                              setShowKnowledgeDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: tempSelectedKnowledgeForMessage.has(kb.id) ? '#4f46e5' : 'transparent',
                              color: tempSelectedKnowledgeForMessage.has(kb.id) ? 'white' : '#e6edf3',
                              margin: '2px 0',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s ease',
                              fontSize: '13px'
                            }}
                          >
                            <span style={{
                              marginRight: '8px',
                              width: '16px',
                              textAlign: 'center'
                            }}>
                              {tempSelectedKnowledgeForMessage.has(kb.id) ? '✓' : '○'}
                            </span>
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>{kb.name}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
                {showMCPModal && (
                  <div
                    className="modal-backdrop"
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 1000,
                      cursor: 'not-allowed'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {/* MCP服务设置弹窗 */}
                {showMCPModal && (
                  <div
                    className="mcp-modal"
                    style={{
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#f0f0f0',
                      borderRadius: '8px',
                      padding: '20px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      zIndex: 1001,
                      width: '360px',
                    }}
                  >
                    {/* 弹窗头部 - 添加了"添加服务器"按钮 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}>
                      <div style={{ color: '#333', fontWeight: 'bold', fontSize: '16px' }}>MCP Servers</div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {/* 添加服务器按钮 */}
                        <button
                          onClick={() => handleAddServer()} // 您需要实现这个函数
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#333',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            padding: '0 8px',
                            marginRight: '4px'
                          }}
                        >
                          +
                        </button>
                        {/* 关闭按钮 */}
                        <button
                          onClick={() => setShowMCPModal(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#333',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            padding: '0 4px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* 最大连接数显示 */}
                    <div style={{
                      color: '#333',
                      marginBottom: '16px',
                      fontSize: '14px'
                    }}>
                      最大 MCP Server 连接数：10
                    </div>

                    {/* 高德地图选项 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4CAF50',
                        marginRight: '8px'
                      }}></span>
                        <span style={{ marginRight: '8px',color: '#000000'  }}>南海科技院</span>
                        <span style={{
                          fontSize: '12px',
                          color: '#4CAF50',
                          background: 'rgba(76, 175, 80, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>官方示例</span>
                      </div>
                      <div
                        style={{
                          width: '40px',
                          height: '20px',
                          background: isAMapEnabled ? '#9C27B0' : '#e0e0e0',
                          borderRadius: '10px',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        onClick={() => setIsAMapEnabled(!isAMapEnabled)}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          left: isAMapEnabled ? '22px' : '2px',
                          width: '16px',
                          height: '16px',
                          background: '#fff',
                          borderRadius: '50%',
                          transition: 'left 0.2s ease'
                        }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
                <button
                  className="attach-button"
                  onClick={handleAttachFile}
                  title="附加文件，支持PDF、Word、Excel等文件，最大5MB，最多20个文件"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#30363d',
                    color: '#e6edf3',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '16px'
                  }}
                >
                  📎
                </button>

               <button
                  className="send-button"
                  onClick={handleSendMessage}
                  disabled={inputMessage.trim() === '' || loading}
                  title="发送消息"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inputMessage.trim() === '' || loading ? '#30363d' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: 'white',
                    cursor: inputMessage.trim() === '' || loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '16px',
                    position: 'relative'
                  }}
                >
                  {loading ? (
                    <div className="sending-dots">
                      <span style={{ animationDelay: '0s' }}>•</span>
                      <span style={{ animationDelay: '0.2s' }}>•</span>
                      <span style={{ animationDelay: '0.4s' }}>•</span>
                    </div>
                  ) : (
                    '➤'
                  )}
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
      {/* 创建知识库弹窗 */}
      {renderCreateKnowledgeModal()}

      {/* 智能体管理弹窗 */}
      {renderAgentManagementModal()}

      {/* 知识库管理弹窗 */}
      {renderKnowledgeManagementModal()}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

