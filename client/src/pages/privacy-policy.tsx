import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, Database, Users, Mail, Globe, AlertCircle } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "24 de Janeiro de 2025";

  const sections = [
    {
      icon: Shield,
      title: "1. Compromisso com a Privacidade",
      content: `A Alfalyzer está comprometida em proteger a privacidade dos seus utilizadores. Esta Política de Privacidade explica como recolhemos, utilizamos, divulgamos e protegemos as suas informações quando utiliza a nossa plataforma de análise financeira.`
    },
    {
      icon: Database,
      title: "2. Informações que Recolhemos",
      content: `
        <h4 class="font-semibold mb-2">2.1 Informações Fornecidas por Si:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Nome e endereço de email</li>
          <li>Informações de pagamento (processadas pela Stripe)</li>
          <li>Preferências de investimento e watchlists</li>
          <li>Dados de portfolio (opcional)</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-4">2.2 Informações Recolhidas Automaticamente:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Endereço IP e informações do dispositivo</li>
          <li>Dados de navegação e interação com a plataforma</li>
          <li>Cookies e tecnologias similares</li>
          <li>Logs de acesso e desempenho</li>
        </ul>

        <h4 class="font-semibold mb-2 mt-4">2.3 Informações de Terceiros:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Dados de mercado de APIs financeiras (FMP, Alpha Vantage)</li>
          <li>Informações de autenticação do Google OAuth</li>
        </ul>
      `
    },
    {
      icon: Eye,
      title: "3. Como Utilizamos as Suas Informações",
      content: `
        <p>Utilizamos as informações recolhidas para:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Fornecer e melhorar os nossos serviços</li>
          <li>Personalizar a sua experiência na plataforma</li>
          <li>Processar pagamentos e gerir subscrições</li>
          <li>Enviar notificações sobre alertas de preço</li>
          <li>Comunicar atualizações importantes do serviço</li>
          <li>Analisar o uso da plataforma para melhorias</li>
          <li>Cumprir obrigações legais e regulamentares</li>
          <li>Prevenir fraudes e atividades maliciosas</li>
        </ul>
      `
    },
    {
      icon: Users,
      title: "4. Partilha de Informações",
      content: `
        <p>Não vendemos as suas informações pessoais. Podemos partilhar dados apenas com:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Stripe:</strong> Para processamento seguro de pagamentos</li>
          <li><strong>Supabase:</strong> Para armazenamento seguro de dados</li>
          <li><strong>Google Analytics:</strong> Para análise de uso (anonimizado)</li>
          <li><strong>Autoridades:</strong> Quando exigido por lei</li>
        </ul>
        <p class="mt-3">Todos os parceiros são obrigados a proteger as suas informações e usá-las apenas para os fins especificados.</p>
      `
    },
    {
      icon: Lock,
      title: "5. Segurança dos Dados",
      content: `
        <p>Implementamos medidas de segurança técnicas e organizacionais para proteger as suas informações:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Encriptação SSL/TLS para todas as comunicações</li>
          <li>Autenticação segura com httpOnly cookies</li>
          <li>Armazenamento encriptado de dados sensíveis</li>
          <li>Acesso restrito aos dados pessoais</li>
          <li>Monitorização contínua de segurança</li>
          <li>Backups regulares e planos de recuperação</li>
        </ul>
      `
    },
    {
      icon: Globe,
      title: "6. Os Seus Direitos (RGPD)",
      content: `
        <p>Sob o Regulamento Geral sobre a Proteção de Dados (RGPD), tem direito a:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Acesso:</strong> Solicitar cópia dos seus dados pessoais</li>
          <li><strong>Retificação:</strong> Corrigir dados incorretos ou incompletos</li>
          <li><strong>Eliminação:</strong> Solicitar a eliminação dos seus dados</li>
          <li><strong>Portabilidade:</strong> Receber os seus dados em formato estruturado</li>
          <li><strong>Oposição:</strong> Opor-se ao processamento dos seus dados</li>
          <li><strong>Limitação:</strong> Restringir o processamento em certas circunstâncias</li>
        </ul>
        <p class="mt-3">Para exercer estes direitos, contacte-nos em privacy@alfalyzer.com</p>
      `
    },
    {
      icon: Mail,
      title: "7. Cookies e Tecnologias Similares",
      content: `
        <p>Utilizamos cookies para:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Manter a sua sessão autenticada</li>
          <li>Guardar as suas preferências</li>
          <li>Analisar o uso da plataforma</li>
          <li>Melhorar o desempenho</li>
        </ul>
        <p class="mt-3">Pode gerir as preferências de cookies nas definições do seu navegador. Note que desativar cookies pode afetar a funcionalidade da plataforma.</p>
      `
    },
    {
      icon: AlertCircle,
      title: "8. Retenção de Dados",
      content: `
        <p>Retemos as suas informações apenas pelo tempo necessário:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Dados da conta: Enquanto a conta estiver ativa</li>
          <li>Dados de transações: 5 anos (requisitos legais)</li>
          <li>Logs de segurança: 90 dias</li>
          <li>Dados de marketing: Até revogação do consentimento</li>
        </ul>
        <p class="mt-3">Após o período de retenção, os dados são eliminados ou anonimizados de forma segura.</p>
      `
    },
    {
      icon: Shield,
      title: "9. Proteção de Menores",
      content: `
        <p>A Alfalyzer não é destinada a menores de 18 anos. Não recolhemos intencionalmente informações de menores. Se tomarmos conhecimento de que recolhemos dados de um menor, eliminaremos essas informações imediatamente.</p>
      `
    },
    {
      icon: Globe,
      title: "10. Transferências Internacionais",
      content: `
        <p>Os seus dados podem ser transferidos e armazenados em servidores localizados fora do seu país de residência. Garantimos que todas as transferências cumprem os requisitos do RGPD, incluindo:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Cláusulas contratuais padrão aprovadas pela UE</li>
          <li>Certificações de privacidade adequadas</li>
          <li>Medidas de segurança apropriadas</li>
        </ul>
      `
    },
    {
      icon: Mail,
      title: "11. Alterações a Esta Política",
      content: `
        <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas através de:</p>
        <ul class="list-disc pl-6 space-y-1 mt-2">
          <li>Email para utilizadores registados</li>
          <li>Aviso na plataforma</li>
          <li>Atualização da data de "Última Atualização"</li>
        </ul>
        <p class="mt-3">O uso continuado após alterações constitui aceitação da política atualizada.</p>
      `
    },
    {
      icon: Mail,
      title: "12. Contacto",
      content: `
        <p>Para questões sobre esta Política de Privacidade ou sobre os seus dados pessoais:</p>
        <div class="mt-3 space-y-2">
          <p><strong>Email:</strong> privacy@alfalyzer.com</p>
          <p><strong>Responsável pela Proteção de Dados:</strong> dpo@alfalyzer.com</p>
          <p><strong>Morada:</strong> [A ser definida]</p>
        </div>
        <p class="mt-3">Responderemos a todas as solicitações dentro de 30 dias.</p>
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
              <h1 className="text-4xl font-bold mb-4">Política de Privacidade</h1>
              <p className="text-muted-foreground">
                Última atualização: {lastUpdated}
              </p>
            </div>

            <Card className="p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Resumo</h3>
                  <p className="text-muted-foreground">
                    Na Alfalyzer, levamos a sua privacidade a sério. Esta política explica como protegemos os seus dados pessoais
                    e garantimos o cumprimento do RGPD. Não vendemos os seus dados e utilizamos medidas de segurança 
                    robustas para proteger as suas informações.
                  </p>
                </div>
              </div>
            </Card>

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

            <Card className="p-6 mt-8 bg-muted/50">
              <p className="text-sm text-center text-muted-foreground">
                Esta Política de Privacidade é efetiva a partir de {lastUpdated}. 
                Ao utilizar a Alfalyzer, concorda com a recolha e uso de informações 
                de acordo com esta política.
              </p>
            </Card>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}