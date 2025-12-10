# Keycloak Multi-Manage MVP

**Version: 1.0.4.1**

<img width="2554" height="1304" alt="image" src="https://github.com/user-attachments/assets/4ccd1955-00ca-4968-a08d-bb1c05ee4049" />


Çoklu Keycloak ortamlarını (dev/test/prod) tek panelden yönetmek için bir MVP uygulaması.

## Özellikler

- **Cluster Yönetimi**: Keycloak cluster'larını ekleme, silme ve listeleme
- **Health Check**: Cluster'ların sağlık durumunu kontrol etme
- **Role Yönetimi**: Bir cluster'daki rollerin görüntülenmesi
- **Role Diff**: İki cluster arasındaki roller için fark analizi (kaynakta var, hedefte yok)
- **LDAP/LDAPS Authentication**: Active Directory ve LDAP sunucuları ile kimlik doğrulama
- **Sertifika Yönetimi**: AD sunucusundan otomatik sertifika alma ve trust store yönetimi

## Teknolojiler

### Backend
- Go 1.21
- Fiber (HTTP framework)
- PostgreSQL
- Clean Architecture (clusters/, roles/, diff/ modülleri)

### Frontend
- React 18
- TypeScript
- shadcn/ui (UI components)
- Tailwind CSS
- React Router

## Kurulum

### Docker Compose ile Çalıştırma

Tüm servisleri Docker Compose ile başlatmak için:

```bash
docker-compose up -d
```

Bu komut şunları başlatır:
- PostgreSQL (port 5433)
- Backend API (port 8080, internal)
- Frontend (port 3000, internal)
- Nginx Reverse Proxy (port 80, 443)

### Servisler

- **Frontend (HTTPS)**: https://localhost (veya kendi IP adresiniz)
- **Backend API**: https://localhost/api
- **PostgreSQL**: localhost:5433

### SSL Sertifikası

Uygulama otomatik olarak self-signed SSL sertifikası oluşturur. İlk çalıştırmada:
- Nginx container'ı otomatik olarak sertifika oluşturur
- Tarayıcıda güvenlik uyarısı görünebilir (development için normal)
- "Gelişmiş" > "Güvenli olmayan siteye devam et" ile devam edebilirsiniz

Kendi IP adresiniz için sertifika oluşturmak:
```bash
SSL_CN=192.168.1.105 docker-compose up -d
```

### Environment Variables

`.env` dosyası oluşturarak yapılandırma yapabilirsiniz:
```bash
SSL_CN=192.168.1.105
REACT_APP_API_URL=https://192.168.1.105/api
```

## API Endpoints

### Clusters
- `GET /api/clusters` - Tüm cluster'ları listele
- `POST /api/clusters` - Yeni cluster ekle
- `GET /api/clusters/:id` - Cluster detayı
- `DELETE /api/clusters/:id` - Cluster sil
- `GET /api/clusters/:id/health` - Cluster health check

### Roles
- `GET /api/roles/cluster/:id` - Cluster'daki roller

### Diff
- `GET /api/diff/roles?source=:sourceId&destination=:destinationId` - Role diff

## Kullanım

1. Frontend'e gidin: http://localhost:3000
2. "Add Cluster" butonuna tıklayarak yeni bir Keycloak cluster'ı ekleyin
3. Cluster detay sayfasından rollerini görüntüleyin
4. "Role Diff" sayfasından iki cluster arasındaki farkları karşılaştırın

## Değişiklik Günlüğü

[CHANGELOG.md](./CHANGELOG.md)

## Notlar

- MVP versiyonunda sync, client yönetimi, realm işlemleri gibi gelişmiş modüller bulunmamaktadır
- Sadece cluster registry + role fetch + role diff fonksiyonları mevcuttur
- Backend, Keycloak Admin REST API kullanarak token alıp roller endpoint'ini okur
- Production ortamında gerçek SSL sertifikası (Let's Encrypt vb.) kullanmanız önerilir

