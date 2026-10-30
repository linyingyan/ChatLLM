import { Footer } from '@/components';
import { register} from '@/services/ant-design-pro/api';
import {
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormText,
} from '@ant-design/pro-components';
import { Helmet, history, useModel } from '@umijs/max';
import { Alert, message, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import Settings from '../../../../config/defaultSettings';
const useStyles = createStyles(({ token }) => {
  return {
    action: {
      marginLeft: '8px',
      color: 'rgba(0, 0, 0, 0.2)',
      fontSize: '24px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      transition: 'color 0.3s',
      '&:hover': {
        color: token.colorPrimaryActive,
      },
    },
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});

const RegisterMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};
const Register: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('account');
  const { styles } = useStyles();
  const handleSubmit = async (values: API.RegisterParams) => {
    //校验
    const { password,confirmPassword} = values;
    if(password !== confirmPassword){
      message.error('用户两次输入密码不一致');
      return;
    }
    try {
      // 注册
      const response = await register({
        ...values,
        type,
      });

      if (response?.message === '用户注册成功') {
        message.success('注册成功！');
        const urlParams = new URL(window.location.href).searchParams;
        history.push('/user/login?redirect=' + urlParams.get('redirect'));
        return;
      }

      // 处理 400 状态码响应
      if (response && response.status === 400 && response.detail) {
        if (typeof response.detail === 'string') {
          message.error(response.detail);
        } else if (Array.isArray(response.detail)) {
          const errorMsg = response.detail
            .map(item => item.msg || item.type)
            .filter(Boolean)
            .join('，');
          message.error(errorMsg || '注册信息验证失败');
        }
        return;
      }

      // 其他错误处理
      if (typeof response?.detail === 'string') {
        // 处理简单字符串错误（如"用户名已存在"）
        message.error(response.detail);
      } else if (Array.isArray(response?.detail)) {
        // 处理验证错误数组
        const errorMsg = response.detail
          .map(item => item.msg || item.type)
          .filter(Boolean)
          .join('，');
        message.error(errorMsg || '注册信息验证失败');
      } else {
        message.error(response?.message || '注册失败，请重试');
      }
    } catch (error) {
      if (error?.code === 'ERR_BAD_REQUEST') {
        const serverMessage = error.response?.data?.detail
                           || error.response?.data?.message
                           || '请求参数有误';
        message.error(serverMessage);
      }
      message.error('注册失败，请检查网络连接');
    }
  };
  const { status, type: loginType } = userLoginState;
  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {'注册'}- {Settings.title}
        </title>
      </Helmet>
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          submitter={{
            searchConfig:{
              submitText:"注册"
            }
          }}
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo_ai.png" />}
          title="星璇智能"
          subTitle={'最具影响力的AI问答平台'}
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values) => {
            await handleSubmit(values as API.RegisterParams);
          }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              {
                key: 'account',
                label: '账户密码登录',
              },

            ]}
          />

          {status === 'error' && loginType === 'account' && (
            <RegisterMessage content={'错误的用户名和密码'} />
          )}
          {type === 'account' && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder={'请输入用户名'}
                rules={[
                  {
                    required: true,
                    message: '用户名是必填项！',
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={'请输入密码'}
                rules={[
                  {
                    required: true,
                    message: '密码是必填项！',
                  },
                ]}
              />
              <ProFormText.Password
                name="confirmPassword"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={'请输入确认密码'}
                rules={[
                  {
                    required: true,
                    message: '确认密码是必填项！',
                  },
                ]}
              />
              <div
                style={{
                  marginBottom: 24,
                }}
              >
                <a
                  style={{
                    float: 'right',
                  }}
                  href={"login"}
                  target="_self"
                >
                  已有账号，返回登录
                </a>
              </div>
            </>
          )}
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};
export default Register;
