import { AlertCircle, RefreshCw, ArrowLeft, WifiOff, ServerOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ClusterErrorStateProps {
  clusterName?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function ClusterErrorState({
  clusterName,
  errorMessage,
  onRetry,
  onBack,
  showBackButton = false,
}: ClusterErrorStateProps) {
  const getErrorType = () => {
    if (!errorMessage) return 'unknown';
    
    const msg = errorMessage.toLowerCase();
    if (msg.includes('connection refused') || msg.includes('connect') || msg.includes('timeout')) {
      return 'connection';
    }
    if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
      return 'auth';
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return 'notfound';
    }
    return 'unknown';
  };

  const errorType = getErrorType();

  const getErrorDetails = () => {
    switch (errorType) {
      case 'connection':
        return {
          icon: WifiOff,
          title: 'Cluster\'a Bağlanılamıyor',
          description: 'Keycloak cluster\'ına bağlantı kurulamadı. Lütfen aşağıdaki kontrolleri yapın:',
          suggestions: [
            'Cluster URL\'sinin doğru olduğundan emin olun',
            'Keycloak servisinin çalıştığından emin olun',
            'Ağ bağlantınızı kontrol edin',
            'Firewall ayarlarınızı kontrol edin',
          ],
        };
      case 'auth':
        return {
          icon: Shield,
          title: 'Kimlik Doğrulama Hatası',
          description: 'Cluster\'a bağlanırken kimlik doğrulama hatası oluştu:',
          suggestions: [
            'Kullanıcı adı ve şifrenin doğru olduğundan emin olun',
            'Kullanıcının gerekli yetkilere sahip olduğunu kontrol edin',
            'Realm adının doğru olduğundan emin olun',
          ],
        };
      case 'notfound':
        return {
          icon: ServerOff,
          title: 'Cluster Bulunamadı',
          description: 'Belirtilen cluster bulunamadı veya erişilemiyor:',
          suggestions: [
            'Cluster ID\'sinin doğru olduğundan emin olun',
            'Cluster\'ın silinmediğini kontrol edin',
          ],
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Bir Hata Oluştu',
          description: 'Cluster\'a erişirken beklenmeyen bir hata oluştu:',
          suggestions: [
            'Lütfen tekrar deneyin',
            'Sorun devam ederse sistem yöneticinize başvurun',
          ],
        };
    }
  };

  const errorDetails = getErrorDetails();
  const Icon = errorDetails.icon;

  return (
    <div className="p-6">
      <Card className="border border-red-200 shadow-sm max-w-2xl mx-auto">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Icon className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-red-900">
                {errorDetails.title}
              </CardTitle>
              {clusterName && (
                <CardDescription className="text-sm text-red-700 mt-1">
                  Cluster: <span className="font-medium">{clusterName}</span>
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-3">{errorDetails.description}</p>
              {errorMessage && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-mono text-gray-800 break-all">{errorMessage}</p>
                </div>
              )}
            </div>

            {errorDetails.suggestions && errorDetails.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Önerilen Çözümler:</h4>
                <ul className="space-y-2">
                  {errorDetails.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              {showBackButton && onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Geri Dön
                </Button>
              )}
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="flex-1 bg-[#4a5568] hover:bg-[#374151] text-white"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tekrar Dene
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

