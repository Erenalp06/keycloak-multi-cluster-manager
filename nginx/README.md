# Nginx Reverse Proxy

Bu dizin Nginx reverse proxy konfigürasyonunu içerir.

## SSL Sertifikası

SSL sertifikası otomatik olarak oluşturulur. İlk çalıştırmada entrypoint script'i self-signed bir sertifika oluşturur.

## Yapılandırma

`docker-compose.yml` dosyasında `SSL_CN` environment variable'ını kendi IP adresinize veya domain adınıza göre ayarlayın:

```yaml
environment:
  - SSL_CN=192.168.1.105  # Kendi IP adresinizi buraya yazın
```

Veya domain kullanıyorsanız:

```yaml
environment:
  - SSL_CN=example.com
```

## Notlar

- Self-signed sertifika kullanıldığı için tarayıcıda güvenlik uyarısı görünecektir
- Production ortamında gerçek bir SSL sertifikası kullanmanız önerilir
- Sertifika volume'da saklanır, container yeniden başlatıldığında korunur

