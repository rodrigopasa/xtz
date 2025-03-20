import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
  children?: React.ReactNode;
}

export default function SEOHead({ title, description, image, noIndex, canonicalUrl, children }: SEOProps) {
  // Obter configurações do site
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('GET', '/api/settings')
  });

  // Atualizar favicon dinamicamente
  useEffect(() => {
    if (settings?.faviconUrl) {
      const faviconEl = document.getElementById('dynamic-favicon') as HTMLLinkElement;
      if (faviconEl) {
        faviconEl.href = settings.faviconUrl;
      }
    }
  }, [settings?.faviconUrl]);

  // Atualizar os códigos personalizados
  useEffect(() => {
    // Injetar código no cabeçalho
    const headerEl = document.getElementById('header-custom-code');
    if (headerEl && settings?.headerCode) {
      headerEl.innerHTML = settings.headerCode;
    }

    // Injetar código no início do body
    const bodyStartEl = document.getElementById('body-start-custom-code');
    if (bodyStartEl && settings?.bodyStartCode) {
      bodyStartEl.innerHTML = settings.bodyStartCode;
    }

    // Injetar código no final do body
    const bodyEndEl = document.getElementById('body-end-custom-code');
    if (bodyEndEl && settings?.bodyEndCode) {
      bodyEndEl.innerHTML = settings.bodyEndCode;
    }

    // Google Analytics
    const gaScript = document.getElementById('google-analytics');
    if (gaScript && settings?.googleAnalyticsId) {
      gaScript.innerHTML = `
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
        ga('create', '${settings.googleAnalyticsId}', 'auto');
        ga('send', 'pageview');
      `;
    }

    // Google Tag Manager
    const gtmScript = document.getElementById('google-tag-manager');
    if (gtmScript && settings?.googleTagManagerId) {
      gtmScript.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${settings.googleTagManagerId}');
      `;
    }
  }, [
    settings?.headerCode,
    settings?.bodyStartCode,
    settings?.bodyEndCode,
    settings?.footerCode,
    settings?.googleAnalyticsId,
    settings?.googleTagManagerId
  ]);

  // Valores padrão
  const finalTitle = title || settings?.metaTitle || settings?.siteName || "Elexandria";
  const finalDescription = description || settings?.metaDescription || settings?.siteDescription || "Sua biblioteca digital";
  const finalImage = image || settings?.ogImage || "";
  const twitterHandle = settings?.twitterHandle || "";
  const siteUrl = settings?.siteUrl || "https://elexandria.app";

  return (
    <Helmet>
      {/* Título básico */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      
      {/* Palavras-chave */}
      {settings?.metaKeywords && (
        <meta name="keywords" content={settings.metaKeywords} />
      )}
      
      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      {finalImage && <meta property="og:image" content={finalImage} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={settings?.siteName || "Elexandria"} />
      
      {/* Canonical URL para evitar conteúdo duplicado */}
      {canonicalUrl && (
        <link rel="canonical" href={canonicalUrl.startsWith("http") ? canonicalUrl : `${siteUrl}${canonicalUrl}`} />
      )}
      
      {/* NoIndex para páginas que não devem ser indexadas */}
      {noIndex && (
        <meta name="robots" content="noindex, nofollow" />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {finalImage && <meta name="twitter:image" content={finalImage} />}
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      
      {/* Conteúdo extra */}
      {children}
    </Helmet>
  );
}