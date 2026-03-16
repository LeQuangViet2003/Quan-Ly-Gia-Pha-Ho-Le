import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from "jspdf";
import * as htmlToImage from 'html-to-image';
import { Download, UserPlus, Image as ImageIcon, Pencil, X, Save, Heart, Baby, Trash2 } from 'lucide-react';
import './index.css';

// Removed calculateAge function

// Từng cá nhân (chồng/vợ)
const PersonBlock = ({ person, onAction, isSpouse = false, isPrimary = false }) => {
  if (!person) return null;
  return (
    <div className={`w-[110px] flex flex-col items-center p-2 border-[2px] ${isSpouse ? 'border-[#e0a96d] bg-[#fbf8f1]' : 'border-[#b52b2b] bg-[#fffdf7]'} rounded-sm shadow-sm hover:shadow-md transition-shadow relative group`}>
      {/* Nút thao tác xếp dọc bên trái */}
      <div className="absolute top-1 -left-8 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30 action-buttons">
        <button onClick={() => onAction('EDIT', person)} className="p-1.5 bg-white text-blue-600 rounded-full hover:bg-blue-50 shadow-md border border-blue-200" title="Chỉnh sửa">
          <Pencil size={12} />
        </button>
        <button onClick={() => onAction('DELETE', person)} className="p-1.5 bg-white text-red-600 rounded-full hover:bg-red-50 shadow-md border border-red-200" title="Xóa cá nhân này">
          <Trash2 size={12} />
        </button>
        {isPrimary && (
          <>
            <button onClick={() => onAction('ADD_SPOUSE', person)} className="p-1.5 bg-white text-pink-600 rounded-full hover:bg-pink-50 shadow-md border border-pink-200" title="Thêm Vợ/Chồng">
              <Heart size={12} />
            </button>
            <button onClick={() => onAction('ADD_CHILD', person)} className="p-1.5 bg-white text-green-600 rounded-full hover:bg-green-50 shadow-md border border-green-200" title="Thêm Con">
              <Baby size={12} />
            </button>
          </>
        )}
      </div>

      {/* Avatar vuông chữ nhật */}
      <div className={`w-[60px] h-[75px] overflow-hidden border ${isSpouse ? 'border-[#e0a96d]' : 'border-[#b52b2b]'} bg-[#f4ecd8] mb-1 flex-shrink-0 relative flex items-center justify-center`}>
        {person.image ? (
          <img src={person.image} alt={person.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="text-[#c09d59] opacity-50">
            <ImageIcon size={20} />
          </div>
        )}
      </div>
      
      {/* Thông tin */}
      <div className="text-center w-full px-1">
        <h3 className={`font-bold text-[12px] uppercase tracking-tight leading-tight ${isSpouse ? 'text-[#806040]' : 'text-[#b30000]'}`} title={person.name}>
          {person.name}
        </h3>
        
        {person.role && (
          <div className={`text-[10px] font-medium mt-0.5 ${isSpouse ? 'text-[#806040]/80' : 'text-[#b30000]/80'}`}>
            {person.role}
          </div>
        )}
      </div>
    </div>
  );
};

// Khung chứa cả Vợ và Chồng ngang hàng kết nối bằng 1 đường kẻ
const FamilyNode = ({ member, spouses, onAction }) => {
  return (
    <div className="flex flex-row items-center justify-center relative z-10 mx-1 mb-0">
      
      <PersonBlock person={member} onAction={onAction} isPrimary={true} />
      
      {spouses.length > 0 && spouses.map(spouse => (
        <React.Fragment key={spouse.id}>
          {/* Đường nối ngang hàng giữa vợ và chồng */}
          <div className="w-6 h-[2px] bg-[#b52b2b] shadow-sm z-0"></div>
          <PersonBlock person={spouse} onAction={onAction} isSpouse={true} />
        </React.Fragment>
      ))}
    </div>
  );
};

const TreeNode = ({ member, family, onAction }) => {
  // Trụ cột là người không có spouseId, HOẶC là người gốc trong liên kết vợ chồng 2 chiều (id nhỏ hơn)
  if (member.spouseId != null && member.spouseId < member.id) return null;

  // Lấy danh sách tất cả thê thiếp (những người trỏ spouseId về member.id)
  const spouses = family.filter(m => m.spouseId === member.id);

  // Lấy các con (Con nằm ở cha hoặc nằm ở mẹ đều hợp lệ)
  const children = family.filter((m) => m.parentId === member.id || spouses.some(s => m.parentId === s.id));
  
  return (
    <li>
      <div className="flex items-center justify-center relative">
         <FamilyNode member={member} spouses={spouses} onAction={onAction} />
      </div>

      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <TreeNode key={child.id} member={child} family={family} onAction={onAction} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function App() {
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State quản lý Modal
  const [modalData, setModalData] = useState(null); // { mode: 'EDIT' | 'ADD_CHILD' | 'ADD_SPOUSE', member: {} }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // member object to delete
  const [downloadConfirm, setDownloadConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const treeRef = useRef(null);
  
  const fetchFamily = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/family?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setFamily(data);
      setLoading(false);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu từ API:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  // Kích hoạt Modal từ Card
  const handleActionClick = async (mode, member) => {
    if (mode === 'DELETE') {
      setDeleteConfirm(member);
      return;
    }

    if (mode === 'EDIT') {
      setModalData({ mode, form: { ...member } });
    } else if (mode === 'ADD_SPOUSE') {
      setModalData({ mode, targetId: member.id, form: { name: '', role: 'Phu nhân', image: null } });
    } else if (mode === 'ADD_CHILD') {
      setModalData({ mode, targetId: member.id, form: { name: '', role: 'Con', image: null } });
    }
  };

  const handleCloseModal = () => {
    setModalData(null);
  };

  const handleFormChange = (e) => {
     const { name, value } = e.target;
     setModalData(prev => ({ ...prev, form: { ...prev.form, [name]: value }}));
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`http://localhost:3000/api/family/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchFamily();
    } catch (err) {
      alert('Lỗi khi xóa: ' + err.message);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setModalData(prev => ({ ...prev, form: { ...prev.form, image: reader.result } }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Lưu API
  const handleSaveModal = async () => {
    const { mode, form, targetId } = modalData;
    try {
      if (mode === 'EDIT') {
        await fetch(`http://localhost:3000/api/family/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      } else if (mode === 'ADD_CHILD') {
        await fetch(`http://localhost:3000/api/family`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, parentId: targetId })
        });
      } else if (mode === 'ADD_SPOUSE') {
        await fetch(`http://localhost:3000/api/family`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, spouseId: targetId })
        });
      }
      handleCloseModal();
      fetchFamily(); // Refresh tree
    } catch(err) {
      alert('Lưu không thành công: ' + err.message);
    }
  };

  // Hàm xuất PDF chuẩn xác
  const exportPDF = async () => {
    setDownloadConfirm(false);
    
    const input = treeRef.current;
    if (!input) return;
    
    setIsExporting(true);
    
    try {
      input.classList.add('bg-white');
      
      // html-to-image dùng SVG foreignObject bọc nguyên si DOM nên render cực kỳ chuẩn xác cả Tailwind V4 CSS modern colors (oklch)
      const dataUrl = await htmlToImage.toPng(input, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          // Lọc bỏ Menu Thao tác (CSS class 'action-buttons')
          if (node.classList && typeof node.classList.contains === 'function') {
            return !node.classList.contains('action-buttons');
          }
          return true;
        }
      });

      input.classList.remove('bg-white');

      const pdf = new jsPDF('l', 'mm', 'a4'); 
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Force direct download using Anchor Tag with Blob URL
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Pha-Do-Gia-Toc-${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi xuất PDF:", err);
      alert("Đã xảy ra lỗi khi tạo file PDF. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  const getModalTitle = () => {
    if (modalData?.mode === 'EDIT') return 'Chỉnh sửa thành viên';
    if (modalData?.mode === 'ADD_SPOUSE') return 'Thêm Vợ/Chồng';
    if (modalData?.mode === 'ADD_CHILD') return 'Thêm Con Cái';
    return '';
  };

  // Chỉ lấy Người không có Cha Mẹ làm Gốc rễ
  const rootMembers = family.filter(m => m.parentId === null && (!m.spouseId || m.id < m.spouseId));

  return (
    <div className="min-h-screen w-full bg-[#f8f5e6] p-4 md:p-8 font-sans text-gray-800 relative border-[8px] md:border-[12px] border-double border-[#d4af37]/30">
      <div className="w-full h-full relative z-10 mx-auto transition-all duration-300">
        <header className="flex flex-col flex-wrap justify-between items-center mb-6 md:mb-10 pb-4 md:pb-6 border-b-2 border-[#d4af37]/50 max-w-[1400px] mx-auto">
          <div className="text-center w-full mb-4">
            <h1 className="text-3xl md:text-5xl font-bold text-[#b30000] uppercase tracking-wide mb-2 drop-shadow-sm" style={{ fontFamily: '"Times New Roman", serif' }}>
              PHẢ ĐỒ GIA TỘC
            </h1>
            <p className="text-[#a67c00] font-medium text-lg italic">Hệ thống lưu giữ cội nguồn (Đã kết nối Sync CSDL)</p>
          </div>
          
          <div className="flex gap-4 mt-6 md:mt-0">
            <button 
              onClick={() => setDownloadConfirm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Download size={20} />
              Xuất PDF
            </button>
          </div>
        </header>

        {/* Vùng hiển thị Kim tự tháp */}
        <div className="bg-[#fffdf7] rounded-sm shadow-xl border-4 border-[#d4af37] overflow-x-auto overflow-y-hidden min-h-[600px] relative">
          {/* Decorative Corner Elements */}
          <div className="absolute top-2 left-2 w-12 h-12 border-t-4 border-l-4 border-[#c09d59] pointer-events-none z-10"></div>
          <div className="absolute top-2 right-2 w-12 h-12 border-t-4 border-r-4 border-[#c09d59] pointer-events-none z-10"></div>
          <div className="absolute bottom-2 left-2 w-12 h-12 border-b-4 border-l-4 border-[#c09d59] pointer-events-none z-10"></div>
          <div className="absolute bottom-2 right-2 w-12 h-12 border-b-4 border-r-4 border-[#c09d59] pointer-events-none z-10"></div>

          {loading ? (
             <div className="animate-pulse text-[#d4af37] pt-20 text-xl font-semibold w-full text-center">Đang đồng bộ dữ liệu gia phả...</div>
          ) : (
            <div className="w-max min-w-full flex justify-center p-10 min-h-[600px]">
              <div 
                id="family-tree-capture" 
                ref={treeRef}
                className="tree"
              >
                <ul>
                  {rootMembers.map((rootNode) => (
                    <TreeNode key={rootNode.id} member={rootNode} family={family} onAction={handleActionClick} />
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa</h3>
              <p className="text-gray-600 text-sm">
                Bạn có chắc chắn muốn xóa <strong>"{deleteConfirm.name}"</strong> khỏi gia phả không? Hành động này không thể hoàn tác và có thể làm mất kết nối các nhánh tiểu liên quan.
              </p>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center gap-3 border-t border-gray-100">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 font-medium transition-colors"
               >
                 Hủy bỏ
               </button>
               <button 
                onClick={handleConfirmDelete}
                className="px-6 py-2 text-white bg-red-600 rounded-xl hover:bg-red-700 font-medium shadow-md transition-colors"
               >
                 Xác nhận xóa
               </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DOWNLOAD MODAL */}
      {downloadConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Tải file Gia Phả</h3>
              <p className="text-gray-600 text-sm">
                Bạn có muốn xuất toàn bộ gia phả này dưới dạng file đồ họa PDF và tải thẳng về máy không?
              </p>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center gap-3 border-t border-gray-100">
              <button 
                onClick={() => setDownloadConfirm(false)}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 font-medium transition-colors"
               >
                 Hủy bỏ
               </button>
               <button 
                onClick={exportPDF}
                className="px-6 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium shadow-md transition-colors"
               >
                 Đồng ý Tải
               </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORTING OVERLAY */}
      {isExporting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm flex-col">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <h2 className="text-white text-xl font-bold animate-pulse">Đang thiết lập file PDF, vui lòng đợi vài giây...</h2>
        </div>
      )}

      {/* MODAL NHẬP LIỆU */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className={`flex justify-between items-center p-5 border-b border-gray-100 ${modalData.mode === 'ADD_SPOUSE' ? 'bg-pink-50' : 'bg-gray-50'}`}>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {modalData.mode === 'EDIT' && <Pencil size={20} className="text-blue-500" />}
                {modalData.mode === 'ADD_CHILD' && <Baby size={20} className="text-green-500" />}
                {modalData.mode === 'ADD_SPOUSE' && <Heart size={20} className="text-pink-500" />}
                {getModalTitle()}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
             <div className="p-6 space-y-5">
              
              {/* Ảnh đại diện */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-3 relative group focus-within:border-blue-500 hover:border-blue-400 transition-colors">
                  {modalData.form.image ? (
                    <img src={modalData.form.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-400" size={32} />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <Pencil size={18} className="text-white mb-1" />
                     <span className="text-white text-xs font-medium">Đổi ảnh</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Chọn ảnh đại diện"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center px-6">
                  Click vào ảnh trên để tải từ máy lên (Khuyên dùng ảnh vuông 1:1)
                </p>
              </div>

              {/* Form Input: Tên */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và Tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="name"
                  value={modalData.form.name || ''} 
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </div>

              {/* Form Input: Chức vụ/Vai trò */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chức vụ / Vai trò danh xưng</label>
                <input 
                  type="text" 
                  name="role"
                  value={modalData.form.role || ''} 
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ví dụ: Trưởng tộc, Phu nhân, Chủ tế..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
               <button 
                onClick={handleCloseModal}
                className="px-5 py-2 text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors"
               >
                 Hủy bỏ
               </button>
               <button 
                onClick={handleSaveModal}
                disabled={!modalData.form.name.trim()}
                className={`px-5 py-2 flex items-center gap-2 text-white rounded-xl font-medium shadow-md transition-colors ${modalData.form.name.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
               >
                 <Save size={18} />
                 {modalData.mode === 'EDIT' ? 'Lưu thay đổi' : 'Thêm mới'}
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
