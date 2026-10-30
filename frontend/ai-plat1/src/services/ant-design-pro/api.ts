// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import { IP_CONFIG } from '../../config/ipConfig';
function getToken() {
  // 这里需要实现获取 token 的逻辑，例如从 localStorage 中获取
  return localStorage.getItem('token');
}
/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  // return request<{
  //   data: API.CurrentUser;
  // }>('/api/currentUser', {
  //   method: 'GET',
  //   ...(options || {}),
  // });

  const token = getToken();
  const headers = {
    ...(options?.headers || {}),
    'Authorization': `Bearer ${token}`
  };
  return request<{
    data: API.CurrentUser;
  }>(IP_CONFIG.API_IP3+'/users/me', {
    method: 'GET',
    headers,
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/login/account */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  // return request<API.LoginResult>('/api/login/account', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   data: body,
  //   ...(options || {}),
  // });

  return request<API.LoginResult>(IP_CONFIG.API_IP3 + '/users/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/**注册接口* POST /api/register */
export async function register(body: API.RegisterParams, options?: { [key: string]: any }) {
  // 直接使用基础 URL，移除 token 参数
  const url = new URL(IP_CONFIG.API_IP3 + '/users/register');
  const searchParams = new URLSearchParams(url.search);
  searchParams.delete('token%20=%20123');
  url.search = searchParams.toString();
  return request<API.RegisterResult>(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data:{
      method: 'update',
      ...(options || {}),
    }
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data:{
      method: 'post',
      ...(options || {}),
    }
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/rule', {
    method: 'POST',
    data:{
      method: 'delete',
      ...(options || {}),
    }
  });
}

/** 创建新对话接口 POST http://127.0.0.1:8000/sessions/new */
export async function createNewConversationApi(body: { user_id: string }, options?: { [key: string]: any }) {
  const url = new URL(IP_CONFIG.API_IP2 + '/sessions/new');
  // 移除 token 参数
  // url.searchParams.append('token', '123');
  return request<{
    session_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    preview: string;
    is_reasoning: boolean;
  }>(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 发送消息接口 POST /chat */
export async function sendMessageApi(sessionId: string | number,useMcp:boolean, userId: string, message: string, options?: { [key: string]: any }) {
  const url = new URL(IP_CONFIG.API_IP2 + '/chat');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      session_id: sessionId,
      use_mcp: useMcp,
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      stream: true
    }),
    ...(options || {})
  });
  return res;
}

/**创建自定义Agent接口 POST/create_agent */
export async function createAgentApi(newAgentName: string, userId: string, newAgentPrompt: string, options?: { [key: string]: any }) {
  const url = new URL(IP_CONFIG.API_IP2 + '/create_agent');
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      name:newAgentName,
      system_prompt: newAgentPrompt,
    }),
    ...(options || {})
  });
  return res;
}

/**获取自定义Agent列表接口 GET/get_agents */
export async function getCustomAgentsApi(userId: string) {
  const url = new URL(IP_CONFIG.API_IP2 + '/get_agents');
  url.searchParams.append('user_id', userId);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
    throw new Error(`获取Agent列表失败: ${res.statusText}`);
  }

  return res.json();
}

/**获取用户的所有会话列表 GET/sessions/list*/
export async function getSessionListApi(userId: string) {
  const url = new URL(IP_CONFIG.API_IP2 + '/sessions/list');
  url.searchParams.append('user_id', userId);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
    throw new Error(`获取Session列表失败: ${res.statusText}`);
  }

  return res.json();
}

