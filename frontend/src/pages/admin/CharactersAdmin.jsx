import React from 'react';
import CrudTable from '../../components/admin/CrudTable';

const CharactersAdmin = () => {
  const columns = [
    { key: 'char_id', label: 'ID' },
    { key: 'hanzi', label: 'Hán tự', render: (item) => <span className="text-2xl font-bold font-kaishu text-teal-700">{item.hanzi}</span> },
    { key: 'pinyin', label: 'Pinyin' },
    { key: 'meaning_vi', label: 'Nghĩa (VI)' },
    { key: 'hsk_level', label: 'HSK', render: (item) => item.hsk_level ? <span className="bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded-lg">HSK {item.hsk_level}</span> : '-' },
    { key: 'stroke_count', label: 'Số nét' },
  ];

  const formFields = [
    { name: 'hanzi', label: 'Hán tự', type: 'text', required: true },
    { name: 'pinyin', label: 'Pinyin', type: 'text', required: false },
    { name: 'meaning_vi', label: 'Nghĩa tiếng Việt', type: 'text', required: false },
    { name: 'hsk_level', label: 'HSK Level', type: 'number', required: false },
    { name: 'stroke_count', label: 'Số nét', type: 'number', required: false },
    { name: 'explanation', label: 'Giải thích / Chiết tự', type: 'textarea', required: false },
    { name: 'example_sentence', label: 'Câu ví dụ', type: 'textarea', required: false },
  ];

  return (
    <CrudTable 
      title="Quản lý Hán tự" 
      endpoint="characters" 
      itemKey="char_id"
      columns={columns} 
      formFields={formFields} 
      searchPlaceholder="Tìm Hán tự, pinyin, hoặc nghĩa..."
    />
  );
};

export default CharactersAdmin;
