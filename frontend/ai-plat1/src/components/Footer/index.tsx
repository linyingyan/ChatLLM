import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <>
      <div>
        <DefaultFooter
          style={{
            background: 'none',
          }}
          copyright="2025 星璇智能公司版权所有 "
          links={[
          ]}
        />
      </div>
    </>
  );
};

export default Footer;