/**获取用户会话历史信息 GET sessions/get_session_detail_info*/
export async function getSessionHistoryApi(sessionId: string) {
  const url = new URL(IP_CONFIG.API_IP2 + '/sessions/get_session_detail_info');
  url.searchParams.append('session_id', sessionId);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
    throw new Error(`获取历史信息失败: ${res.statusText}`);
  }

  return res.json();
}
/**删除用户历史会话 DELETE sessions/delete */
export async function deleteSessionApi(sessionId: string) {
  const url = new URL(IP_CONFIG.API_IP2 + '/sessions/delete');
  url.searchParams.append('session_id', sessionId);

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
    throw new Error(`删除会话信息失败: ${res.statusText}`);
  }

  return res.json();
}
/**删除用户自定义Agent DELETE /delete_agent */
export async function deleteAgentApi(agentId: string) {
  const url = new URL(IP_CONFIG.API_IP2 + '/delete_agent');
  url.searchParams.append('agent_id', agentId);

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
    throw new Error(`删除自定义Agent失败: ${res.statusText}`);
  }

  return res.json();
}
/**上传文件 POST /file_extract/batch_process_docs */
export async function PostAttachFileApi( files: File[]) {
  const url = new URL(IP_CONFIG.API_IP2 + '/file_extract/batch_process_docs');
  const formData = new FormData();
  // 将文件添加到 FormData 中
  for (const file of files) {
    formData.append('files', file);
  }
  const res = await fetch(url.toString(), {
    method: 'POST',
    // 注意：不要设置 Content-Type，让浏览器自动处理
    // headers: {
    //   'Content-Type': 'application/json',
    // },
    body: formData
  });

  if (!res.ok) {
    throw new Error(`文件上传失败: ${res.statusText}`);
  }

  return res.json();
}

/**创建知识库 POST /api/knowledge/create_kb */
export async function createKnowledgeBaseApi(userId: string, kbName: string, kbId: string) {
  const res = await fetch(IP_CONFIG.API_IP2 + '/api/knowledge/create_kb', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      knowledge_base_id: kbId,
      user_id: userId,
      kb_name:kbName,
    }),
  })
  if (!res.ok) {
    throw new Error(`创建知识库失败: ${res.statusText}`);
  }

  return res.json();
}

/**向知识库上传文件  POST /api/knowledge/upload*/
export async function InsertKnowledgeBaseApi(kbId: string, fileId: string ,file: File ,kbName: string ) {
  const formData = new FormData();
  formData.append('knowledge_base_id', kbId);
  formData.append('file_id', fileId);
  formData.append('kb_name', kbName);
  formData.append('file', file);
  const res = await fetch(IP_CONFIG.API_IP2 + '/api/knowledge/upload', {
    method: 'POST',
    body: formData
  })
  if (!res.ok) {
    throw new Error(`插入文件失败: ${res.statusText}`);
  }

  return res.json();
}

/**删除知识库 POST /api/knowledge/delete_knowledge_base*/
export async function DeleteKnowledgeBaseApi(kbId: string) {
 const res = await fetch(IP_CONFIG.API_IP2 + '/api/knowledge/delete_knowledge_base', {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     knowledge_base_id: kbId,
   }),
 })
 if (!res.ok) {
   throw new Error(`删除知识库失败: ${res.statusText}`);
 }

 return res.json();
}

/**删除知识库中的文件 POST /api/knowledge/delete_files */
export async function DeleteKnowledgeBaseFileApi(kbId: string,fileIds: string[]) {
  const res = await fetch(IP_CONFIG.API_IP2 + '/api/knowledge/delete_files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      knowledge_base_id: kbId,
      file_ids: fileIds,
    }),
  })
  if (!res.ok) {
    throw new Error(`删除知识库文件失败: ${res.statusText}`);
  }

  return res.json();
}

/**根据输入查询指定ID知识库中的相关内容 POST /query */
export async function QueryKnowledgeBaseApi(query:string, kbId: string,topK: number) {
  const res = await fetch(IP_CONFIG.API_IP2 + '/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      knowledge_base_id: kbId,
      top_k: topK,
    }),
  })
  if (!res.ok) {
    throw new Error(`查询知识库相关内容失败: ${res.statusText}`);
  }

  return res.json();
}

/** 获取指定知识库的所有文件 GET /api/knowledge/list_files */
export async function getKnowledgeBaseFilesApi(kbId: string) {
  const url = new URL(IP_CONFIG.API_IP2 + '/api/knowledge/list_files');
  url.searchParams.append('knowledge_base_id', kbId);
  const res = await fetch( url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },

  })
  if (!res.ok) {
    throw new Error(`获取指定知识库的所有文件: ${res.statusText}`);
  }

  return res.json();
}

/**获取用户所有的知识库 GET /api/knowledge/list_knowledge_base */
export async function getKnowledgeBaseListApi(userId: string) {
  const url = new URL(IP_CONFIG.API_IP2 + '/api/knowledge/list_knowledge_base');
  url.searchParams.append('user_id', userId);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`获取用户所有的知识库: ${res.statusText}`);
  }

  return res.json();
}
