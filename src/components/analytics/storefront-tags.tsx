import Script from "next/script";
import { CLARITY_SCRIPT_URL, GA4_SCRIPT_URL, META_PIXEL_SCRIPT_URL } from "@/lib/constants";
import { getStorefrontIntegrations } from "@/services/integration.service";

const GA4_SETUP = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`;

function claritySetup(projectId: string): string {
  return `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src=${JSON.stringify(CLARITY_SCRIPT_URL)}+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(projectId)});`;
}

function metaPixelSetup(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
${JSON.stringify(META_PIXEL_SCRIPT_URL)});
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');`;
}

export async function StorefrontTags() {
  const { ga4, clarity, metaPixel } = await getStorefrontIntegrations();

  return (
    <>
      {ga4 && (
        <>
          <Script src={`${GA4_SCRIPT_URL}?${new URLSearchParams({ id: ga4 })}`} strategy="afterInteractive" />
          <Script id="ga4-setup" strategy="afterInteractive">
            {GA4_SETUP}
          </Script>
        </>
      )}
      {clarity && (
        <Script id="clarity-setup" strategy="afterInteractive">
          {claritySetup(clarity)}
        </Script>
      )}
      {metaPixel && (
        <Script id="meta-pixel-setup" strategy="afterInteractive">
          {metaPixelSetup(metaPixel)}
        </Script>
      )}
    </>
  );
}
