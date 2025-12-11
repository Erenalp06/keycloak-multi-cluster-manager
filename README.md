# Keycloak Multi-Manage MVP

**Version: 1.0.4.2**

<img width="2554" height="1304" alt="image" src="https://github.com/user-attachments/assets/4ccd1955-00ca-4968-a08d-bb1c05ee4049" />

User Federation UI

<img width="1894" height="944" alt="image" src="https://github.com/user-attachments/assets/5db69a3b-bd6c-4da1-bb0b-fe456206add7" />

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

## Changelog

### Version 1.0.4.2 (2025-01-XX)

**Yeni Özellikler:**
- ✅ User Federation (LDAP/AD) provider yönetimi eklendi
- ✅ LDAP provider oluşturma, düzenleme, silme ve listeleme
- ✅ Test Connection ve Test Authentication özellikleri
- ✅ User Sync (full sync) özelliği
- ✅ Connection URL, Bind DN, Users DN için autocomplete önerileri
- ✅ Users tablosuna Origin sütunu eklendi (Federation/Local ayrımı)
- ✅ Discover Realms için Skip TLS Verification seçeneği

**Değişiklikler:**
- 🔄 searchScope değerleri Keycloak API formatına dönüştürülüyor ("1" = ONE_LEVEL, "2" = SUBTREE)
- 🔄 Realm UUID kullanımı (parentId için realm name yerine UUID)
- 🔄 Default değerler güncellendi (usernameLDAPAttribute, rdnLDAPAttribute: "cn", userObjectClasses: "person,organizationalPerson,user")
- 🔄 Control character temizleme (user input alanları için)
- 🔄 Retry mekanizması (provider oluşturma sonrası)
- 🔄 Detaylı request logging (masked credentials ile)

**Düzeltmeler:**
- 🐛 searchScope UI'da görünmeme sorunu düzeltildi (ONE_LEVEL/SUBTREE -> 1/2 dönüşümü)
- 🐛 Provider oluşturma sonrası görünmeme sorunu düzeltildi (realm UUID kullanımı)
- 🐛 Edit Mode mandatory hatası düzeltildi
- 🐛 Delete ve Sync işlemlerinde token alma sorunu düzeltildi (client credentials kullanımı)
- 🐛 Control character'ların Keycloak API'yi bozması sorunu düzeltildi

### Version 1.0.4.1 (2025-01-XX)

**Yeni Özellikler:**
- ✅ Slide-over (yan panel) detay görünümü eklendi
- ✅ Users, Groups ve Clients için tablo formatında görünüm
- ✅ Client detaylarında secret görüntüleme (show/hide, copy)
- ✅ Client role oluşturma özelliği
- ✅ Component yapısı modülerleştirildi (UserTable, GroupTable, ClientTable)
- ✅ Slide-over component'leri eklendi (UserDetailSlideOver, GroupDetailSlideOver, ClientDetailSlideOver)

**Değişiklikler:**
- 🔄 İç içe expandable yapı yerine slide-over kullanılıyor
- 🔄 Liste görünümü yerine tablo formatı kullanılıyor
- 🔄 ClusterManagementPanel component'i parçalara ayrıldı
- 🔄 Client secret yükleme ve görüntüleme özelliği eklendi
- 🔄 "Assign Role" yerine "Create Role" butonu eklendi (client roles için)

**Düzeltmeler:**
- 🐛 Client secret alma sorunu düzeltildi (clientId'den UUID bulma)
- 🐛 Export dialog açılmama sorunu düzeltildi
- 🐛 Component yapısı optimize edildi

### Version 1.0.4 (2025-01-XX)

**Yeni Özellikler:**
- ✅ LDAP/LDAPS authentication provider eklendi
- ✅ Active Directory (AD) desteği ile LDAP girişi
- ✅ Sertifika yönetimi: AD sunucusundan otomatik sertifika alma ve kaydetme
- ✅ Login ekranında authentication type seçimi (Local/LDAP)
- ✅ LDAP kullanıcıları için otomatik local user provisioning
- ✅ Settings sayfasında LDAP yapılandırması ve sertifika yönetimi
- ✅ Radix UI Select component ile temaya uygun combobox

**Değişiklikler:**
- 🔄 Login ekranında radio button yerine combobox kullanılıyor
- 🔄 LDAP bağlantıları için sertifika trust store desteği
- 🔄 Sertifikalar `/opt/mcm/certs/` klasörüne kaydediliyor

**Düzeltmeler:**
- 🐛 LDAP kullanıcıları için role assignment sorunu düzeltildi
- 🐛 Permission hataları düzeltildi (403 Forbidden)

### Version 1.0.3 (2025-11-29)

**Yeni Özellikler:**
- ✅ Nginx reverse proxy ile HTTPS desteği eklendi
- ✅ Otomatik SSL sertifikası oluşturma (self-signed)
- ✅ Backend'e public `/health` ve `/` endpoint'leri eklendi
- ✅ Frontend API URL'i dinamik olarak window.location'dan alınıyor
- ✅ Caddy yerine Nginx kullanılıyor (daha stabil)

**Değişiklikler:**
- 🔄 Caddy reverse proxy → Nginx reverse proxy
- 🔄 Frontend build sırasında API URL artık opsiyonel
- 🔄 SSL sertifikası container başlatıldığında otomatik oluşturuluyor

**Düzeltmeler:**
- 🐛 SSL sertifika hataları düzeltildi
- 🐛 Network yapılandırması iyileştirildi
- 🐛 Backend health check endpoint'i eklendi

### Version 1.0.0 MVP

- İlk MVP sürümü
- Cluster yönetimi
- Role yönetimi ve diff analizi

## Notlar

- MVP versiyonunda sync, client yönetimi, realm işlemleri gibi gelişmiş modüller bulunmamaktadır
- Sadece cluster registry + role fetch + role diff fonksiyonları mevcuttur
- Backend, Keycloak Admin REST API kullanarak token alıp roller endpoint'ini okur
- Production ortamında gerçek SSL sertifikası (Let's Encrypt vb.) kullanmanız önerilir

