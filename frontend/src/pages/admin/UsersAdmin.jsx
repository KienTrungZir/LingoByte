import React from 'react';
import CrudTable from '../../components/admin/CrudTable';

const UsersAdmin = () => {
  const columns = [
    { key: 'user_id', label: 'ID' },
    { key: 'username', label: 'Tên đăng nhập', render: (item) => <span className="font-bold text-slate-800">{item.username}</span> },
    { key: 'email', label: 'Email' },
    { key: 'role_id', label: 'Vai trò', render: (item) => item.role_id === 1 ? <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded-lg text-xs">Admin</span> : <span className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded-lg text-xs">User</span> },
    { key: 'xp', label: 'XP', render: (item) => <span className="font-semibold text-teal-600">{item.xp}</span> },
    { key: 'streak', label: 'Streak' },
  ];

  const formFields = [
    { name: 'username', label: 'Tên đăng nhập', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text', required: true },
    { name: 'password', label: 'Mật khẩu (Chỉ nhập khi đổi/tạo mới)', type: 'text', required: false },
    { name: 'role_id', label: 'Vai trò', type: 'select', options: [{label: 'Admin', value: 1}, {label: 'User', value: 2}], required: true },
    { name: 'xp', label: 'XP', type: 'number', required: false, defaultValue: 0 },
    { name: 'streak', label: 'Streak', type: 'number', required: false, defaultValue: 0 },
  ];

  return (
    <CrudTable 
      title="Quản lý Người dùng" 
      endpoint="users" 
      itemKey="user_id"
      columns={columns} 
      formFields={formFields} 
      searchPlaceholder="Tìm kiếm người dùng..."
    />
  );
};

export default UsersAdmin;
