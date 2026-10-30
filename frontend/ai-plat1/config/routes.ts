export default [
  {
    path: '/user',
    layout: false,
    routes: [
      { name: '登录', path: '/user/login', component: './User/Login' },
      { name: '注册', path: '/user/register', component: './User/Register' },
    ],
  },
  { path: '/index', name: '主页', component: './NewChat' },
  { path: '/', redirect: '/index' },
  { path: '*', layout: false, component: './404' },
];
