import React from 'react';
import CrudTable from '../../components/admin/CrudTable';

const PostsAdmin = () => {
  const columns = [
    { key: 'post_id', label: 'ID' },
    { key: 'title', label: 'Tiêu đề', render: (item) => <span className="font-bold text-slate-800 truncate max-w-[200px] block">{item.title}</span> },
    { key: 'author_name', label: 'Tác giả' },
    { key: 'likes', label: 'Likes', render: (item) => <span className="font-semibold text-rose-500">❤️ {item.likes}</span> },
    { key: 'created_at', label: 'Ngày đăng', render: (item) => new Date(item.created_at).toLocaleDateString('vi-VN') },
  ];

  const formFields = [
    { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
    { name: 'content', label: 'Nội dung', type: 'textarea', required: true },
    { name: 'likes', label: 'Số lượt thích', type: 'number', required: false, defaultValue: 0 },
  ];

  return (
    <CrudTable 
      title="Quản lý Bài viết" 
      endpoint="posts" 
      itemKey="post_id"
      columns={columns} 
      formFields={formFields} 
      searchPlaceholder="Tìm kiếm bài viết..."
    />
  );
};

export default PostsAdmin;
