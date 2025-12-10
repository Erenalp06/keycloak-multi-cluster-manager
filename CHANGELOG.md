# Değişiklik Günlüğü

Bu projede yapılan tüm önemli değişiklikler bu dosyada belgelenir.

Format [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) kurallarına dayalıdır.

## [Yayınlanmamış]

## [1.0.4.1] - 2025-01-XX

### Eklenenler
- Slide-over (yan panel) detay görünümü
- Users, Groups ve Clients için tablo formatında görünüm
- Client detaylarında secret görüntüleme (show/hide, copy)
- Client role oluşturma özelliği
- Slide-over component'leri (UserDetailSlideOver, GroupDetailSlideOver, ClientDetailSlideOver)

### Değişiklikler
- İç içe expandable yapı yerine slide-over kullanılıyor
- Liste görünümü yerine tablo formatı kullanılıyor
- ClusterManagementPanel component'i parçalara ayrıldı
- Component yapısı modülerleştirildi (UserTable, GroupTable, ClientTable)
- Client secret yükleme ve görüntüleme özelliği eklendi
- "Assign Role" yerine "Create Role" butonu eklendi (client roles için)

### Düzeltmeler
- Client secret alma sorunu (clientId'den UUID bulma)
- Export dialog açılmama sorunu
- Component yapısı optimize edildi

## [1.0.4] - 2025-01-XX

### Eklenenler
- LDAP/LDAPS authentication provider
- Active Directory (AD) desteği ile LDAP girişi
- Sertifika yönetimi: AD sunucusundan otomatik sertifika alma ve kaydetme
- Login ekranında authentication type seçimi (Local/LDAP)
- LDAP kullanıcıları için otomatik local user provisioning
- Settings sayfasında LDAP yapılandırması ve sertifika yönetimi
- Radix UI Select component ile temaya uygun combobox

### Değişiklikler
- Login ekranında radio button yerine combobox kullanılıyor
- LDAP bağlantıları için sertifika trust store desteği
- Sertifikalar `/opt/mcm/certs/` klasörüne kaydediliyor

### Düzeltmeler
- LDAP kullanıcıları için role assignment sorunu
- Permission hataları (403 Forbidden)

## [1.0.3] - 2025-11-29

### Eklenenler
- Nginx reverse proxy ile HTTPS desteği
- Otomatik SSL sertifikası oluşturma (self-signed)
- Backend'e public `/health` ve `/` endpoint'leri
- Frontend API URL'i dinamik olarak window.location'dan alınması

### Değişiklikler
- Caddy reverse proxy → Nginx reverse proxy
- Frontend build sırasında API URL artık opsiyonel
- SSL sertifikası container başlatıldığında otomatik oluşturuluyor

### Düzeltmeler
- SSL sertifika hataları
- Network yapılandırması iyileştirildi
- Backend health check endpoint'i eklendi

## [1.0.0] - 2025-11-XX

### Eklenenler
- İlk MVP sürümü
- Cluster yönetimi
- Role yönetimi ve diff analizi
- Cluster registry + role fetch + role diff fonksiyonları
