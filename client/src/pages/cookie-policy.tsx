import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Cookie, Shield, Settings, Info, Globe, Lock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function CookiePolicy() {
  const lastUpdated = "24 de Janeiro de 2025";
  const [cookiePreferences, setCookiePreferences] = useState({
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem('cookiePreferences');
    if (saved) {
      setCookiePreferences(JSON.parse(saved));
    }
  }, []);

  const saveCookiePreferences = () => {
    localStorage.setItem('cookiePreferences', JSON.stringify(cookiePreferences));
    window.dispatchEvent(new Event('cookiePreferencesUpdated'));
    // Show success toast
    const event = new CustomEvent('toast', {
      detail: {
        title: "Preferências Guardadas",
        description: "As suas preferências de cookies foram atualizadas com sucesso.",
      }
    });
    window.dispatchEvent(event);
  };

  const cookieTypes = [
    {
      icon: Shield,
      name: "Cookies Necessários",
      key: "necessary",
      required: true,
      description: "Essenciais para o funcionamento do site. Não podem ser desativados.",
      examples: [
        "auth-token: Mantém a sua sessão autenticada",
        "refresh-token: Permite renovar a sessão automaticamente",
        "csrf-token: Protege contra ataques CSRF",
        "session-id: Identifica a sua sessão única"
      ],
      duration: "Sessão ou 30 dias (refresh token)"
    },
    {
      icon: Settings,
      name: "Cookies Funcionais",
      key: "functional",
      required: false,
      description: "Melhoram a experiência do utilizador guardando preferências.",
      examples: [
        "theme: Guarda preferência de tema (claro/escuro)",
        "language: Guarda o idioma preferido",
        "currency: Guarda a moeda selecionada",
        "layout-preferences: Guarda configurações de layout"
      ],
      duration: "1 ano"
    },
    {
      icon: Globe,
      name: "Cookies Analíticos",
      key: "analytics",
      required: false,
      description: "Ajudam-nos a entender como o site é utilizado.",
      examples: [
        "_ga: Google Analytics - identifica utilizadores únicos",
        "_gid: Google Analytics - distingue utilizadores",
        "_gat: Google Analytics - limita taxa de pedidos",
        "analytics-id: Tracking interno de uso"
      ],
      duration: "2 anos"
    },
    {
      icon: Info,
      name: "Cookies de Marketing",
      key: "marketing",
      required: false,
      description: "Usados para personalizar anúncios e medir eficácia de campanhas.",
      examples: [
        "fbp: Facebook Pixel",
        "ads-id: Google Ads tracking",
        "campaign-source: Origem da campanha",
        "referral-code: Código de referência"
      ],
      duration: "90 dias"
    }
  ];

  const sections = [
    {
      icon: Cookie,
      title: "1. O que são Cookies?",
      content: `
        <p>Cookies são pequenos ficheiros de texto que são colocados no seu dispositivo quando visita um website. São amplamente utilizados para fazer os websites funcionarem de forma mais eficiente e fornecer informações aos proprietários do site.</p>
        
        <p class="mt-3">Os cookies permitem que o site reconheça o seu dispositivo e lembre-se de informações sobre a sua visita, como as suas preferências e configurações.</p>
        
        <p class="mt-3">Utilizamos tanto cookies de sessão (que expiram quando fecha o navegador) como cookies persistentes (que permanecem no seu dispositivo até expirarem ou serem eliminados).</p>
      `
    },
    {
      icon: Info,
      title: "2. Como Utilizamos os Cookies",
      content: `
        <p>Utilizamos cookies para:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Autenticação:</strong> Manter a sua sessão iniciada de forma segura</li>
          <li><strong>Segurança:</strong> Proteger contra ataques e fraudes</li>
          <li><strong>Preferências:</strong> Lembrar as suas configurações e escolhas</li>
          <li><strong>Análise:</strong> Entender como utiliza a plataforma</li>
          <li><strong>Desempenho:</strong> Melhorar a velocidade e experiência</li>
          <li><strong>Marketing:</strong> Mostrar conteúdo relevante (se consentido)</li>
        </ul>
      `
    },
    {
      icon: Lock,
      title: "3. Cookies de Terceiros",
      content: `
        <p>Alguns dos nossos parceiros podem definir cookies no seu dispositivo:</p>
        
        <h4 class="font-semibold mb-2 mt-3">3.1 Parceiros de Análise:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li><strong>Google Analytics:</strong> Para análise de tráfego e comportamento</li>
          <li><strong>Hotjar:</strong> Para mapas de calor e gravações de sessão (anonimizadas)</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-3">3.2 Parceiros de Pagamento:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li><strong>Stripe:</strong> Para processamento seguro de pagamentos</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-3">3.3 Parceiros de Autenticação:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li><strong>Google OAuth:</strong> Para login com conta Google</li>
        </ul>

        <p class="mt-3">Estes parceiros têm as suas próprias políticas de privacidade e cookies.</p>
      `
    },
    {
      icon: Settings,
      title: "4. Gerir as Suas Preferências",
      content: `
        <p>Tem controlo total sobre os cookies que aceitamos (exceto os necessários):</p>
        
        <h4 class="font-semibold mb-2 mt-3">4.1 Através das Nossas Configurações:</h4>
        <p>Use o painel de preferências abaixo para ativar/desativar categorias de cookies.</p>

        <h4 class="font-semibold mb-2 mt-3">4.2 Através do Navegador:</h4>
        <p>Todos os navegadores modernos permitem:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Ver quais cookies estão armazenados</li>
          <li>Eliminar cookies individualmente ou todos</li>
          <li>Bloquear cookies de terceiros</li>
          <li>Bloquear todos os cookies</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-3">4.3 Instruções por Navegador:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li><a href="https://support.google.com/chrome/answer/95647" class="text-primary hover:underline" target="_blank">Chrome</a></li>
          <li><a href="https://support.mozilla.org/pt-PT/kb/cookies-informacao-websites-armazenam" class="text-primary hover:underline" target="_blank">Firefox</a></li>
          <li><a href="https://support.apple.com/pt-pt/guide/safari/sfri11471/mac" class="text-primary hover:underline" target="_blank">Safari</a></li>
          <li><a href="https://support.microsoft.com/pt-pt/microsoft-edge/eliminar-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" class="text-primary hover:underline" target="_blank">Edge</a></li>
        </ul>
      `
    },
    {
      icon: Info,
      title: "5. Impacto de Desativar Cookies",
      content: `
        <p>Desativar certos cookies pode afetar a sua experiência:</p>
        
        <h4 class="font-semibold mb-2 mt-3">Cookies Necessários (não podem ser desativados):</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Sem estes, não poderá fazer login ou usar funcionalidades básicas</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-3">Cookies Funcionais:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Terá de redefinir preferências em cada visita</li>
          <li>A experiência será menos personalizada</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-3">Cookies Analíticos:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Não poderemos melhorar o site com base no uso real</li>
          <li>Problemas podem não ser detetados rapidamente</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-3">Cookies de Marketing:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Verá anúncios menos relevantes</li>
          <li>Não poderemos medir a eficácia das campanhas</li>
        </ul>
      `
    },
    {
      icon: Shield,
      title: "6. Segurança dos Cookies",
      content: `
        <p>Implementamos várias medidas de segurança para proteger os cookies:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li><strong>HttpOnly:</strong> Cookies críticos não são acessíveis via JavaScript</li>
          <li><strong>Secure:</strong> Cookies só são transmitidos por HTTPS</li>
          <li><strong>SameSite:</strong> Proteção contra ataques CSRF</li>
          <li><strong>Encriptação:</strong> Dados sensíveis são encriptados</li>
          <li><strong>Expiração:</strong> Cookies expiram automaticamente</li>
        </ul>
      `
    },
    {
      icon: Globe,
      title: "7. Conformidade Legal",
      content: `
        <p>A nossa política de cookies está em conformidade com:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Regulamento Geral sobre a Proteção de Dados (RGPD)</li>
          <li>Diretiva ePrivacy da UE</li>
          <li>Lei de Proteção de Dados Pessoais de Portugal</li>
        </ul>
        
        <p class="mt-3">Obtemos o seu consentimento antes de definir cookies não essenciais e permitimos que retire o consentimento a qualquer momento.</p>
      `
    },
    {
      icon: Info,
      title: "8. Alterações a Esta Política",
      content: `
        <p>Podemos atualizar esta Política de Cookies periodicamente para refletir:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Mudanças nos cookies que utilizamos</li>
          <li>Novos requisitos legais</li>
          <li>Melhorias na transparência</li>
        </ul>
        
        <p class="mt-3">Notificaremos sobre alterações significativas através de um aviso no site.</p>
      `
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Política de Cookies</h1>
              <p className="text-muted-foreground">
                Última atualização: {lastUpdated}
              </p>
            </div>

            {/* Cookie Preferences Panel */}
            <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Gerir Preferências de Cookies
              </h2>
              
              <div className="space-y-4">
                {cookieTypes.map((type) => (
                  <div key={type.key} className="flex items-start justify-between p-4 bg-background rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <type.icon className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{type.name}</h3>
                        {type.required && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            Obrigatório
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          Ver detalhes
                        </summary>
                        <div className="mt-2 space-y-1">
                          <p><strong>Exemplos:</strong></p>
                          <ul className="list-disc pl-5">
                            {type.examples.map((example, i) => (
                              <li key={i}>{example}</li>
                            ))}
                          </ul>
                          <p className="mt-2"><strong>Duração:</strong> {type.duration}</p>
                        </div>
                      </details>
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => {
                          if (!type.required) {
                            setCookiePreferences(prev => ({
                              ...prev,
                              [type.key]: !prev[type.key as keyof typeof prev]
                            }));
                          }
                        }}
                        disabled={type.required}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          ${type.required ? 'cursor-not-allowed' : 'cursor-pointer'}
                          ${cookiePreferences[type.key as keyof typeof cookiePreferences] 
                            ? 'bg-primary' 
                            : 'bg-muted'
                          }
                        `}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${cookiePreferences[type.key as keyof typeof cookiePreferences] 
                              ? 'translate-x-6' 
                              : 'translate-x-1'
                            }
                          `}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCookiePreferences({
                      necessary: true,
                      functional: false,
                      analytics: false,
                      marketing: false
                    });
                  }}
                >
                  Rejeitar Todos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCookiePreferences({
                      necessary: true,
                      functional: true,
                      analytics: true,
                      marketing: true
                    });
                  }}
                >
                  Aceitar Todos
                </Button>
                <Button onClick={saveCookiePreferences}>
                  Guardar Preferências
                </Button>
              </div>
            </Card>

            {/* Policy Content */}
            <div className="space-y-6">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start gap-3">
                      <section.icon className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Contact Section */}
            <Card className="p-6 mt-8">
              <h2 className="text-xl font-semibold mb-3">9. Contacto</h2>
              <p className="text-muted-foreground">
                Se tiver questões sobre a nossa utilização de cookies:
              </p>
              <div className="mt-3 space-y-2 text-muted-foreground">
                <p><strong>Email:</strong> privacy@alfalyzer.com</p>
                <p><strong>Responsável pela Proteção de Dados:</strong> dpo@alfalyzer.com</p>
              </div>
            </Card>

            <Card className="p-6 mt-6 bg-muted/50">
              <p className="text-sm text-center text-muted-foreground">
                Esta Política de Cookies faz parte da nossa Política de Privacidade.
                Ao utilizar a Alfalyzer, concorda com o uso de cookies de acordo com esta política.
              </p>
            </Card>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}