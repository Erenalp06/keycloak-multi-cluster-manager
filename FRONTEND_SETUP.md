# Frontend Setup (VM'de Çalıştırma)

Frontend'i VM'de çalıştırmak için:

## 1. Node.js ve npm Kurulumu

```bash
# Node.js 18+ kurulumu (eğer yoksa)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# veya nvm ile
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

## 2. Dependencies Kurulumu

```bash
cd frontend
npm install --legacy-peer-deps
```

## 3. Frontend'i Başlatma

```bash
cd frontend
npm start
```

Frontend http://localhost:3000 adresinde çalışacak.

## Notlar

- Backend Docker'da çalışıyor ve http://localhost:8080/api adresinde erişilebilir
- Frontend otomatik olarak backend'e bağlanacak
- Hot reload çalışacak (kod değişikliklerinde otomatik yenileme)

