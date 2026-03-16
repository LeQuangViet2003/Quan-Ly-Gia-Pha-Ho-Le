import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
// Set high limit for base64 image strings
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Khởi tạo Database SQLite vào một file ở thư mục gốc
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi khi mở SQLite:', err.message);
  } else {
    console.log('Đã kết nối thành công tới SQLite.');
    initDb();
  }
});

// Hàm tạo bảng nếu chưa có và chèn dữ liệu mẫu nếu bảng trống
function initDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      dob TEXT,
      image TEXT,
      parentId INTEGER,
      spouseId INTEGER,
      FOREIGN KEY (parentId) REFERENCES members(id),
      FOREIGN KEY (spouseId) REFERENCES members(id)
    )
  `, (err) => {
    if (err) {
      console.error('Lỗi tạo bảng:', err.message);
      return;
    }

    // Kiểm tra xem có dữ liệu chưa
    db.get('SELECT COUNT(*) as count FROM members', (err, row) => {
      if (!err && row.count === 0) {
        console.log('Đang khởi tạo danh sách gia phả cơ bản...');
        
        const initialData = [
          { name: "Cụ Tổ Lee", role: "Cụ Thủy Tổ", dob: "1940-01-01", parentId: null, spouseId: null },
          { name: "Con Trưởng", role: "Trưởng Tộc", dob: "1965-05-12", parentId: 1, spouseId: null },
          { name: "Con Thứ", role: "Chú Út", dob: "1968-08-20", parentId: 1, spouseId: null },
          { name: "Cháu Đích Tôn", role: "Trưởng Họ Tương Lai", dob: "1990-11-05", parentId: 2, spouseId: null },
          { name: "Cháu Gái", role: "", dob: "1993-02-14", parentId: 2, spouseId: null },
          { name: "Cháu Ngoại", role: "", dob: "1995-07-30", parentId: 3, spouseId: null },
          { name: "Chắt Trai", role: "Đích Tôn Đời 4", dob: "2018-09-09", parentId: 4, spouseId: null },
        ];

        const stmt = db.prepare('INSERT INTO members (name, role, dob, parentId, spouseId) VALUES (?, ?, ?, ?, ?)');
        initialData.forEach(member => {
          stmt.run(member.name, member.role, member.dob, member.parentId, member.spouseId);
        });
        stmt.finalize();
        console.log('Đã khởi tạo xong dữ liệu mẫu!');
      }
    });
  });
}

// ----- API ENDPOINTS -----

// 1. Lấy toàn bộ cây gia phả
app.get('/api/family', (req, res) => {
  db.all('SELECT * FROM members', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 2. Thêm thành viên mới (Có thể là Con hoặc Vợ/Chồng)
app.post('/api/family', (req, res) => {
  const { name, role, dob, image, parentId, spouseId } = req.body;
  const sql = `INSERT INTO members (name, role, dob, image, parentId, spouseId) VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [name, role, dob, image || null, parentId || null, spouseId || null];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    // Nếu thêm Vợ/Chồng (spouseId có giá trị), ta cần cập nhật người kia để trỏ lại (liên kết 2 chiều)
    if (spouseId) {
       db.run(`UPDATE members SET spouseId = ? WHERE id = ?`, [this.lastID, spouseId]);
    }

    res.json({ id: this.lastID, ...req.body });
  });
});

// 3. Cập nhật thông tin thành viên (Edit)
app.put('/api/family/:id', (req, res) => {
  const { name, role, dob, image } = req.body;
  const sql = `UPDATE members SET name = ?, role = ?, dob = ?, image = ? WHERE id = ?`;
  const params = [name, role, dob, image, req.params.id];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ success: true, changes: this.changes });
  });
});

// 4. Xoá thành viên
app.delete('/api/family/:id', (req, res) => {
  const idToDelete = req.params.id;
  db.serialize(() => {
    // Xoá liên kết Vợ/Chồng 2 chiều (nếu có)
    db.run(`UPDATE members SET spouseId = NULL WHERE spouseId = ?`, [idToDelete]);

    db.run(`DELETE FROM members WHERE id = ?`, [idToDelete], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ deleted: this.changes });
    });
  });
});

// Dành cho Production: Phục vụ frontend (React Build)
const frontendDistPath = path.join(__dirname, 'dist');
app.use(express.static(frontendDistPath));

app.use((req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Chạy server
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại cổng ${PORT}`);
});
