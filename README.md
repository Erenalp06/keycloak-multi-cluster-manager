# Keycloak Multi-Manage MVP

Çoklu Keycloak ortamlarını (dev/test/prod) tek panelden yönetmek için bir MVP uygulaması.

## Özellikler

- **Cluster Yönetimi**: Keycloak cluster'larını ekleme, silme ve listeleme
- **Health Check**: Cluster'ların sağlık durumunu kontrol etme
- **Role Yönetimi**: Bir cluster'daki rollerin görüntülenmesi
- **Role Diff**: İki cluster arasındaki roller için fark analizi (kaynakta var, hedefte yok)

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
- PostgreSQL (port 5432)
- Backend API (port 8080)
- Frontend (port 3000)

### Servisler

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **PostgreSQL**: localhost:5432

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

## Notlar

- MVP versiyonunda sync, client yönetimi, realm işlemleri gibi gelişmiş modüller bulunmamaktadır
- Sadece cluster registry + role fetch + role diff fonksiyonları mevcuttur
- Backend, Keycloak Admin REST API kullanarak token alıp roller endpoint'ini okur

