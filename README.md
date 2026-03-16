# Quản lý gia phả họ Lê

Ứng dụng giúp quản lý cây gia phả một cách khoa học và sinh động, được tối ưu hóa cho di động. Mọi thay đổi đều được lưu vào cơ sở dữ liệu thực.

## 🚀 Chạy Demo Trực Tiếp

### Tự động khởi chạy bằng GitHub Codespaces
Ấn vào nút bên dưới để GitHub tự tạo một môi trường máy tính ảo và khởi động luôn dự án:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/LeQuangViet2003/Quan-Ly-Gia-Pha-Ho-Le)

*Khi mở Codespaces, ứng dụng sẽ chạy lệnh tự động tải mã nguồn, tự build màn hình React, và tự động tạo file dữ liệu mẫu SQLite. Sau đó giao diện sẽ hiển thị ngay trên màn hình trình duyệt của bạn.*

### Triển khai lên Web Hosting (Unified Build)
Để triển khai thực tế trên mạng (VD: Render):
1. Giao diện Frontend (`src`) đã được gộp chung để phục vụ tĩnh qua Express (`dist`).
2. Khi push code lên Render, dùng lệnh Build: `npm install && npm run build` và Lệnh Start: `npm start`.

## 🛠 Công nghệ sử dụng
- **Giao diện:** Vite React, Tailwind CSS
- **Máy chủ API:** Express, NodeJS
- **Lưu trữ:** SQLite3 trực tiếp
