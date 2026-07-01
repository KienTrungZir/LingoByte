import React from 'react';
import CrudTable from '../../components/admin/CrudTable';

const RadicalsAdmin = () => {
  const columns = [
    { key: 'radical_id', label: 'ID' },
    { key: 'character', label: 'Bộ thủ', render: (item) => <span className="text-2xl font-bold font-kaishu text-purple-700">{item.character}</span> },
    { key: 'pinyin', label: 'Pinyin' },
    { key: 'meaning', label: 'Ý nghĩa' },
    { key: 'variants', label: 'Dạng khác' },
    { key: 'stroke_count', label: 'Số nét' },
  ];

  const formFields = [
    { name: 'character', label: 'Bộ thủ', type: 'text', required: true },
    { name: 'pinyin', label: 'Pinyin', type: 'text', required: false },
    { name: 'meaning', label: 'Ý nghĩa', type: 'text', required: false },
    { name: 'variants', label: 'Dạng biến thể (vd: 氵 cho 水)', type: 'text', required: false },
    { name: 'stroke_count', label: 'Số nét', type: 'number', required: false },
    { name: 'mnemonic_tip', label: 'Mẹo ghi nhớ', type: 'textarea', required: false },
  ];

  return (
    <CrudTable 
      title="Quản lý Bộ thủ" 
      endpoint="radicals" 
      itemKey="radical_id"
      columns={columns} 
      formFields={formFields} 
      searchPlaceholder="Tìm bộ thủ..."
    />
  );
};

export default RadicalsAdmin;
